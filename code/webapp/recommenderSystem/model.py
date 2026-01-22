import re
from dataclasses import dataclass
from typing import Any, Dict, Optional, Sequence

import numpy as np
import pandas as pd


# ---- Feature keys (match your dataframe columns) ----
# df columns: intervention_name, city, country, begin_year, end_year, status, spatial_scale, nbs_area,
# previous_area_type, total_cost, sources_of_funding, ...
FEATURE_CHOICES = [
    {"key": "country", "label": "Country", "type": "categorical"},
    {"key": "status", "label": "Status (present stage)", "type": "categorical"},
    {"key": "duration", "label": "Duration (end_year - begin_year)", "type": "numeric"},
    {"key": "nbs_area", "label": "NbS Area (m²)", "type": "numeric"},
    {"key": "previous_area_type", "label": "Area Before Intervention", "type": "categorical"},
    {"key": "total_cost", "label": "Total Cost", "type": "numeric"},
    {"key": "sources_of_funding", "label": "Sources of Funding", "type": "multitag"},
]

# For interactive CLI use (optional)
COLUMN_CHOICES = [f["label"] for f in FEATURE_CHOICES]
LABEL_TO_KEY = {f["label"]: f["key"] for f in FEATURE_CHOICES}


def choose_columns_and_k_interactively() -> tuple[list[str], int]:
    """
    Optional CLI helper:
    Asks 2 things:
      1) Which features to include (from COLUMN_CHOICES)
      2) How many returned items (3..10)
    Returns: (selected_feature_keys, k)
    """
    print("\nAvailable features:\n")
    for i, f in enumerate(FEATURE_CHOICES, start=1):
        print(f"{i}. {f['label']}  (key: {f['key']})")

    raw_cols = input(
        "\n(1/2) Which features to include?\n"
        "Enter comma-separated indices (e.g., 1,3,7) OR exact labels separated by commas:\n> "
    ).strip()

    selected_keys: list[str] = []
    if raw_cols:
        parts = [p.strip() for p in raw_cols.split(",") if p.strip()]
        if parts and all(p.isdigit() for p in parts):
            for p in parts:
                idx = int(p)
                if 1 <= idx <= len(FEATURE_CHOICES):
                    selected_keys.append(FEATURE_CHOICES[idx - 1]["key"])
        else:
            for p in parts:
                if p in LABEL_TO_KEY:
                    selected_keys.append(LABEL_TO_KEY[p])

    if not selected_keys:
        selected_keys = [f["key"] for f in FEATURE_CHOICES]

    raw_k = input("\n(2/2) How many items to return? (3–10)\n> ").strip()
    try:
        k = int(raw_k)
    except Exception:
        k = 5
    k = max(3, min(10, k))

    return selected_keys, k


def _split_multivalue(text: Any) -> list[str]:
    """Split multi-valued fields (funding) into tags."""
    if text is None or (isinstance(text, float) and np.isnan(text)):
        return []
    s = str(text).strip()
    if not s or s.lower() == "unknown":
        return []
    parts = re.split(r"[\n;,]+", s)
    return [p.strip() for p in parts if p.strip()]


@dataclass
class _Scaler:
    means: Dict[str, float]
    stds: Dict[str, float]
    use_log1p: set

    def transform(self, df: pd.DataFrame, numeric_cols: list[str]) -> np.ndarray:
        arrs = []
        for c in numeric_cols:
            x = df[c].astype(float).to_numpy()
            if c in self.use_log1p:
                x = np.log1p(np.clip(x, a_min=0, a_max=None))
            m = self.means[c]
            s = self.stds[c] if self.stds[c] != 0 else 1.0
            arrs.append(((x - m) / s).reshape(-1, 1))
        return np.hstack(arrs) if arrs else np.zeros((len(df), 0), dtype=float)

    def transform_user(self, user_vals: Dict[str, Any], numeric_cols: list[str]) -> np.ndarray:
        vals = []
        for c in numeric_cols:
            v = user_vals.get(c, None)
            if v is None or v == "":
                vals.append(0.0)
                continue
            v = float(v)
            if c in self.use_log1p:
                v = np.log1p(max(0.0, v))
            m = self.means[c]
            s = self.stds[c] if self.stds[c] != 0 else 1.0
            vals.append((v - m) / s)
        return np.array(vals, dtype=float)


