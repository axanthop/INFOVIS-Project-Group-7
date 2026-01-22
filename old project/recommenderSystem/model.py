import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Union, Any
import numpy as np
import pandas as pd


# ---- Copy/paste column choices----
COLUMN_CHOICES = [
    "Country",
    "Present stage of the intervention",
    "NBS area (m2)",
    "Type of area before implementation of the NBS",
    "Total cost €",
    "Source(s) of funding",
    # Derived feature (not a real column in the CSV/DF):
    "Duration (End - Begin)",
]


def choose_columns_and_k_interactively() -> tuple[list[str], int]:
    """
    Asks exactly 2 things:
      1) Which columns to include (from COLUMN_CHOICES)
      2) How many returned items (max 5)
    Returns: (selected_columns, k)
    """
    print("\nAvailable columns you can include (copy/paste names or choose by index):\n")
    for i, col in enumerate(COLUMN_CHOICES, start=1):
        print(f"{i}. {col}")

    raw_cols = input(
        "\n(1/2) Which columns to include?\n"
        "Enter comma-separated indices (e.g., 1,3,7) OR exact names separated by commas:\n> "
    ).strip()

    # parse selection
    selected: list[str] = []
    if raw_cols:
        parts = [p.strip() for p in raw_cols.split(",") if p.strip()]
        # if all parts are digits -> treat as indices
        if parts and all(p.isdigit() for p in parts):
            idxs = [int(p) for p in parts]
            for idx in idxs:
                if 1 <= idx <= len(COLUMN_CHOICES):
                    selected.append(COLUMN_CHOICES[idx - 1])
        else:
            # treat as names
            name_set = {c.lower(): c for c in COLUMN_CHOICES}
            for p in parts:
                key = p.lower()
                if key in name_set:
                    selected.append(name_set[key])

    # fallback: if user gives nothing or invalid, use all
    if not selected:
        selected = COLUMN_CHOICES.copy()

    raw_k = input("\n(2/2) How many items to return? (1–5)\n> ").strip()
    try:
        k = int(raw_k)
    except Exception:
        k = 5
    k = max(1, min(5, k))

    return selected, k


