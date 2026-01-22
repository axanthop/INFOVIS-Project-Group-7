from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .model import SimpleNBSRecommender, _split_multivalue


# ====== PATHS ======
BASE_DIR = Path(__file__).resolve().parents[1]  # project root
DATA_PATH = BASE_DIR / "project" / "assets" / "data" / "cleaned.csv"  # <-- your path
# ===================


# IMPORTANT: app must exist at top-level for uvicorn to find it
app = FastAPI(title="NBS Recommender API")


# CORS (safe for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serve frontend static files
# Your index.html references ./assets/... so we serve that:
ASSETS_DIR = BASE_DIR / "project" / "assets"
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


# If your assets are actually in project/assets, also serve that (optional but helpful):
if (BASE_DIR / "project" / "assets").exists():
    app.mount("/project/assets", StaticFiles(directory=BASE_DIR / "project" / "assets"), name="project_assets")


def load_df() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"CSV not found at: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    return df


# Load once at startup
DF = load_df()


@app.get("/")
def home():
    # index.html should be in BASE_DIR (project root)
    return FileResponse(BASE_DIR / "project/index.html")


@app.get("/api/rs-meta")
def rs_meta():
    df = DF.copy()

    # duration
    b = pd.to_numeric(df.get("begin_year"), errors="coerce")
    e = pd.to_numeric(df.get("end_year"), errors="coerce")
    duration = (e - b).astype(float)

    def safe_minmax(series):
        s = pd.to_numeric(series, errors="coerce")
        s = s.replace([np.inf, -np.inf], np.nan).dropna()
        if s.empty:
            return {"min": 0, "max": 0}
        return {"min": float(s.min()), "max": float(s.max())}

    # funding tags
    funding_tags = df.get("sources_of_funding", pd.Series([], dtype=str)).apply(_split_multivalue)
    funding_vocab = sorted({t for tags in funding_tags for t in tags})

    payload = {
        "categorical": {
            "country": sorted(df["country"].dropna().astype(str).unique().tolist()) if "country" in df.columns else [],
            "status": sorted(df["status"].dropna().astype(str).unique().tolist()) if "status" in df.columns else [],
            "previous_area_type": sorted(df["previous_area_type"].dropna().astype(str).unique().tolist()) if "previous_area_type" in df.columns else [],
        },
        "numeric_ranges": {
            "duration": safe_minmax(duration),
            "nbs_area": safe_minmax(df.get("nbs_area")),
            "total_cost": safe_minmax(df.get("total_cost")),
        },
        "funding_tags": funding_vocab,
    }
    return JSONResponse(payload)


@app.post("/api/recommend")
async def recommend(payload: Dict[str, Any]):
    selected_features: List[str] = payload.get("selected_features", [])
    preferences: Dict[str, Any] = payload.get("preferences", {})
    k = int(payload.get("k", 5))

    rs = SimpleNBSRecommender().fit(DF, selected_features)
    result_df = rs.recommend(preferences, n_results=k)
    result_df = result_df.drop(columns=["similarity"], errors="ignore")

    return JSONResponse(result_df.to_dict(orient="records"))
