# NC City + County Trainer

A local full-stack learning app for North Carolina municipalities and counties.

## What it does

After any answered question, click anywhere in the game area to continue to the next question. The explicit Next button remains for accessibility.

### Learn
Click any county on the blank map to reveal its name, county seat, and dots for every loaded municipality in that county. Hover a dot to see the city/town name.

### City Hunt
1. Shows a city/town/village name.
2. You click the county first on a blank North Carolina map.
3. By default, the answer is scored from the county pick and the exact city point appears immediately.
4. Optional exact-spot testing asks you to click where the municipality is inside the county.
5. If exact-spot testing is on, your click is checked against the configured mile threshold.
6. The exact learning point appears with population, county, founded date when available, and county-seat info.
7. Optional top-N limiting lets you practice the first N cities after the selected order/filter. City Hunt defaults to population descending.
8. Get them all is on by default and sends missed cities back into the pool until each selected city has been answered correctly.

### Counties
- **Pick county**: you are given a county name and click it.
- **Name county**: a county is highlighted and you type its name.
- **Pick county difficulty**: Easy keeps counties that are out of the pool highlighted green for correct and red for missed; Hard keeps the map blank each round.
- **Get them all**: on by default; sends missed answers back into the pool until all selected counties have been completed.
- **County limit**: practice only the first N counties after the selected order. Counties default to random order.

### County Seats
- **Pick county**: you are given a county seat and click the county it belongs to.
- **Name county seat**: the county and seat point are shown, and you type the county seat name.
- Easy/Hard, Get them all, random order, alphabetical order, and limits work here too. Get them all is on by default. County Seats default to random order. Easy Pick county keeps completed/missed county-seat dots visible alongside the shaded counties.
- The mode uses local county-seat city records, plus fallbacks for Currituck and Swan Quarter so all 100 counties are covered.

### App settings
- Open Settings from the top right to switch between Dark and Beach themes.
- The pointer can be changed from the default cursor to Wii-style player 1-4 pointers sourced from `imgs/pointers.png`. It automatically uses the point cursor normally, the open hand for clickable targets, and the fist while dragging the map.

## Data sources

The build script downloads data once and writes it to `static/data`.

- Wikipedia: list of North Carolina municipalities and population fallback when Census sources are unavailable.
- Wikipedia: county seats from the North Carolina counties list.
- U.S. Census cartographic boundary files: counties and places.
- U.S. Census TIGER/Line primary roads: highway overlay.
- U.S. Census 2020 API or PL download: place populations.
- Wikidata: founded/incorporated dates and fallback coordinates when available.

## Install

```bash
python -m venv .venv
source .venv/bin/activate      # macOS/Linux
# .venv\Scripts\activate      # Windows PowerShell/cmd equivalent
pip install -r requirements.txt
```

## Build the map/data files

```bash
python scripts/build_data.py
```

If the Census API asks for a key, get a free Census API key and run:

```bash
export CENSUS_API_KEY="your_key_here"   # macOS/Linux
# set CENSUS_API_KEY=your_key_here      # Windows cmd
python scripts/build_data.py
```

## Run

```bash
python app.py
```

Open:

```text
http://127.0.0.1:8000
```

## Practical notes

- The city click target is the Census place polygon centroid. That is usually the best point for a geography-learning quiz because it avoids geocoding one-off addresses and keeps everything local.
- Some founded dates may be blank because the municipality's Wikidata item may not have an inception/incorporation date.
- The highway layer is primary roads only so it helps orientation without adding city labels that would spoil the quiz.
- Data files are static after the build. To update them later, delete `.cache` and rerun `python scripts/build_data.py`.

### Notes on data downloads

The builder tries multiple Census boundary-file vintages automatically. Current Census GENZ releases publish county boundaries as a national file such as `cb_2024_us_county_500k.zip`, then the script filters it to North Carolina. The optional Census population API now may require a `CENSUS_API_KEY`; if you do not set one, the app uses the downloadable 2020 PL file for place populations and falls back to the Wikipedia municipality population table where available.
