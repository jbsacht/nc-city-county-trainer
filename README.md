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

## Bundled data

The reviewed dataset is included in `static/data` and checked into Git. A fresh clone already contains the county boundaries, city records and outlines, highways, water, and source metadata. No data download or generation step is needed.

The dataset includes 550 active municipalities, Camden CDP as a county-seat location, and inactive Spencer Mountain for learning. Camden and Spencer Mountain are excluded from active municipality quizzes. The data was reviewed on October 17, 2026.

Sources include U.S. Census 2024 boundaries and TIGER roads/water, original 2020 Census population counts, NC OSBM 2025 municipality and county-membership tables, and NC.gov county-seat information. Source URLs and limitations are recorded in `static/data/metadata.json`.

The generated runtime dataset is about 6.7 MB. Original download archives and data-generation tooling are not part of the repository.

## Install

```bash
python -m venv .venv
source .venv/bin/activate      # macOS/Linux
# .venv\Scripts\activate      # Windows PowerShell/cmd equivalent
pip install -r requirements.txt
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

- City quiz points are inside both the source municipal polygon and the displayed simplified outline. A polygon centroid is retained when it meets that requirement; otherwise an interior point is used.
- Founding dates remain unknown when no verified date is available.
- The highway layer includes Interstate, US, and NC state routes.
- Boundaries retain their documented 2024 vintage; population values are original 2020 Census counts, not current estimates.
- To update data, edit or replace the reviewed files in `static/data`, validate affected records and geometry, and commit the data changes together with the source metadata. Normal installation does not regenerate data.
