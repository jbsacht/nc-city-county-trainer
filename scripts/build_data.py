"""
Build local data files for the NC City + County Trainer.

Run from the project root:
    python scripts/build_data.py

It downloads once, writes static/data/*.json, and the web app then works
without calling APIs while you practice.
"""
from __future__ import annotations

import json
import os
import re
from io import StringIO
import time
import unicodedata
import zipfile
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd
import requests
from bs4 import BeautifulSoup
from rapidfuzz import process, fuzz
from shapely.geometry import Point
from shapely.ops import linemerge, unary_union

ROOT = Path(__file__).resolve().parents[1]
STATIC_DATA = ROOT / "static" / "data"
CACHE = ROOT / ".cache"
STATIC_DATA.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)

WIKI_MUNICIPALITIES = "https://en.wikipedia.org/wiki/List_of_municipalities_in_North_Carolina"
WIKI_COUNTIES = "https://en.wikipedia.org/wiki/List_of_counties_in_North_Carolina"
# Census has state-specific place files, but county files are national at
# recent GENZ endpoints. Keep candidates instead of one hard-coded URL so the
# builder survives Census year/path changes.
GENZ_YEARS = [2024, 2023, 2022, 2021, 2020]
TIGER_YEARS = [2024, 2023, 2022, 2021, 2020]
COUNTY_ZIP = "https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_500k.zip"
PLACE_ZIP = "https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_37_place_500k.zip"
PRIMARY_ROADS_ZIP = "https://www2.census.gov/geo/tiger/TIGER2024/PRIMARYROADS/tl_2024_us_primaryroads.zip"
CENSUS_2020_PLACES_API = "https://api.census.gov/data/2020/dec/pl"
CENSUS_2020_PL_ZIP = "https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/North_Carolina/nc2020.pl.zip"

HEADERS = {
    "User-Agent": "NC city county learning app builder (personal project; contact: local user)"
}


def get(url: str, **kwargs) -> requests.Response:
    kwargs.setdefault("headers", HEADERS)
    kwargs.setdefault("timeout", 90)
    r = requests.get(url, **kwargs)
    r.raise_for_status()
    return r


def download(url: str, filename: str) -> Path:
    path = CACHE / filename
    if path.exists() and path.stat().st_size > 0:
        print(f"Using cached {filename}")
        return path
    print(f"Downloading {filename}...")
    with get(url, stream=True) as r:
        with path.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
    return path


def download_first(candidates: list[tuple[str, str]], label: str) -> tuple[Path, str]:
    """Try URLs in order and return the first one that exists.

    Census file naming is mostly stable but not perfectly consistent across
    vintages. This prevents one moved/missing shapefile from killing the whole
    build.
    """
    last_error: Exception | None = None
    for url, filename in candidates:
        try:
            path = download(url, filename)
            return path, url
        except requests.HTTPError as e:
            status = e.response.status_code if e.response is not None else "?"
            print(f"  {label} candidate failed ({status}): {url}")
            # If a partial file ever got created, do not reuse it later.
            partial = CACHE / filename
            if partial.exists() and partial.stat().st_size == 0:
                partial.unlink(missing_ok=True)
            last_error = e
            continue
        except Exception as e:
            print(f"  {label} candidate failed: {url} ({e})")
            last_error = e
            continue
    raise RuntimeError(f"Could not download {label}; tried {len(candidates)} URLs") from last_error


def county_zip_candidates() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for year in GENZ_YEARS:
        base = f"https://www2.census.gov/geo/tiger/GENZ{year}/shp"
        # Recent Census GENZ folders publish counties as a national file, not
        # state-specific cb_YYYY_37_county_500k.zip.
        out.append((f"{base}/cb_{year}_us_county_500k.zip", f"cb_{year}_us_county_500k.zip"))
        # Older/alternate pattern, harmless fallback if Census reintroduces it.
        out.append((f"{base}/cb_{year}_37_county_500k.zip", f"cb_{year}_37_county_500k.zip"))
    return out


def place_zip_candidates() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for year in GENZ_YEARS:
        base = f"https://www2.census.gov/geo/tiger/GENZ{year}/shp"
        out.append((f"{base}/cb_{year}_37_place_500k.zip", f"cb_{year}_37_place_500k.zip"))
        out.append((f"{base}/cb_{year}_us_place_500k.zip", f"cb_{year}_us_place_500k.zip"))
    return out


