from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .model import SimpleNBSRecommender, _split_multivalue

# ====== PATHS (updated for new structure) ======
BASE_DIR = Path(__file__).resolve().parents[1]  # repo root
WEBAPP_DIR = BASE_DIR / "webapp"
ASSETS_DIR = WEBAPP_DIR / "assets"
DATA_PATH = ASSETS_DIR / "data" / "cleaned.csv"
# ==============================================

app = FastAPI(title="NBS Recommender API")

# CORS (safe for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files:
# index.html references ./assets/... so we mount /assets -> webapp/assets
if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
else:
    print(f"[WARN] Assets folder not found at: {ASSETS_DIR}")

def load_df() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"CSV not found at: {DATA_PATH}\n"
            f"Expected it here: webapp/assets/data/cleaned.csv"
        )
    return pd.read_csv(DATA_PATH)

# Load once
DF = load_df()

@app.get("/")
def home():
    index_path = WEBAPP_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(404, f"index.html not found at: {index_path}")
    return FileResponse(index_path)

# Optional: serve other pages like /database.html if you add them
@app.get("/{page_name}.html")
def serve_page(page_name: str):
    p = WEBAPP_DIR / f"{page_name}.html"
    if not p.exists():
        raise HTTPException(404, f"Page not found: {p.name}")
    return FileResponse(p)

@app.get("/api/rs-meta")
def rs_meta():
    df = DF.copy()

    b = pd.to_numeric(df.get("begin_year"), errors="coerce")
    e = pd.to_numeric(df.get("end_year"), errors="coerce")
    duration = (e - b).astype(float)

    def safe_minmax(series):
        s = pd.to_numeric(series, errors="coerce")
        s = s.replace([np.inf, -np.inf], np.nan).dropna()
        if s.empty:
            return {"min": 0, "max": 0}
        return {"min": float(s.min()), "max": float(s.max())}

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

    return JSONResponse(result_df.to_dict(orient="records"))