class SimpleNBSRecommender:
    """
    Recommender with:
      - one-hot for categoricals
      - multi-hot for funding tags
      - scaled numerics (log1p for big ranges)
      - cosine similarity to a user's preference vector
    """

    def __init__(self):
        self.selected_features: list[str] = []
        self.numeric_cols: list[str] = []
        self.categorical_cols: list[str] = []
        self.use_funding: bool = False

        self._df: Optional[pd.DataFrame] = None
        self._X: Optional[np.ndarray] = None

        self._cat_levels: Dict[str, list[str]] = {}
        self._funding_vocab: list[str] = []
        self._scaler: Optional[_Scaler] = None

    def fit(self, df: pd.DataFrame, selected_features: Sequence[str]) -> "SimpleNBSRecommender":
        self.selected_features = list(selected_features)

        work = df.copy()

        # Ensure required base columns exist if duration is used
        if "duration" in self.selected_features:
            b = pd.to_numeric(work.get("begin_year"), errors="coerce")
            e = pd.to_numeric(work.get("end_year"), errors="coerce")
            work["duration"] = (e - b).astype(float)

        # define feature types
        self.numeric_cols = [c for c in self.selected_features if c in ["nbs_area", "total_cost", "duration"]]
        self.categorical_cols = [c for c in self.selected_features if c in ["country", "status", "previous_area_type"]]
        self.use_funding = "sources_of_funding" in self.selected_features

        # fill missing categoricals
        for c in self.categorical_cols:
            if c not in work.columns:
                raise KeyError(f"Missing column in df: {c}")
            work[c] = work[c].fillna("Unknown").astype(str)

        # numeric cleaning
        for c in self.numeric_cols:
            if c not in work.columns:
                raise KeyError(f"Missing column in df: {c}")
            work[c] = pd.to_numeric(work[c], errors="coerce")
            med = float(work[c].median()) if work[c].notna().any() else 0.0
            work[c] = work[c].fillna(med)

        # funding tags
        funding_tags = None
        if self.use_funding:
            if "sources_of_funding" not in work.columns:
                raise KeyError("Missing column in df: sources_of_funding")
            funding_tags = work["sources_of_funding"].apply(_split_multivalue)
            self._funding_vocab = sorted({t for tags in funding_tags for t in tags})

        # scaler for numeric
        means, stds = {}, {}
        use_log1p = set()
        for c in self.numeric_cols:
            x = work[c].astype(float).to_numpy()
            if c in ["total_cost", "nbs_area"]:
                use_log1p.add(c)
                x = np.log1p(np.clip(x, a_min=0, a_max=None))
            means[c] = float(np.mean(x)) if len(x) else 0.0
            stds[c] = float(np.std(x)) if len(x) else 1.0
        self._scaler = _Scaler(means=means, stds=stds, use_log1p=use_log1p)

        X_num = self._scaler.transform(work, self.numeric_cols)

        # categorical one-hot
        cat_blocks = []
        for c in self.categorical_cols:
            levels = sorted(work[c].astype(str).unique().tolist())
            self._cat_levels[c] = levels

            col_vals = work[c].astype(str).to_numpy()
            block = np.zeros((len(work), len(levels)), dtype=float)
            idx = {lvl: j for j, lvl in enumerate(levels)}
            for i, v in enumerate(col_vals):
                j = idx.get(v)
                if j is not None:
                    block[i, j] = 1.0
            cat_blocks.append(block)
        X_cat = np.hstack(cat_blocks) if cat_blocks else np.zeros((len(work), 0), dtype=float)

        # funding multi-hot
        if self.use_funding:
            vocab_index = {t: i for i, t in enumerate(self._funding_vocab)}
            X_fund = np.zeros((len(work), len(self._funding_vocab)), dtype=float)
            for i, tags in enumerate(funding_tags):
                for t in tags:
                    j = vocab_index.get(t)
                    if j is not None:
                        X_fund[i, j] = 1.0
        else:
            X_fund = np.zeros((len(work), 0), dtype=float)

        self._X = np.hstack([X_num, X_cat, X_fund]).astype(float)
        self._df = work
        return self

    def _make_user_vector(self, preferences: Dict[str, Any]) -> np.ndarray:
        u_num = self._scaler.transform_user(preferences, self.numeric_cols) if self.numeric_cols else np.zeros((0,), dtype=float)

        # categoricals
        u_cat_parts = []
        for c in self.categorical_cols:
            levels = self._cat_levels.get(c, [])
            vec = np.zeros((len(levels),), dtype=float)
            v = preferences.get(c, None)
            if v is not None and v != "":
                v = str(v)
                if v in levels:
                    vec[levels.index(v)] = 1.0
            u_cat_parts.append(vec)
        u_cat = np.concatenate(u_cat_parts) if u_cat_parts else np.zeros((0,), dtype=float)

        # funding
        if self.use_funding:
            vec = np.zeros((len(self._funding_vocab),), dtype=float)
            user_f = preferences.get("sources_of_funding", [])
            if isinstance(user_f, str):
                user_tags = _split_multivalue(user_f)
            elif isinstance(user_f, (list, tuple, set)):
                user_tags = [str(x).strip() for x in user_f if str(x).strip()]
            else:
                user_tags = []
            vocab_index = {t: i for i, t in enumerate(self._funding_vocab)}
            for t in user_tags:
                j = vocab_index.get(t)
                if j is not None:
                    vec[j] = 1.0
            u_fund = vec
        else:
            u_fund = np.zeros((0,), dtype=float)

        return np.concatenate([u_num, u_cat, u_fund]).astype(float)

    @staticmethod
    def _cosine_sim_matrix(X: np.ndarray, u: np.ndarray) -> np.ndarray:
        u_norm = np.linalg.norm(u) or 1.0
        X_norm = np.linalg.norm(X, axis=1)
        X_norm[X_norm == 0] = 1.0
        return (X @ u) / (X_norm * u_norm)

    def recommend(self, preferences: Dict[str, Any], n_results: int = 5) -> pd.DataFrame:
        if self._df is None or self._X is None:
            raise RuntimeError("Call .fit(df, selected_features) before .recommend().")

        n = max(3, min(10, int(n_results)))

        u = self._make_user_vector(preferences)
        sims = self._cosine_sim_matrix(self._X, u)

        out = self._df.copy()
        out["similarity"] = sims
        out = out.sort_values("similarity", ascending=False).head(n)

        preferred_first = [
            "intervention_name",
            "city",
            "country",
            "status",
            "begin_year",
            "end_year",
            "duration",
            "nbs_area",
            "total_cost",
            "sources_of_funding",
            "link",
            "similarity",
        ]
        cols = [c for c in preferred_first if c in out.columns] + [c for c in out.columns if c not in preferred_first]
        return out[cols]