def primary_roads_candidates() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for year in TIGER_YEARS:
        out.append((
            f"https://www2.census.gov/geo/tiger/TIGER{year}/PRIMARYROADS/tl_{year}_us_primaryroads.zip",
            f"tl_{year}_us_primaryroads.zip",
        ))
    return out


def prisec_roads_candidates() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for year in TIGER_YEARS:
        out.append((
            f"https://www2.census.gov/geo/tiger/TIGER{year}/PRISECROADS/tl_{year}_37_prisecroads.zip",
            f"tl_{year}_37_prisecroads.zip",
        ))
    return out


def county_water_candidates(geoid: str, layer: str) -> list[tuple[str, str]]:
    folder = layer.upper()
    out: list[tuple[str, str]] = []
    for year in TIGER_YEARS:
        out.append((
            f"https://www2.census.gov/geo/tiger/TIGER{year}/{folder}/tl_{year}_{geoid}_{layer}.zip",
            f"tl_{year}_{geoid}_{layer}.zip",
        ))
    return out


def clean_text(s: Any) -> str:
    if s is None:
        return ""
    s = str(s)
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"\[[^\]]*\]", "", s)
    s = s.replace("\xa0", " ")
    s = s.replace("†", "").replace("‡", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def norm_name(s: str) -> str:
    s = clean_text(s).lower()
    s = s.replace("&", "and")
    s = re.sub(r"\b(county|city|town|village|cdp|municipality)\b", "", s)
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


def slug(s: str) -> str:
    s = clean_text(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def parse_municipality_list() -> list[dict[str, Any]]:
    """
    Read the A-Z municipality bullet lists from Wikipedia.

    The first version of this script walked A/B/C <h2> sections. That is brittle
    because Wikipedia's emitted HTML can vary by parser/skin. This version scans
    for bullet rows that look like:
        Aberdeen – town, Moore County
        Cary – town, Wake County & Chatham County
    and then extracts the first link as the municipality and later county links
    as counties.
    """
    print("Reading Wikipedia municipality list...")
    html = get(WIKI_MUNICIPALITIES).text
    soup = BeautifulSoup(html, "lxml")
    records: list[dict[str, Any]] = []
    seen: set[str] = set()

    type_re = re.compile(
        r"\b(consolidated\s+city\s*[-–]?\s*county|city|town|village)\b",
        re.I,
    )

    for li in soup.find_all("li"):
        text = clean_text(li.get_text(" ", strip=True))
        if not text:
            continue

        # Municipality list entries consistently have a name, a dash, a type,
        # and at least one county. This avoids nav/footer/list-of-links noise.
        if not re.search(r"\s[-–—]\s", text):
            continue
        if not type_re.search(text):
            continue
        if "County" not in text:
            continue

        links = li.find_all("a", href=True)
        if not links:
            continue

        first = links[0]
        name = clean_text(first.get_text(" "))
        if not name or name.endswith("County"):
            continue

        # Only accept the type after the dash. This prevents accidental matches
        # from linked county/page titles elsewhere in the row.
        after_dash = re.split(r"\s[-–—]\s", text, maxsplit=1)[-1]
        mt = type_re.search(after_dash)
        if not mt:
            continue
        mtype = mt.group(1).lower().replace("–", "-")
        mtype = re.sub(r"\s+", " ", mtype)
        if "consolidated" in mtype:
            mtype = "consolidated city-county"

        counties: list[str] = []
        for a in links[1:]:
            label = clean_text(a.get_text(" ")).replace("’", "'")
            if label.endswith(" County"):
                counties.append(label.removesuffix(" County"))

        # Fallback for rows where the county text was not linked cleanly.
        if not counties:
            counties = [
                clean_text(x).replace("’", "'")
                for x in re.findall(r"\b([A-Z][A-Za-z .’'\-]+?)\s+County\b", text)
            ]
            counties = [c for c in counties if c and c.lower() != "county"]

        counties = list(dict.fromkeys(counties))
        if not counties:
            continue

        key = norm_name(name)
        if not key or key in seen:
            continue

        title = first.get("title") or name
        records.append({
            "id": slug(name),
            "name": name,
            "type": mtype,
            "counties": counties,
            "page_title": title,
        })
        seen.add(key)

    if len(records) < 500:
        debug = STATIC_DATA / "municipality_parse_debug.html"
        debug.write_text(html[:250000], encoding="utf-8")
        raise RuntimeError(
            f"Expected about 551 municipalities, got {len(records)}. "
            f"Wrote the first part of the downloaded Wikipedia HTML to {debug} "
            "so the parser can be adjusted if Wikipedia changed again."
        )

    records.sort(key=lambda r: r["name"])
    print(f"Parsed {len(records)} municipalities")
    return records

def parse_county_seats() -> dict[str, str]:
    print("Reading county seats...")

    # Do NOT pass the Wikipedia URL directly to pandas.read_html here.
    # Pandas uses urllib with a default Python user agent, and Wikipedia can
    # reject that with HTTP 403. Fetch with our requests helper first so the
    # same browser-like/user-agent headers are used consistently.
    html = get(WIKI_COUNTIES).text
    tables = pd.read_html(StringIO(html))
    best = None
    for df in tables:
        cols = [" ".join(map(str, c)).strip() if isinstance(c, tuple) else str(c) for c in df.columns]
        lower = [c.lower() for c in cols]
        if any("county seat" in c or c == "seat" for c in lower) and any("county" in c for c in lower):
            best = df.copy()
            best.columns = cols
            break
    if best is None:
        print("Warning: could not find county seat table")
        return {}

    county_col = next(c for c in best.columns if "county" in c.lower() and "seat" not in c.lower())
    seat_col = next(c for c in best.columns if "seat" in c.lower())
    seats: dict[str, str] = {}
    for _, row in best.iterrows():
        county = clean_text(row[county_col]).replace(" County", "")
        seat = clean_text(row[seat_col])
        if county and seat and county.lower() != "nan" and seat.lower() != "nan":
            seats[county] = seat
    print(f"Parsed {len(seats)} county seats")
    return seats


def fetch_2020_place_populations() -> dict[str, dict[str, Any]]:
    print("Reading 2020 Census place populations...")
    params = {"get": "NAME,P1_001N", "for": "place:*", "in": "state:37"}
    api_key = os.getenv("CENSUS_API_KEY")
    if api_key:
        params["key"] = api_key
    try:
        rows = get(CENSUS_2020_PLACES_API, params=params, timeout=45).json()
    except Exception as e:
        print(f"Warning: Census API population fetch failed: {e}")
        return {}

    header, data = rows[0], rows[1:]
    idx_name = header.index("NAME")
    idx_pop = header.index("P1_001N")
    out: dict[str, dict[str, Any]] = {}
    for row in data:
        full = clean_text(row[idx_name])
        # Examples: "Raleigh city, North Carolina", "Cary town, North Carolina".
        name = re.sub(r",\s*North Carolina$", "", full)
        name = re.sub(r"\s+(city|town|village|CDP|municipality)$", "", name, flags=re.I)
        try:
            pop = int(row[idx_pop])
        except Exception:
            continue
        out[norm_name(name)] = {"population": pop, "population_year": 2020}
    print(f"Parsed {len(out)} Census place population rows")
    return out


def fetch_2020_place_populations_file() -> dict[str, dict[str, Any]]:
    print("Reading 2020 Census place populations from PL download...")
    out: dict[str, dict[str, Any]] = {}
    try:
        path = download(CENSUS_2020_PL_ZIP, "nc2020.pl.zip")
        archive = zipfile.ZipFile(path)
    except Exception as e:
        print(f"Warning: Census PL population fallback failed: {e}")
        return out

    with archive:
        with archive.open("ncgeo2020.pl") as f:
            for raw in f:
                parts = raw.decode("latin1").rstrip("\n").split("|")
                if len(parts) < 92 or parts[2] != "160":
                    continue
                geoid = clean_text(parts[9])
                name = clean_text(parts[86])
                pop_raw = clean_text(parts[90])
                try:
                    pop = int(pop_raw)
                except Exception:
                    continue
                name = re.sub(r"\s+(city|town|village|CDP|municipality)$", "", name, flags=re.I)
                value = {"population": pop, "population_year": 2020}
                out[norm_name(name)] = value
                if geoid:
                    out[geoid] = value

    print(f"Parsed {len(out)} Census PL population fallback rows")
    return out


def fetch_wikipedia_municipality_populations() -> dict[str, dict[str, Any]]:
    print("Reading Wikipedia municipality population fallback...")
    out: dict[str, dict[str, Any]] = {}
    try:
        html = get(WIKI_MUNICIPALITIES).text
        tables = pd.read_html(StringIO(html))
    except Exception as e:
        print(f"Warning: Wikipedia population fallback failed: {e}")
        return out

    for table in tables:
        if "Name" not in table.columns:
            continue
        pop_cols = [col for col in table.columns if str(col).startswith("Population")]
        if not pop_cols:
            continue

        pop_col = pop_cols[0]
        year_match = re.search(r"\((\d{4})\)", str(pop_col))
        pop_year: int | str | None = int(year_match.group(1)) if year_match else "Wikipedia"
        for _, row in table.iterrows():
            name = clean_text(row.get("Name"))
            if not name:
                continue
            name = re.sub(r"[†‡*]+", "", name).strip()
            raw_pop = clean_text(row.get(pop_col))
            raw_pop = re.sub(r"[^0-9]", "", raw_pop)
            if not raw_pop:
                continue
            out[norm_name(name)] = {
                "population": int(raw_pop),
                "population_year": pop_year,
            }
        break

    print(f"Parsed {len(out)} Wikipedia population fallback rows")
    return out


def mediawiki_qids(titles: list[str]) -> dict[str, str]:
    print("Mapping Wikipedia pages to Wikidata QIDs...")
    qids: dict[str, str] = {}
    api = "https://en.wikipedia.org/w/api.php"
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        params = {
            "action": "query",
            "format": "json",
            "redirects": "1",
            "prop": "pageprops",
            "ppprop": "wikibase_item",
            "titles": "|".join(chunk),
        }
        try:
            data = get(api, params=params, timeout=45).json()
            pages = data.get("query", {}).get("pages", {})
            for p in pages.values():
                title = p.get("title")
                qid = p.get("pageprops", {}).get("wikibase_item")
                if title and qid:
                    qids[title] = qid
                    # Also map original chunk title if redirect normalized it loosely.
                    for original in chunk:
                        if norm_name(original) == norm_name(title):
                            qids[original] = qid
        except Exception as e:
            print(f"Warning: QID chunk failed: {e}")
        time.sleep(0.15)
    print(f"Mapped {len(set(qids.values()))} Wikidata QIDs")
    return qids


def parse_wikidata_time(value: str | None) -> str | None:
    if not value:
        return None
    # Value looks like +1795-01-01T00:00:00Z or +00000001995-00-00T00:00:00Z.
    m = re.match(r"^[+](\d{1,9})-(\d{2})-(\d{2})", value)
    if not m:
        return None
    year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if year <= 0:
        return None
    month = 1 if month == 0 else month
    day = 1 if day == 0 else day
    return f"{year:04d}-{month:02d}-{day:02d}"


def wikidata_claims(qids: list[str]) -> dict[str, dict[str, Any]]:
    print("Reading Wikidata founded dates and fallback coordinates...")
    api = "https://www.wikidata.org/w/api.php"
    out: dict[str, dict[str, Any]] = {}
    for i in range(0, len(qids), 50):
        chunk = qids[i:i + 50]
        params = {
            "action": "wbgetentities",
            "format": "json",
            "ids": "|".join(chunk),
            "props": "claims",
        }
        try:
            data = get(api, params=params, timeout=60).json()
        except Exception as e:
            print(f"Warning: Wikidata chunk failed: {e}")
            continue

        for qid, ent in data.get("entities", {}).items():
            claims = ent.get("claims", {}) or {}
            rec: dict[str, Any] = {}

            # P571 = inception/founded/incorporated date in Wikidata.
            dates = []
            for claim in claims.get("P571", []):
                v = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                date = parse_wikidata_time(v.get("time") if isinstance(v, dict) else None)
                if date:
                    dates.append(date)
            if dates:
                rec["founded_date"] = sorted(dates)[0]
                rec["founded_year"] = int(rec["founded_date"][:4])

            # P625 = coordinate location; fallback if Census place polygon matching misses.
            coords = []
            for claim in claims.get("P625", []):
                v = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                if isinstance(v, dict) and "latitude" in v and "longitude" in v:
                    coords.append((float(v["latitude"]), float(v["longitude"])))
            if coords:
                rec["wikidata_lat"] = coords[0][0]
                rec["wikidata_lon"] = coords[0][1]

            # P1082 = population, used only if Census API was unavailable/missing.
            pop_claims = []
            for claim in claims.get("P1082", []):
                v = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                if not isinstance(v, dict) or "amount" not in v:
                    continue
                try:
                    pop = int(float(v["amount"]))
                except Exception:
                    continue
                point_time = None
                quals = claim.get("qualifiers", {}) or {}
                if "P585" in quals:
                    qv = quals["P585"][0].get("datavalue", {}).get("value", {})
                    if isinstance(qv, dict):
                        point_time = parse_wikidata_time(qv.get("time"))
                pop_claims.append((point_time or "0000-01-01", pop))
            if pop_claims:
                pop_claims.sort()
                rec["population_wikidata"] = pop_claims[-1][1]

            out[qid] = rec
        time.sleep(0.15)
    return out


def load_geo_layers() -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame, gpd.GeoDataFrame, dict[str, str]]:
    county_path, county_source = download_first(county_zip_candidates(), "county boundaries")
    place_path, place_source = download_first(place_zip_candidates(), "place boundaries")
    try:
        roads_path, roads_source = download_first(prisec_roads_candidates(), "NC primary and secondary roads")
    except RuntimeError:
        roads_path, roads_source = download_first(primary_roads_candidates(), "primary roads")

    print("Reading county/place boundaries...")
    counties = gpd.read_file(county_path).to_crs(4326)
    places = gpd.read_file(place_path).to_crs(4326)

    # County file is usually national, so filter it to North Carolina here.
    if "STATEFP" in counties.columns:
        counties = counties[counties["STATEFP"].astype(str).str.zfill(2) == "37"].copy()
    if "STATEFP" in places.columns:
        places = places[places["STATEFP"].astype(str).str.zfill(2) == "37"].copy()

    if len(counties) != 100:
        raise RuntimeError(f"Expected 100 NC counties after filtering, got {len(counties)}")
    if len(places) < 500:
        print(f"Warning: expected at least 500 NC place polygons, got {len(places)}")

    nc_bounds = tuple(counties.total_bounds)

    print("Reading/filtering primary roads...")
    try:
        roads = gpd.read_file(roads_path, bbox=nc_bounds).to_crs(4326)
        nc_union = counties.to_crs(5070).union_all()
        roads_5070 = roads.to_crs(5070)
        roads = roads[roads_5070.intersects(nc_union)].copy().to_crs(4326)
        if "RTTYP" in roads.columns:
            roads["route_type"] = roads["RTTYP"].fillna("")
            roads = roads[roads["route_type"].isin(["I", "U", "S"])].copy()
        else:
            roads["route_type"] = ""
        roads["mtfcc"] = roads["MTFCC"].fillna("") if "MTFCC" in roads.columns else ""
        if "FULLNAME" in roads.columns:
            roads["name"] = roads["FULLNAME"].fillna("")
        else:
            roads["name"] = ""
        roads = roads[["name", "route_type", "mtfcc", "geometry"]]
        roads_projected = roads.to_crs(5070)
        roads_projected["geometry"] = roads_projected.geometry.intersection(nc_union)
        roads_projected = roads_projected[~roads_projected.geometry.is_empty].copy()
        roads_projected["geometry"] = roads_projected.geometry.simplify(110, preserve_topology=False)
        merged_rows: list[dict[str, Any]] = []
        for (name, route_type, mtfcc), group in roads_projected.groupby(["name", "route_type", "mtfcc"], dropna=False):
            geometry = unary_union(list(group.geometry))
            try:
                geometry = linemerge(geometry)
            except ValueError:
                pass
            if geometry.is_empty:
                continue
            merged_rows.append({
                "name": name,
                "route_type": route_type,
                "mtfcc": mtfcc,
                "geometry": geometry,
            })
        roads = gpd.GeoDataFrame(merged_rows, geometry="geometry", crs=roads_projected.crs).to_crs(4326)
    except Exception as e:
        print(f"Warning: primary roads failed, writing empty layer: {e}")
        roads = gpd.GeoDataFrame({"name": [], "route_type": [], "mtfcc": []}, geometry=[], crs=4326)

    counties["name"] = counties["NAME"]
    counties["geoid"] = counties["GEOID"]
    counties_out = counties[["geoid", "name", "geometry"]].copy()
    counties_out.to_file(STATIC_DATA / "counties.geojson", driver="GeoJSON")
    roads.to_file(STATIC_DATA / "highways.geojson", driver="GeoJSON")
    water_sources = write_water_layer(counties)
    sources = {
        "county_boundary_source": county_source,
        "place_boundary_source": place_source,
        "primary_roads_source": roads_source,
        **water_sources,
    }
    return counties, places, roads, sources


def write_water_layer(counties: gpd.GeoDataFrame) -> dict[str, str]:
    print("Reading/filtering water features...")
    county_geoids = sorted(counties["GEOID"].astype(str).tolist())
    nc_union = counties.to_crs(5070).union_all()
    area_parts: list[gpd.GeoDataFrame] = []
    river_parts: list[gpd.GeoDataFrame] = []
    area_source = ""
    river_source = ""

    for geoid in county_geoids:
        try:
            area_path, area_url = download_first(county_water_candidates(geoid, "areawater"), f"{geoid} area water")
            if not area_source:
                area_source = area_url
            area = gpd.read_file(area_path).to_crs(4326)
            area["name"] = area["FULLNAME"].fillna("") if "FULLNAME" in area.columns else ""
            area["mtfcc"] = area["MTFCC"].fillna("") if "MTFCC" in area.columns else ""
            area["awater"] = pd.to_numeric(area.get("AWATER", 0), errors="coerce").fillna(0).astype(int)
            important_name = area["name"].str.contains(
                r"Lake|Lk|Reservoir|Sound|Bay|Ocean|River|\bRiv\b",
                case=False,
                regex=True,
                na=False,
            )
            area = area[
                (area["awater"] >= 300000)
                | (important_name & (area["awater"] >= 90000))
            ].copy()
            if not area.empty:
                area["water_kind"] = "area"
                area["source_id"] = area["HYDROID"].fillna("") if "HYDROID" in area.columns else ""
                area_parts.append(area[["name", "mtfcc", "awater", "water_kind", "source_id", "geometry"]])
        except Exception as e:
            print(f"  Warning: {geoid} area water failed: {e}")

        try:
            line_path, line_url = download_first(county_water_candidates(geoid, "linearwater"), f"{geoid} linear water")
            if not river_source:
                river_source = line_url
            lines = gpd.read_file(line_path).to_crs(4326)
            lines["name"] = lines["FULLNAME"].fillna("") if "FULLNAME" in lines.columns else ""
            lines["mtfcc"] = lines["MTFCC"].fillna("") if "MTFCC" in lines.columns else ""
            river_mask = lines["name"].str.contains(r"\bRiv\b|River", case=False, regex=True, na=False)
            lines = lines[river_mask].copy()
            if not lines.empty:
                lines["awater"] = 0
                lines["water_kind"] = "river"
                lines["source_id"] = lines["LINEARID"].fillna("") if "LINEARID" in lines.columns else ""
                river_parts.append(lines[["name", "mtfcc", "awater", "water_kind", "source_id", "geometry"]])
        except Exception as e:
            print(f"  Warning: {geoid} linear water failed: {e}")

    parts = [part for part in [*area_parts, *river_parts] if not part.empty]
    if not parts:
        print("Warning: no water features found")
        gpd.GeoDataFrame(
            {"name": [], "mtfcc": [], "awater": [], "water_kind": [], "source_id": []},
            geometry=[],
            crs=4326,
        ).to_file(STATIC_DATA / "water.geojson", driver="GeoJSON")
        return {
            "area_water_source": area_source,
            "linear_water_source": river_source,
        }

    water = pd.concat(parts, ignore_index=True)
    water = gpd.GeoDataFrame(water, geometry="geometry", crs=4326)
    water = water.drop_duplicates(subset=["water_kind", "source_id"])
    water_projected = water.to_crs(5070)
    water_projected = water_projected[water_projected.geometry.intersects(nc_union)].copy()
    water_projected["geometry"] = water_projected.geometry.intersection(nc_union)
    water_projected = water_projected[~water_projected.geometry.is_empty].copy()

    merged_rows: list[dict[str, Any]] = []
    named = water_projected[water_projected["name"] != ""].copy()
    unnamed = water_projected[water_projected["name"] == ""].copy()
    for (name, kind, mtfcc), group in named.groupby(["name", "water_kind", "mtfcc"], dropna=False):
        geometry = unary_union(list(group.geometry))
        if kind == "river":
            try:
                geometry = linemerge(geometry)
            except ValueError:
                pass
        if geometry.is_empty:
            continue
        merged_rows.append({
            "name": name,
            "mtfcc": mtfcc,
            "awater": int(group["awater"].max()),
            "water_kind": kind,
            "source_id": "",
            "geometry": geometry,
        })
    for _, row in unnamed.iterrows():
        merged_rows.append(row.to_dict())

    water_projected = gpd.GeoDataFrame(merged_rows, geometry="geometry", crs=water_projected.crs)
    water_projected["geometry"] = water_projected.geometry.simplify(120, preserve_topology=True)
    water_projected = water_projected[~water_projected.geometry.is_empty].copy()
    water = water_projected.to_crs(4326)
    water.to_file(STATIC_DATA / "water.geojson", driver="GeoJSON")
    print(f"Wrote {len(water)} water features")
    return {
        "area_water_source": area_source,
        "linear_water_source": river_source,
    }


def match_places_to_municipalities(
    municipalities: list[dict[str, Any]],
    counties: gpd.GeoDataFrame,
    places: gpd.GeoDataFrame,
    wikidata: dict[str, dict[str, Any]],
    title_to_qid: dict[str, str],
    populations: dict[str, dict[str, Any]],
    county_seats: dict[str, str],
) -> list[dict[str, Any]]:
    print("Matching municipalities to Census place centroids...")
    places = places.copy()
    places["norm"] = places["NAME"].map(norm_name)
    place_names = list(places["norm"])
    centroid_series = places.to_crs(5070).geometry.centroid.to_crs(4326)
    places["lon"] = centroid_series.x
    places["lat"] = centroid_series.y

    county_names = counties[["NAME", "geometry"]].copy()
    county_names["county_name"] = county_names["NAME"]
    seat_norms = {norm_name(seat): county for county, seat in county_seats.items()}

    records = []
    unmatched = []
    for m in municipalities:
        n = norm_name(m["name"])
        match_row = None
        match_score = 100
        exact = places[places["norm"] == n]
        if not exact.empty:
            match_row = exact.iloc[0]
        else:
            candidate = process.extractOne(n, place_names, scorer=fuzz.ratio)
            if candidate and candidate[1] >= 96:
                match_score = candidate[1]
                match_row = places[places["norm"] == candidate[0]].iloc[0]

        qid = title_to_qid.get(m.get("page_title", ""))
        w = wikidata.get(qid, {}) if qid else {}

        lat = lon = None
        place_geoid = None
        if match_row is not None:
            lat = float(match_row["lat"])
            lon = float(match_row["lon"])
            place_geoid = str(match_row.get("GEOID", ""))
        elif "wikidata_lat" in w and "wikidata_lon" in w:
            lat = float(w["wikidata_lat"])
            lon = float(w["wikidata_lon"])
            unmatched.append(m["name"] + " (Wikidata coordinate fallback)")
        else:
            unmatched.append(m["name"])
            continue

        primary_county = None
        pt = Point(lon, lat)
        for _, crow in county_names.iterrows():
            if crow.geometry.contains(pt) or crow.geometry.touches(pt):
                primary_county = clean_text(crow["county_name"])
                break
        if not primary_county and m.get("counties"):
            primary_county = m["counties"][0]

        # Merge counties from Wikipedia plus the centroid-containing county.
        counties_list = list(dict.fromkeys([*m.get("counties", []), primary_county] if primary_county else m.get("counties", [])))
        counties_list = [c for c in counties_list if c]

        pop_info = populations.get(place_geoid) or populations.get(n, {})
        pop = pop_info.get("population") or w.get("population_wikidata")
        pop_year = pop_info.get("population_year") or ("Wikidata" if w.get("population_wikidata") else None)

        rec = {
            "id": m["id"],
            "name": m["name"],
            "type": m["type"],
            "counties": counties_list,
            "primary_county": primary_county,
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "place_geoid": place_geoid,
            "population": pop,
            "population_year": pop_year,
            "founded_date": w.get("founded_date"),
            "founded_year": w.get("founded_year"),
            "is_county_seat": norm_name(m["name"]) in seat_norms,
            "county_seat_of": seat_norms.get(norm_name(m["name"])),
            "wikipedia_title": m.get("page_title"),
            "wikidata_qid": qid,
            "match_score": match_score,
        }
        records.append(rec)

    print(f"Matched {len(records)} municipalities. Unmatched/skipped: {len(unmatched)}")
    if unmatched:
        (STATIC_DATA / "unmatched.txt").write_text("\n".join(unmatched), encoding="utf-8")
        print("Unmatched list written to static/data/unmatched.txt")
    records.sort(key=lambda r: r["name"])
    return records


def write_city_outlines(places: gpd.GeoDataFrame, cities: list[dict[str, Any]]) -> None:
    print("Writing city outline layer...")
    geoids = {str(city.get("place_geoid")) for city in cities if city.get("place_geoid")}
    outlines = places[places["GEOID"].astype(str).isin(geoids)].copy()
    if outlines.empty:
        print("Warning: no matching city outlines found")
        gpd.GeoDataFrame({"geoid": [], "name": []}, geometry=[], crs=4326).to_file(
            STATIC_DATA / "city_outlines.geojson",
            driver="GeoJSON",
        )
        return

    outlines["geoid"] = outlines["GEOID"].astype(str)
    outlines["name"] = outlines["NAME"].map(clean_text)
    outlines = outlines[["geoid", "name", "geometry"]].copy()

    projected = outlines.to_crs(5070)
    projected["geometry"] = projected.geometry.simplify(45, preserve_topology=True)
    outlines = projected.to_crs(4326)
    outlines.to_file(STATIC_DATA / "city_outlines.geojson", driver="GeoJSON")
    print(f"Wrote {len(outlines)} city outlines")


def main() -> None:
    municipalities = parse_municipality_list()
    county_seats = parse_county_seats()
    populations = fetch_2020_place_populations()
    census_file_populations = fetch_2020_place_populations_file()
    for key, value in census_file_populations.items():
        populations.setdefault(key, value)
    wiki_populations = fetch_wikipedia_municipality_populations()
    for key, value in wiki_populations.items():
        populations.setdefault(key, value)
    counties, places, _roads, geo_sources = load_geo_layers()

    titles = [m["page_title"] for m in municipalities if m.get("page_title")]
    title_to_qid = mediawiki_qids(titles)
    qids = sorted(set(title_to_qid.values()))
    wikidata = wikidata_claims(qids)

    cities = match_places_to_municipalities(
        municipalities=municipalities,
        counties=counties,
        places=places,
        wikidata=wikidata,
        title_to_qid=title_to_qid,
        populations=populations,
        county_seats=county_seats,
    )

    write_city_outlines(places, cities)
    (STATIC_DATA / "cities.json").write_text(json.dumps(cities, indent=2), encoding="utf-8")
    metadata = {
        "municipality_source": WIKI_MUNICIPALITIES,
        "county_seat_source": WIKI_COUNTIES,
        **geo_sources,
        "population_source": CENSUS_2020_PLACES_API,
        "population_download_source": CENSUS_2020_PL_ZIP,
        "population_fallback_source": WIKI_MUNICIPALITIES,
        "city_count": len(cities),
        "generated_at_unix": int(time.time()),
        "notes": [
            "City quiz locations use Census place polygon centroids when available.",
            "Optional city outlines use simplified Census place polygons matched by GEOID.",
            "Highways include Interstate, US, and NC state routes from Census TIGER primary and secondary roads.",
            "Water includes simplified TIGER area-water polygons plus named river centerlines.",
            "Founded dates are from Wikidata P571 when available, so some records may be blank.",
            "Population is 2020 Census place population when the Census API returns it; otherwise the Wikipedia municipality table is used where available.",
        ],
    }
    (STATIC_DATA / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("Done. Start the app with: python app.py")


if __name__ == "__main__":
    main()