def _split_multivalue(text: Any) -> list[str]:
    """Split funding-like cells into tags (handles newlines, semicolons, commas)."""
    if text is None or (isinstance(text, float) and np.isnan(text)):
        return []
    s = str(text).strip()
    if not s or s.lower() == "unknown":
        return []
    parts = re.split(r"[\n;,]+", s)
    tags = [p.strip() for p in parts if p.strip()]
    return tags


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
                # missing => mean => 0 after scaling
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
    simple recommender:
      - One-hot for categoricals
      - Multi-hot for funding (multi-value text)
      - Scaled numerics (+ optional log1p for big ranges)
      - Cosine similarity to a user's "ideal vector"
    Fit once on a DataFrame, then call recommend(...) with a preferences dict.
    """

    def __init__(self):
        self.selected_cols: list[str] = []
        self.numeric_cols: list[str] = []
        self.categorical_cols: list[str] = []
        self.use_funding: bool = False

        self._df: Optional[pd.DataFrame] = None
        self._X: Optional[np.ndarray] = None

        self._cat_levels: Dict[str, list[str]] = {}
        self._funding_vocab: list[str] = []
        self._scaler: Optional[_Scaler] = None

        self._feature_names: list[str] = []  # optional (for debugging / explanations)

    def fit(self, df: pd.DataFrame, selected_cols: Sequence[str]) -> "SimpleNBSRecommender":
        self.selected_cols = list(selected_cols)
        self._df = df.copy()

        # ---- build working DF with only what we need ----
        work = df.copy()

        # Derived duration
        if "Duration (End - Begin)" in self.selected_cols:
            # Safely compute even if Begin/End have missing
            b = pd.to_numeric(work.get("Begin"), errors="coerce")
            e = pd.to_numeric(work.get("End"), errors="coerce")
            work["Duration (End - Begin)"] = (e - b).astype(float)

        # Identify types
        self.numeric_cols = [c for c in self.selected_cols if c in ["NBS area (m2)", "Total cost €", "Duration (End - Begin)"]]
        self.categorical_cols = [
            c for c in self.selected_cols
            if c in ["Country", "Present stage of the intervention", "Type of area before implementation of the NBS"]
        ]
        self.use_funding = "Source(s) of funding" in self.selected_cols

        # Clean missing for categoricals
        for c in self.categorical_cols:
            work[c] = work[c].fillna("Unknown").astype(str)

        # Clean missing for numerics
        for c in self.numeric_cols:
            work[c] = pd.to_numeric(work[c], errors="coerce")
            med = float(work[c].median()) if work[c].notna().any() else 0.0
            work[c] = work[c].fillna(med)

        # Prepare funding tags
        funding_tags = None
        if self.use_funding:
            funding_tags = work["Source(s) of funding"].apply(_split_multivalue)
            # Build vocab
            vocab = sorted({t for tags in funding_tags for t in tags})
            self._funding_vocab = vocab

        # ---- build matrices: numeric + one-hot + multi-hot ----
        # numeric scaling params
        means, stds = {}, {}
        use_log1p = set()
        for c in self.numeric_cols:
            x = work[c].astype(float).to_numpy()
            # cost and area often have huge ranges -> log1p helps a lot (still simple)
            if c in ["Total cost €", "NBS area (m2)"]:
                use_log1p.add(c)
                x = np.log1p(np.clip(x, a_min=0, a_max=None))
            means[c] = float(np.mean(x)) if len(x) else 0.0
            stds[c] = float(np.std(x)) if len(x) else 1.0
        self._scaler = _Scaler(means=means, stds=stds, use_log1p=use_log1p)

        X_num = self._scaler.transform(work, self.numeric_cols)

        # categorical one-hot (manual to keep dependencies minimal)
        cat_blocks = []
        feature_names = []

        for c in self.categorical_cols:
            levels = sorted(work[c].fillna("Unknown").astype(str).unique().tolist())
            self._cat_levels[c] = levels
            # create block
            col_vals = work[c].astype(str).to_numpy()
            block = np.zeros((len(work), len(levels)), dtype=float)
            idx = {lvl: j for j, lvl in enumerate(levels)}
            for i, v in enumerate(col_vals):
                j = idx.get(v, None)
                if j is not None:
                    block[i, j] = 1.0
            cat_blocks.append(block)
            feature_names.extend([f"{c}={lvl}" for lvl in levels])

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
            feature_names.extend([f"Funding={t}" for t in self._funding_vocab])
        else:
            X_fund = np.zeros((len(work), 0), dtype=float)

        # combine
        self._X = np.hstack([X_num, X_cat, X_fund]).astype(float)

        # save feature names (optional)
        num_names = self.numeric_cols.copy()
        self._feature_names = num_names + feature_names

        # store cleaned DF for returning
        self._df = work

        return self

    def _make_user_vector(self, preferences: Dict[str, Any]) -> np.ndarray:
        """
        preferences keys should match chosen columns:
          - "Country": "Turkey"
          - "Present stage of the intervention": "Ongoing"
          - "Type of area before implementation of the NBS": "Agricultural area or farmland"
          - "Duration (End - Begin)": 5
          - "NBS area (m2)": 250000
          - "Total cost €": 1000000
          - "Source(s) of funding": ["Public local authority budget", "Multilateral fund"]
        """
        # numeric
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
            user_f = preferences.get("Source(s) of funding", [])
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

        u = np.concatenate([u_num, u_cat, u_fund]).astype(float)
        return u

    @staticmethod
    def _cosine_sim_matrix(X: np.ndarray, u: np.ndarray) -> np.ndarray:
        # cosine(X, u) = (X·u) / (||X|| * ||u||)
        u_norm = np.linalg.norm(u) or 1.0
        X_norm = np.linalg.norm(X, axis=1)
        X_norm[X_norm == 0] = 1.0
        return (X @ u) / (X_norm * u_norm)

    def recommend(
        self,
        preferences: Dict[str, Any],
        n_results: int = 5,
    ) -> pd.DataFrame:
        """
        Returns top matches with a similarity score column.
        n_results is capped at 5 as you requested.
        """
        if self._df is None or self._X is None:
            raise RuntimeError("Call .fit(df, selected_cols) before .recommend(...).")

        n = max(1, min(5, int(n_results)))

        u = self._make_user_vector(preferences)
        sims = self._cosine_sim_matrix(self._X, u)

        out = self._df.copy()
        out["similarity"] = sims
        out = out.sort_values("similarity", ascending=False).head(n)

        # Put the most human-readable columns first (if they exist)
        preferred_first = [
            "Name of the NBS intervention (short English title)",
            "City",
            "Country",
            "Present stage of the intervention",
            "Begin",
            "End",
            "Duration (End - Begin)",
            "NBS area (m2)",
            "Total cost €",
            "Source(s) of funding",
            "Link",
            "similarity",
        ]
        cols = [c for c in preferred_first if c in out.columns] + [c for c in out.columns if c not in preferred_first]
        return out[cols]
    
    
