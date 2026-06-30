from pathlib import Path
import json

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
DATA = STATIC / "data"
IMGS = ROOT / "imgs"


class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


app = FastAPI(title="NC City + County Trainer")
app.mount("/static", NoCacheStaticFiles(directory=STATIC), name="static")
if IMGS.exists():
    app.mount("/imgs", NoCacheStaticFiles(directory=IMGS), name="imgs")


def load_json(name: str):
    path = DATA / name
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Missing {name}. Run: python scripts/build_data.py"
        )
    return json.loads(path.read_text(encoding="utf-8"))


def load_optional_json(name: str, fallback):
    path = DATA / name
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def asset_url(name: str) -> str:
    path = STATIC / name
    version = int(path.stat().st_mtime) if path.exists() else 0
    return f"/static/{name}?v={version}"


@app.get("/")
def index():
    html = (STATIC / "index.html").read_text(encoding="utf-8")
    html = html.replace("/static/styles.css", asset_url("styles.css"))
    html = html.replace("/static/app.js", asset_url("app.js"))
    return HTMLResponse(
        html,
        headers={
            "Cache-Control": "no-store, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.get("/api/bootstrap")
def bootstrap():
    """Single payload so the frontend only does one app-data request."""
    return JSONResponse({
        "cities": load_json("cities.json"),
        "city_outlines": load_optional_json("city_outlines.geojson", {"type": "FeatureCollection", "features": []}),
        "counties": load_json("counties.geojson"),
        "highways": load_json("highways.geojson"),
        "metadata": load_json("metadata.json"),
    })


@app.get("/api/water")
def water():
    return JSONResponse(load_optional_json("water.geojson", {"type": "FeatureCollection", "features": []}))


@app.get("/api/health")
def health():
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
