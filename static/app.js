const $ = (id) => document.getElementById(id);

const app = {
  data: null,
  map: null,
  mapRenderer: null,
  countyLayer: null,
  countyBorderLayer: null,
  countyPickCanvas: null,
  countyPickContext: null,
  countyPickBounds: null,
  countyPickColorMap: new Map(),
  countyHoverFrame: 0,
  pendingCountyHoverLatLng: null,
  countyFilterMap: null,
  countyFilterLayer: null,
  highwayLayer: null,
  highwayLayersByType: new Map(),
  waterLayer: null,
  waterLoading: null,
  markerLayer: null,
  retiredMarkerLayer: null,
  learnDotsLayer: null,
  learnDots: [],
  learnDotsFrame: 0,
  learnSelectedCityKey: "",
  learnSelectedCity: null,
  learnSelectedCityNode: null,
  learnSelectedCityOutline: null,
  learnSelectedCityHighlight: null,
  targetLayer: null,
  countyLayersByName: new Map(),
  cityOutlinesByGeoid: new Map(),
  retiredSeatMarkers: new Map(),
  sequence: [],
  index: 0,
  requiredCountyNames: new Set(),
  completedCountyNames: new Set(),
  retiredCountyResults: new Map(),
  knownCountyNames: new Set(),
  quizCountyNames: new Set(),
  countyFilterReady: false,
  cityTask: "pick",
  countyTask: "pick",
  seatNoMapTask: "county",
  countyFinderDifficulty: "easy",
  appTheme: "dark",
  cursorType: "default",
  cursorPlayer: "p1",
  cursorToken: "",
  orderMode: "",
  mode: "city",
  stage: "loading",
  scoreCorrect: 0,
  scoreTotal: 0,
  current: null,
  cityCountyCorrect: false,
  selectedCounty: null,
  hoveredCountyName: null,
  hoveredCountyLayer: null,
  answered: false,
  advanceArmedAt: 0,
};

const countyFilterStorageKey = "ncMapTrainerCountyFilter";

const baseCountyStyle = {
  color: "#6b7a86",
  weight: 1.2,
  opacity: 0.95,
  fillColor: "#1b242d",
  fillOpacity: 0.7,
};
const hoverCountyStyle = { color: "#2dd4bf", weight: 2.5, fillColor: "#123d3a", fillOpacity: 0.82 };
const selectedStyle = { color: "#f59e0b", weight: 3, fillColor: "#3f2c12", fillOpacity: 0.82 };
const correctStyle = { color: "#22c55e", weight: 3.5, fillColor: "#12351f", fillOpacity: 0.86 };
const wrongStyle = { color: "#fb7185", weight: 3.5, fillColor: "#451a24", fillOpacity: 0.86 };
const targetStyle = { color: "#38bdf8", weight: 4, fillColor: "#0b3550", fillOpacity: 0.88 };
const countyBorderStyle = { color: "#9fb3c5", weight: 1.05, opacity: 0.68, fillOpacity: 0 };
const highwayStyle = { color: "#f59e0b", weight: 1.35, opacity: 0.38 };
const waterAreaStyle = { color: "#38bdf8", weight: 0.8, opacity: 0.42, fillColor: "#0ea5e9", fillOpacity: 0.34 };
const waterLineStyle = { color: "#38bdf8", weight: 1.2, opacity: 0.5 };
const highwayTypes = ["I", "U", "S"];

const countySeatFallbacks = [
  {
    name: "Currituck",
    type: "unincorporated community",
    primary_county: "Currituck",
    counties: ["Currituck"],
    lat: 36.439774,
    lon: -76.005478,
    population: null,
    population_year: null,
    founded_date: null,
    founded_year: null,
    is_county_seat: true,
    county_seat_of: "Currituck",
  },
  {
    name: "Swan Quarter",
    type: "CDP",
    primary_county: "Hyde",
    counties: ["Hyde"],
    lat: 35.406278,
    lon: -76.329086,
    population: null,
    population_year: null,
    founded_date: null,
    founded_year: null,
    is_county_seat: true,
    county_seat_of: "Hyde",
  },
];

const themeMapStyles = {
  dark: {
    base: { color: "#5f7488", weight: 1.2, opacity: 0.95, fillColor: "#07121f", fillOpacity: 0.78 },
    hover: { color: "#38bdf8", weight: 2.5, fillColor: "#0b2b46", fillOpacity: 0.86 },
    selected: { color: "#f59e0b", weight: 3, fillColor: "#31240b", fillOpacity: 0.84 },
    correct: { color: "#22c55e", weight: 3.5, fillColor: "#092d1a", fillOpacity: 0.88 },
    wrong: { color: "#fb7185", weight: 3.5, fillColor: "#3f101b", fillOpacity: 0.88 },
    target: { color: "#60a5fa", weight: 4, fillColor: "#082f5b", fillOpacity: 0.9 },
    border: { color: "#9fb3c5", weight: 1.05, opacity: 0.72, fillOpacity: 0 },
    highway: { color: "#fbbf24", weight: 1.35, opacity: 0.38 },
    waterArea: { color: "#38bdf8", weight: 0.8, opacity: 0.44, fillColor: "#0ea5e9", fillOpacity: 0.34 },
    waterLine: { color: "#38bdf8", weight: 1.2, opacity: 0.52 },
  },
  beach: {
    base: { color: "#2f6f8f", weight: 1.2, opacity: 0.95, fillColor: "#d7f2ed", fillOpacity: 0.74 },
    hover: { color: "#0f766e", weight: 2.6, fillColor: "#8ddbd0", fillOpacity: 0.82 },
    selected: { color: "#f97316", weight: 3, fillColor: "#fed7aa", fillOpacity: 0.82 },
    correct: { color: "#15803d", weight: 3.5, fillColor: "#bbf7d0", fillOpacity: 0.84 },
    wrong: { color: "#e11d48", weight: 3.5, fillColor: "#fecdd3", fillOpacity: 0.86 },
    target: { color: "#0369a1", weight: 4, fillColor: "#bae6fd", fillOpacity: 0.88 },
    border: { color: "#155e75", weight: 1.05, opacity: 0.76, fillOpacity: 0 },
    highway: { color: "#b45309", weight: 1.35, opacity: 0.38 },
    waterArea: { color: "#0284c7", weight: 0.9, opacity: 0.5, fillColor: "#7dd3fc", fillOpacity: 0.48 },
    waterLine: { color: "#0369a1", weight: 1.3, opacity: 0.62 },
  },
};
const pointerSheetUrl = "/imgs/pointers.png";
const pointerSourceBoxes = {
  point: [
    [88, 67, 160, 169],
    [168, 67, 241, 169],
    [249, 67, 322, 169],
    [330, 67, 403, 169],
  ],
  open: [
    [103, 178, 190, 278],
    [195, 178, 285, 278],
    [290, 178, 380, 278],
    [385, 178, 475, 278],
  ],
  fist: [
    [113, 312, 186, 387],
    [208, 312, 281, 387],
    [303, 312, 376, 387],
    [398, 312, 471, 387],
  ],
};
const pointerHotspots = {
  point: [24, 2],
  open: [44, 22],
  fist: [36, 38],
};
const pointerScale = 0.5;
let pointerSheetPromise = null;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/county/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function fmtNum(x) {
  if (x === null || x === undefined || x === "") return "Unknown";
  if (typeof x === "number") return x.toLocaleString();
  return String(x);
}

function numericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function milesBetween(a, b) {
  const R = 3958.7613;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function targetLatLngForPlace(place) {
  const lat = Number(place?.lat);
  const lng = Number(place?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function clickDistanceToPlace(place, clickedLatLng, fallbackLayer) {
  const target = targetLatLngForPlace(place);
  const guess = clickedLatLng || fallbackLayer?.getBounds?.().getCenter?.();
  if (!target || !guess) return null;
  const distance = milesBetween(guess, target);
  return Number.isFinite(distance) ? { target, guess, distance } : null;
}

function specificPickerResult(place, clickedLatLng, fallbackLayer, settings = getSettings()) {
  if (!settings.specificCityPicker) return { enabled: false, correct: true, radius: settings.specificCityRadius };
  const result = clickDistanceToPlace(place, clickedLatLng, fallbackLayer);
  return {
    enabled: true,
    correct: Boolean(result && result.distance <= settings.specificCityRadius),
    radius: settings.specificCityRadius,
    ...result,
  };
}

function getRadioValue(name, fallback) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
}

function setRadioValue(name, value) {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function parseLimitInput(id) {
  const value = Number($(id).value);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function parsePositiveNumberInput(id, fallback) {
  const value = Number($(id).value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getSettings() {
  return {
    mode: $("modeSelect").value,
    cityTask: getRadioValue("cityTask", "pick"),
    countyTask: getRadioValue("countyTask", "pick"),
    seatNoMapTask: getRadioValue("seatNoMapTask", "county"),
    countyFinderDifficulty: getRadioValue("countyFinderDifficulty", "easy"),
    order: $("orderSelect").value,
    direction: $("directionSelect").value,
    cityLimit: parseLimitInput("cityLimitInput"),
    countyLimit: parseLimitInput("countyLimitInput"),
    threshold: Number($("thresholdInput").value),
    showStars: $("seatStarsInput").checked,
    testCityPoint: Boolean($("cityPointTestInput")?.checked),
    specificCityPicker: $("specificCityPickerInput").checked,
    specificCityRadius: parsePositiveNumberInput("specificCityRadiusInput", 5),
    cityOutlines: $("cityOutlineInput").checked,
    seatOutlines: $("seatOutlineInput").checked,
    learnAllCities: $("learnAllCitiesInput").checked,
    learnCityOutlines: getRadioValue("learnCityDisplay", "dots") === "outlines",
    learnHighlightSeats: $("learnHighlightSeatsInput").checked,
    showHighways: $("highwaysInput").checked,
    showWater: $("waterInput").checked,
    repeatMisses: $("repeatMissesInput").checked,
  };
}

function isCountyMode(mode = app.mode) {
  return mode === "county";
}

function isCountySeatMode(mode = app.mode) {
  return mode === "seat";
}

function usesCountyTaskSettings(mode = app.mode) {
  return isCountyMode(mode) || isCountySeatMode(mode);
}

function isUltraHardMode(mode = app.mode) {
  const useActiveGameState = document.body.classList.contains("in-game") && mode === app.mode;
  if (mode === "city") {
    const task = useActiveGameState ? app.cityTask : getRadioValue("cityTask", "pick");
    return task === "ultra";
  }
  if (mode === "seat") {
    const task = useActiveGameState ? app.countyTask : getRadioValue("countyTask", "pick");
    return task === "ultra";
  }
  return false;
}

function currentCityTask(mode = app.mode) {
  const useActiveGameState = document.body.classList.contains("in-game") && mode === app.mode;
  return useActiveGameState ? app.cityTask : getRadioValue("cityTask", "pick");
}

function isCountyFinderMode(mode = app.mode) {
  const task = mode === app.mode ? app.countyTask : getRadioValue("countyTask", "pick");
  return isCountyMode(mode) && task === "pick";
}

function isCountySeatPickMode(mode = app.mode) {
  const task = mode === app.mode ? app.countyTask : getRadioValue("countyTask", "pick");
  return isCountySeatMode(mode) && task === "pick";
}

function isCountyPickMode(mode = app.mode) {
  return isCountyFinderMode(mode) || isCountySeatPickMode(mode);
}

function isEasyCountyFinderMode(mode = app.mode) {
  return isCountyPickMode(mode) && app.countyFinderDifficulty === "easy";
}

function shouldShowOrderOptions(mode) {
  return ["city", "county", "seat"].includes(mode);
}

function showMenuSection(id, visible, display = "block") {
  const node = $(id);
  if (!node) return;
  node.style.display = visible ? display : "none";
}

function syncMapThemeStyles(theme) {
  const styles = themeMapStyles[theme] || themeMapStyles.dark;
  Object.assign(baseCountyStyle, styles.base);
  Object.assign(hoverCountyStyle, styles.hover);
  Object.assign(selectedStyle, styles.selected);
  Object.assign(correctStyle, styles.correct);
  Object.assign(wrongStyle, styles.wrong);
  Object.assign(targetStyle, styles.target);
  Object.assign(countyBorderStyle, styles.border);
  Object.assign(highwayStyle, styles.highway);
  Object.assign(waterAreaStyle, styles.waterArea);
  Object.assign(waterLineStyle, styles.waterLine);
}

function refreshMapTheme() {
  if (!app.countyLayer) return;
  app.countyLayer.eachLayer((layer) => app.countyLayer.resetStyle(layer));
  applyRetiredCountyStyles();
  if (app.stage === "countyName" && app.current) {
    const layer = getCountyLayer(app.current);
    if (layer) layer.setStyle(targetStyle);
  }
  if (app.stage === "countySeatName" && app.current) {
    const layer = getCountyLayer(seatCountyName(app.current));
    if (layer) layer.setStyle(targetStyle);
  }
  if (app.stage === "cityName" && app.current) {
    for (const county of uniqueCountyNames(cityCountyNames(app.current))) {
      const layer = getCountyLayer(county);
      if (layer) layer.setStyle(targetStyle);
    }
  }
  if (app.stage === "learn" && app.current) {
    const layer = getCountyLayer(app.current);
    if (layer) restoreCountyStyle(app.current, layer);
  }
  applyLearnKnownCountyStyles();
  if (app.countyBorderLayer) app.countyBorderLayer.setStyle(countyBorderStyle);
  refreshHighwayLayerStyles();
  if (app.waterLayer) app.waterLayer.setStyle(waterFeatureStyle);
  refreshWater();
  refreshHighways();
}

function loadPointerSheet() {
  if (!pointerSheetPromise) {
    pointerSheetPromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = pointerSheetUrl;
    });
  }
  return pointerSheetPromise;
}

async function pointerCursorValue(cursorType, cursorPlayer) {
  const playerIndex = Math.max(0, Math.min(3, (Number(String(cursorPlayer).replace("p", "")) || 1) - 1));
  const box = (pointerSourceBoxes[cursorType] || pointerSourceBoxes.point)[playerIndex];
  const image = await loadPointerSheet();
  const [sx, sy, ex, ey] = box;
  const cropW = ex - sx;
  const cropH = ey - sy;
  const cursorW = Math.max(1, Math.round(cropW * pointerScale));
  const cursorH = Math.max(1, Math.round(cropH * pointerScale));
  const canvas = document.createElement("canvas");
  canvas.width = cursorW;
  canvas.height = cursorH;
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, cursorW, cursorH);

  const [hotX, hotY] = pointerHotspots[cursorType] || pointerHotspots.point;
  return `url("${canvas.toDataURL("image/png")}") ${Math.round(hotX * pointerScale)} ${Math.round(hotY * pointerScale)}, pointer`;
}

async function applyCursorStyle(cursorType, cursorPlayer) {
  app.cursorType = cursorType;
  app.cursorPlayer = cursorPlayer;
  document.body.dataset.cursorType = cursorType;
  document.body.dataset.cursorPlayer = cursorPlayer;
  showMenuSection("pointerPlayerOptions", cursorType === "wii");
  if (cursorType === "default") {
    app.cursorToken = "default";
    document.body.classList.remove("wii-pointer");
    document.body.style.removeProperty("--cursor-point");
    document.body.style.removeProperty("--cursor-hand");
    document.body.style.removeProperty("--cursor-fist");
    return;
  }

  const token = `wii:${cursorPlayer}`;
  app.cursorToken = token;
  document.body.classList.add("wii-pointer");
  try {
    const [point, open, fist] = await Promise.all([
      pointerCursorValue("point", cursorPlayer),
      pointerCursorValue("open", cursorPlayer),
      pointerCursorValue("fist", cursorPlayer),
    ]);
    if (app.cursorToken === token) {
      document.body.style.setProperty("--cursor-point", point);
      document.body.style.setProperty("--cursor-hand", open);
      document.body.style.setProperty("--cursor-fist", fist);
    }
  } catch (err) {
    console.error("Could not load Wii pointer sheet", err);
    if (app.cursorToken === token) {
      document.body.classList.remove("wii-pointer");
      document.body.style.removeProperty("--cursor-point");
      document.body.style.removeProperty("--cursor-hand");
      document.body.style.removeProperty("--cursor-fist");
    }
  }
}

function applyTheme(theme) {
  app.appTheme = themeMapStyles[theme] ? theme : "dark";
  document.body.dataset.theme = app.appTheme;
  syncMapThemeStyles(app.appTheme);
  refreshMapTheme();
  refreshCountyFilterMapStyles();
}

function allCountyNames() {
  return (app.data?.counties?.features || [])
    .map((feature) => feature.properties.name || feature.properties.NAME)
    .filter(Boolean);
}

function isQuizCountySelected(countyName) {
  return app.quizCountyNames.has(norm(countyName));
}

function cityCountyNames(city) {
  return [...(city?.counties || []), city?.primary_county].filter(Boolean);
}

function cityPrimaryCounty(city) {
  return city?.primary_county || (city?.counties && city.counties[0]) || "";
}

function isCurrentCityCountyName(countyName) {
  return app.current && cityCountyNames(app.current).some((cityCounty) => norm(cityCounty) === norm(countyName));
}

function cityMatchesCountyFilter(city) {
  return cityCountyNames(city).some(isQuizCountySelected);
}

function countyFilterStyle(countyName, hovered = false) {
  const selected = isQuizCountySelected(countyName);
  const dark = app.appTheme !== "beach";
  if (hovered) {
    return {
      color: dark ? "#7dd3fc" : "#075985",
      weight: 2.5,
      opacity: 1,
      fillColor: selected
        ? (dark ? "#15803d" : "#86efac")
        : (dark ? "#334155" : "#d7e4e7"),
      fillOpacity: 0.96,
    };
  }
  if (selected) {
    return {
      color: dark ? "#4ade80" : "#166534",
      weight: 1.5,
      opacity: 1,
      fillColor: dark ? "#166534" : "#86efac",
      fillOpacity: 0.9,
    };
  }
  return {
    color: dark ? "#52606f" : "#6b8792",
    weight: 1,
    opacity: 0.85,
    fillColor: dark ? "#17202b" : "#dbe8ea",
    fillOpacity: 0.82,
  };
}

function refreshCountyFilterMapStyles() {
  if (!app.countyFilterLayer) return;
  app.countyFilterLayer.eachLayer((layer) => {
    const countyName = getCountyName(layer);
    const selected = isQuizCountySelected(countyName);
    layer.setStyle(countyFilterStyle(countyName));
    const path = layer.getElement?.();
    if (path) {
      path.setAttribute("aria-pressed", selected ? "true" : "false");
      path.setAttribute("aria-label", `${countyDisplayName(countyName)}, ${selected ? "included" : "excluded"}`);
    }
  });
}

function updateStartAvailability() {
  const activeMode = $("modeSelect").value;
  $("startButton").disabled = !app.data || (activeMode !== "learn" && app.quizCountyNames.size === 0);
}

function updateCountyFilterUI() {
  const total = allCountyNames().length;
  const selected = app.quizCountyNames.size;
  const allSelected = total > 0 && selected === total;
  const summary = allSelected
    ? `All ${total} counties`
    : selected === 0
      ? "No counties selected"
      : `${selected} of ${total} counties`;

  $("countyFilterButton").disabled = !app.countyFilterReady;
  $("countyFilterSummary").textContent = summary;
  $("countyFilterStatus").textContent = allSelected
    ? `All ${total} counties selected`
    : `${selected} of ${total} counties selected`;
  $("countyFilterSelectAllButton").disabled = allSelected;
  $("countyFilterDeselectAllButton").disabled = selected === 0;
  refreshCountyFilterMapStyles();
  updateStartAvailability();
}

function saveCountyFilter() {
  localStorage.setItem(countyFilterStorageKey, JSON.stringify([...app.quizCountyNames]));
}

function loadCountyFilter() {
  const validCountyKeys = new Set(allCountyNames().map(norm));
  let selectedCountyKeys = new Set(validCountyKeys);
  try {
    const saved = JSON.parse(localStorage.getItem(countyFilterStorageKey) || "null");
    if (Array.isArray(saved)) {
      selectedCountyKeys = new Set(saved.map(norm).filter((key) => validCountyKeys.has(key)));
    }
  } catch (err) {
    console.warn("Could not load county filter", err);
  }
  app.quizCountyNames = selectedCountyKeys;
  app.countyFilterReady = true;
  updateCountyFilterUI();
}

function setCountyFilterSelection(countyNames) {
  app.quizCountyNames = new Set(countyNames.map(norm));
  saveCountyFilter();
  updateCountyFilterUI();
}

function toggleCountyFilterSelection(countyName) {
  const key = norm(countyName);
  if (app.quizCountyNames.has(key)) {
    app.quizCountyNames.delete(key);
  } else {
    app.quizCountyNames.add(key);
  }
  saveCountyFilter();
  updateCountyFilterUI();
}

function bindCountyFilterLayerInteraction(layer, countyName) {
  let lastDirectActivation = 0;
  const activate = (event, source) => {
    const now = performance.now();
    if (source === "leaflet" && now - lastDirectActivation < 400) return;
    if (source !== "leaflet") lastDirectActivation = now;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    toggleCountyFilterSelection(countyName);
  };

  layer.on({
    mouseover: () => layer.setStyle(countyFilterStyle(countyName, true)),
    mouseout: () => layer.setStyle(countyFilterStyle(countyName)),
    click: (event) => activate(event.originalEvent, "leaflet"),
    add: () => {
      const path = layer.getElement?.();
      if (!path || path.dataset.countyFilterBound === "true") return;
      path.dataset.countyFilterBound = "true";
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", "0");
      path.addEventListener("pointerup", (event) => activate(event, "pointer"));
      path.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") activate(event, "keyboard");
      });
    },
  });
}

function initCountyFilterMap() {
  if (app.countyFilterMap || !app.data) return;
  app.countyFilterMap = L.map("countyFilterMap", {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    zoomAnimation: false,
    fadeAnimation: false,
  });
  app.countyFilterLayer = L.geoJSON(app.data.counties, {
    style: (feature) => countyFilterStyle(getCountyName(feature)),
    onEachFeature: (feature, layer) => {
      const countyName = getCountyName(feature);
      layer.bindTooltip(countyDisplayName(countyName), {
        direction: "top",
        sticky: true,
        opacity: 0.96,
      });
      bindCountyFilterLayerInteraction(layer, countyName);
    },
  }).addTo(app.countyFilterMap);
  refreshCountyFilterMapStyles();
  app.countyFilterMap.fitBounds(app.countyFilterLayer.getBounds(), {
    padding: [10, 10],
    animate: false,
  });
}

function setCountyFilterOpen(open) {
  $("countyFilterPanel").classList.toggle("hidden", !open);
  $("countyFilterBackdrop").classList.toggle("hidden", !open);
  $("countyFilterButton").setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("county-filter-open", open);
  if (!open) return;
  setSettingsOpen(false);
  initCountyFilterMap();
  requestAnimationFrame(() => {
    app.countyFilterMap?.invalidateSize();
    if (app.countyFilterLayer) {
      app.countyFilterMap.fitBounds(app.countyFilterLayer.getBounds(), {
        padding: [10, 10],
        animate: false,
      });
    }
  });
}

function savePreferences() {
  const prefs = {
    theme: getRadioValue("appTheme", "dark"),
    cursorType: getRadioValue("cursorType", "default"),
    cursorPlayer: getRadioValue("cursorPlayer", "p1"),
  };
  localStorage.setItem("ncMapTrainerPrefs", JSON.stringify(prefs));
}

function applyPreferencesFromControls() {
  applyTheme(getRadioValue("appTheme", "dark"));
  applyCursorStyle(getRadioValue("cursorType", "default"), getRadioValue("cursorPlayer", "p1"));
  savePreferences();
}

function loadPreferences() {
  try {
    const prefs = JSON.parse(localStorage.getItem("ncMapTrainerPrefs") || "{}");
    const oldPlayerOnlyCursor = /^p[1-4]$/.test(prefs.cursor || "");
    const oldManualCursor = ["point", "open", "fist"].includes(prefs.cursorType || "");
    setRadioValue("appTheme", prefs.theme || "dark");
    setRadioValue("cursorType", oldManualCursor || oldPlayerOnlyCursor ? "wii" : (prefs.cursorType || "default"));
    setRadioValue("cursorPlayer", prefs.cursorPlayer || (oldPlayerOnlyCursor ? prefs.cursor : "p1"));
  } catch {
    setRadioValue("appTheme", "dark");
    setRadioValue("cursorType", "default");
    setRadioValue("cursorPlayer", "p1");
  }
  applyPreferencesFromControls();
}

function setSettingsOpen(open) {
  $("settingsPanel").classList.toggle("hidden", !open);
  $("settingsBackdrop").classList.toggle("hidden", !open);
  $("settingsButton").setAttribute("aria-expanded", open ? "true" : "false");
}

function setMapDisplayOpen(open) {
  $("mapDisplayPanel").classList.toggle("hidden", !open);
  $("mapDisplayButton").setAttribute("aria-expanded", open ? "true" : "false");
}

function updateFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement);
  $("fullscreenButton").textContent = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (err) {
    console.error("Fullscreen request failed", err);
  } finally {
    updateFullscreenButton();
  }
}

function updateScore() {
  const accuracy = app.scoreTotal ? Math.round((app.scoreCorrect / app.scoreTotal) * 100) : 0;
  $("scoreBox").textContent = `Score: ${app.scoreCorrect} / ${app.scoreTotal}`;
  $("correctMetric").textContent = app.scoreCorrect;
  $("attemptMetric").textContent = app.scoreTotal;
  $("accuracyMetric").textContent = `${accuracy}%`;
}

function setFeedback(html) {
  $("feedback").innerHTML = html || "";
  updateDockVisibility();
}

function setMapStatus(text) {
  $("mapStatus").textContent = text || "";
}

function countyDisplayName(name) {
  const text = String(name || "").trim();
  if (!text) return "";
  if (/county$/i.test(text)) return text;
  if (text.includes(",")) return `${text} counties`;
  return `${text} County`;
}

function setSelectedCounty(name, state = "", label = "County", detail = "") {
  const node = $("selectedCounty");
  if (!name) {
    node.classList.add("hidden");
    node.innerHTML = "";
    updateDockVisibility();
    return;
  }
  node.className = `selected-county ${state}`.trim();
  node.innerHTML = `
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(countyDisplayName(name))}</strong>
    ${detail ? `<em>${escapeHtml(detail)}</em>` : ""}
  `;
  updateDockVisibility();
}

function updateDockVisibility() {
  const panel = $("panel");
  if (!panel) return;
  const hasFeedback = Boolean($("feedback") && $("feedback").textContent.trim());
  const hasSelected = $("selectedCounty") && !$("selectedCounty").classList.contains("hidden");
  const hasTyped = $("typedAnswerBox") && !$("typedAnswerBox").classList.contains("hidden");
  const hasNext = $("nextButton") && !$("nextButton").classList.contains("hidden");
  const hasRestart = $("restartButton") && !$("restartButton").classList.contains("hidden");
  panel.classList.toggle("dock-hidden", !(hasFeedback || hasSelected || hasTyped || hasNext || hasRestart));
}

function updateProgressBar(forceComplete = false) {
  const total = app.sequence.length;
  let completed = Math.min(app.index, total);
  if (getSettings().repeatMisses && app.requiredCountyNames.size) {
    $("progressBar").style.width = `${Math.round((app.completedCountyNames.size / app.requiredCountyNames.size) * 100)}%`;
    return;
  }
  if (forceComplete || app.stage === "answered") completed = Math.min(app.index + 1, total);
  if (app.stage === "finished") completed = total;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  $("progressBar").style.width = `${pct}%`;
}

function modeLabel(mode = app.mode) {
  const useActiveGameState = document.body.classList.contains("in-game") && mode === app.mode;
  if (mode === "learn") return "Learn";
  if (mode === "county") {
    const task = useActiveGameState ? app.countyTask : getRadioValue("countyTask", "pick");
    if (task === "name") return "Name Counties";
    const difficulty = useActiveGameState ? app.countyFinderDifficulty : getSettings().countyFinderDifficulty;
    return `Pick Counties ${difficulty === "easy" ? "Easy" : "Hard"}`;
  }
  if (mode === "seat") {
    const task = useActiveGameState ? app.countyTask : getRadioValue("countyTask", "pick");
    if (task === "ultra") {
      const noMapTask = useActiveGameState ? app.seatNoMapTask : getRadioValue("seatNoMapTask", "county");
      return noMapTask === "seat" ? "No Map: Name County Seat" : "No Map: Name County";
    }
    if (task === "name") return "Name County Seats";
    const difficulty = useActiveGameState ? app.countyFinderDifficulty : getSettings().countyFinderDifficulty;
    return `County Seats ${difficulty === "easy" ? "Easy" : "Hard"}`;
  }
  if (mode === "city") {
    const task = currentCityTask(mode);
    if (task === "ultra") return "No Map: Name County";
    if (task === "name") return "Name Cities";
    return "Pick Cities";
  }
  return "City Hunt";
}

function setModePill() {
  $("modePill").textContent = modeLabel(getSettings().mode);
}

function renderStageSteps(steps, activeIndex = 0, doneCount = 0) {
  $("stageSteps").innerHTML = steps.map((step, idx) => {
    const cls = [
      "stage-step",
      idx === activeIndex ? "active" : "",
      idx < doneCount ? "done" : "",
    ].filter(Boolean).join(" ");
    return `
      <div class="${cls}">
        <span>${idx + 1}</span>
        <strong>${escapeHtml(step)}</strong>
      </div>
    `;
  }).join("");
}

function cityStageSteps() {
  const task = currentCityTask("city");
  if (task === "ultra") return ["Read city", "Type county", "Review"];
  if (task === "name") return ["Study map", "Type city", "Review"];
  return ["Read city", "Click map", "Review"];
}

function setStageVisual(stage) {
  if (stage === "learn") {
    renderStageSteps(["Explore", "Inspect", "Remember"], 0, 0);
    setMapStatus(getSettings().learnAllCities ? "Click any city to pin its details." : "Click a county to reveal its cities.");
  } else if (stage === "cityCounty") {
    renderStageSteps(cityStageSteps(), 0, 0);
    const s = getSettings();
    setMapStatus(s.specificCityPicker ? `Click within ${s.specificCityRadius} miles of the city.` : "Click the county first.");
  } else if (stage === "cityPoint") {
    renderStageSteps(cityStageSteps(), 1, 1);
    setMapStatus(`Click where ${app.current?.name || "this city"} is. Radius: ${getSettings().threshold} miles.`);
  } else if (stage === "cityName") {
    renderStageSteps(cityStageSteps(), 1, 0);
    setMapStatus("Type the city shown on the map.");
  } else if (stage === "ultraHardCounty") {
    renderStageSteps(["Read prompt", "Type answer", "Review"], 1, 0);
    setMapStatus("Type your answer.");
  } else if (stage === "answered") {
    const steps = app.mode === "city" ? cityStageSteps() : ["Answer", "Review", "Next"];
    renderStageSteps(steps, 2, 2);
    setMapStatus("Review the answer, then click anywhere or press Enter to continue.");
    $("nextButton").textContent = "Click anywhere or press Enter";
    app.advanceArmedAt = performance.now() + 180;
  } else if (stage === "finished") {
    renderStageSteps(["Complete", "Restart"], 1, 1);
    setMapStatus("Round complete. Restart with the same settings or quit.");
  } else if (stage === "countyLocate") {
    renderStageSteps(["Read", "Click county", "Review"], 1, 0);
    setMapStatus("Click the named county.");
  } else if (stage === "countyName") {
    renderStageSteps(["Study shape", "Type name", "Review"], 1, 0);
    setMapStatus("Type the highlighted county name.");
  } else if (stage === "countySeatPick") {
    renderStageSteps(["Read seat", "Pick county", "Review"], 1, 0);
    const s = getSettings();
    setMapStatus(s.specificCityPicker ? `Click within ${s.specificCityRadius} miles of the county seat.` : "Click the county for this county seat.");
  } else if (stage === "countySeatName") {
    renderStageSteps(["Study map", "Name seat", "Review"], 1, 0);
    setMapStatus("Type the county seat shown on the map.");
  } else {
    renderStageSteps(["Choose", "Practice", "Review"], 0, 0);
    setMapStatus("Choose a mode and start.");
  }
}

function updateModeButtons() {
  const active = getSettings().mode;
  if (active === "county" && getRadioValue("countyTask", "pick") === "ultra") {
    setRadioValue("countyTask", "pick");
  }
  const countyTask = getRadioValue("countyTask", "pick");
  const cityTask = getRadioValue("cityTask", "pick");
  const cityPickMode = active === "city" && cityTask === "pick";
  const cityNameMode = active === "city" && cityTask === "name";
  const countyTaskMode = usesCountyTaskSettings(active);
  const countySeatMode = isCountySeatMode(active);
  const repeatMissesMode = active === "city" || countyTaskMode;
  const cityPlayableMapMode = cityPickMode || cityNameMode;
  const seatPickMode = countySeatMode && countyTask === "pick";
  const specificPickerVisible = seatPickMode;
  const specificPickerEnabled = $("specificCityPickerInput").checked;
  const showCityOutlineReveal = cityPlayableMapMode;
  const showSeatOutlineReveal = countySeatMode && countyTask !== "ultra";
  updateOrderOptions(active);
  document.querySelectorAll(".mode-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === active);
  });
  $("countyTaskLabel").textContent = countySeatMode ? "County seat challenge" : "County challenge";
  $("countyPickTaskLabel").textContent = "Pick county";
  $("countyNameTaskLabel").textContent = countySeatMode ? "Name county seat" : "Name county";
  $("countyTaskControl").classList.toggle("three-options", countySeatMode);
  $("countyLimitLabel").textContent = countySeatMode ? "County seat limit" : "County limit";
  $("countyLimitInput").placeholder = countySeatMode ? "All county seats" : "All counties";
  $("countyDifficultyLabel").textContent = countySeatMode ? "County seat picker difficulty" : "Pick county difficulty";
  showMenuSection("orderOptions", shouldShowOrderOptions(active), "grid");
  showMenuSection("learnOptions", active === "learn");
  showMenuSection("learnDisplayControl", active === "learn");
  showMenuSection("answerRevealControl", showCityOutlineReveal || showSeatOutlineReveal);
  showMenuSection("cityOptions", active === "city");
  showMenuSection("cityRadiusOption", cityPickMode, "grid");
  showMenuSection("seatStarsOption", cityPickMode, "flex");
  showMenuSection("cityPointTestOption", false, "flex");
  showMenuSection("cityOutlineOption", showCityOutlineReveal, "flex");
  showMenuSection("specificPickerOptions", specificPickerVisible);
  showMenuSection("specificCityRadiusOption", specificPickerVisible && specificPickerEnabled);
  showMenuSection("countyFinderOptions", countyTaskMode);
  showMenuSection("countyPickOptions", countyTaskMode && countyTask === "pick");
  showMenuSection("countyUltraTaskOption", countySeatMode);
  showMenuSection("seatNoMapOptions", countySeatMode && countyTask === "ultra");
  showMenuSection("seatOutlineOption", showSeatOutlineReveal, "flex");
  showMenuSection("repeatMissesOption", repeatMissesMode, "flex");
  showMenuSection("directionOption", $("orderSelect").value !== "random" && shouldShowOrderOptions(active));
  setModePill();
  updateStartAvailability();
}

function updateOrderOptions(mode) {
  const orderSelect = $("orderSelect");
  const previous = orderSelect.value;
  const modeChanged = app.orderMode !== mode;
  app.orderMode = mode;
  const options = mode === "city"
    ? [
      ["alpha", "Alphabetical"],
      ["random", "Random"],
      ["population", "Population"],
      ["founded", "Founded date"],
    ]
    : [
      ["alpha", "Alphabetical"],
      ["random", "Random"],
    ];
  orderSelect.innerHTML = options
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  const optionValues = new Set(options.map(([value]) => value));
  if (modeChanged || !optionValues.has(previous)) {
    if (mode === "city") {
      orderSelect.value = "random";
      $("directionSelect").value = "asc";
    } else if (usesCountyTaskSettings(mode)) {
      orderSelect.value = "random";
      $("directionSelect").value = "asc";
    } else {
      orderSelect.value = optionValues.has(previous) ? previous : "alpha";
      $("directionSelect").value = "asc";
    }
  } else {
    orderSelect.value = previous;
  }
}

function refitCurrentView() {
  if (!app.map || !app.countyLayer) return;
  app.map.invalidateSize();
  if (app.stage === "cityPoint" && app.current) {
    fitCounty(app.current.primary_county || (app.current.counties && app.current.counties[0]));
  } else {
    fitNC();
  }
}

function enterGameMode(options = {}) {
  document.body.classList.add("in-game");
  document.body.classList.toggle("learn-mode", getSettings().mode === "learn");
  document.body.classList.toggle("ultra-hard-mode", isUltraHardMode());
  if (options.preserveMapView) {
    requestAnimationFrame(() => app.map?.invalidateSize());
  } else {
    requestAnimationFrame(refitCurrentView);
  }
}

function exitGameMode() {
  document.body.classList.remove("in-game");
  document.body.classList.remove("learn-mode");
  document.body.classList.remove("ultra-hard-mode");
}

function quitToMenu() {
  setMapDisplayOpen(false);
  if (app.map && app.markerLayer && app.countyLayer) {
    resetVisuals({ clearRetiredSeatDots: true });
    fitNC();
  }
  app.stage = "ready";
  app.current = null;
  $("ultraHardPrompt").textContent = "";
  $("nextButton").classList.add("hidden");
  $("restartButton").classList.add("hidden");
  $("typedAnswerBox").classList.add("hidden");
  setFeedback("");
  setSelectedCounty("");
  $("questionTitle").textContent = "Ready";
  $("questionHelp").textContent = "Start a round from the menu.";
  $("progressText").textContent = "Ready";
  setMapStatus("Choose a game to begin.");
  updateProgressBar();
  exitGameMode();
}

function clearInfo() {
  $("infoCard").classList.add("hidden");
  $("infoCard").innerHTML = "";
}

function learnCityKey(city) {
  return cityQuestionKey(city);
}

function isLearnCitySelected(city) {
  return app.learnSelectedCityKey && app.learnSelectedCityKey === learnCityKey(city);
}

function showInfoForCity(city, resultHtml = "") {
  const founded = city.founded_date ? `${city.founded_date}${city.founded_year ? ` (${city.founded_year})` : ""}` : "Unknown";
  const pop = city.population ? `${fmtNum(city.population)}${city.population_year ? ` (${city.population_year})` : ""}` : "Unknown";
  const seat = city.is_county_seat ? `Yes${city.county_seat_of ? ` - ${city.county_seat_of} County` : ""}` : "No";
  $("infoCard").innerHTML = `
    <h3>${escapeHtml(city.name)}${city.is_county_seat ? " ★" : ""}</h3>
    ${resultHtml ? `<p>${resultHtml}</p>` : ""}
    <dl>
      <dt>Type</dt><dd>${escapeHtml(city.type || "Unknown")}</dd>
      <dt>County</dt><dd>${escapeHtml((city.counties || []).join(", ") || city.primary_county || "Unknown")}</dd>
      <dt>Population</dt><dd>${escapeHtml(pop)}</dd>
      <dt>Founded</dt><dd>${escapeHtml(founded)}</dd>
      <dt>County seat</dt><dd>${escapeHtml(seat)}</dd>
      <dt>Coordinates</dt><dd>${city.lat.toFixed(4)}, ${city.lon.toFixed(4)}</dd>
    </dl>
  `;
  $("infoCard").classList.remove("hidden");
}

function shouldKeepRetiredSeatDots() {
  return app.mode === "seat" && app.countyTask === "pick" && isEasyCountyFinderMode();
}

function clearRetiredSeatDots() {
  if (app.retiredMarkerLayer) app.retiredMarkerLayer.clearLayers();
  app.retiredSeatMarkers.clear();
}

function rebuildRetiredSeatTargets() {
  if (!shouldKeepRetiredSeatDots()) return;
  const retiredResults = [...app.retiredCountyResults.entries()];
  clearRetiredSeatDots();
  for (const [county, result] of retiredResults) {
    const seat = countySeatForCounty(county);
    if (seat) retainCountySeatPoint(seat, result);
  }
}

function refreshCountySeatTargetDisplay() {
  rebuildRetiredSeatTargets();
  if (app.stage !== "countySeatName" || !app.current || !app.markerLayer) return;
  app.markerLayer.clearLayers();
  drawCountySeatPromptTarget(app.current, "County seat location");
  refreshOverlayOrder();
}

function setCityOutlineGroupStyle(group, city, options = {}) {
  if (!group) return;
  const style = cityOutlineStyle(city, options);
  group.eachLayer?.((layer) => {
    if (layer.setStyle) layer.setStyle(style);
  });
}

function clearLearnCitySelection(options = {}) {
  if (app.learnSelectedCityNode) {
    app.learnSelectedCityNode.classList.remove("selected");
  }
  if (app.learnSelectedCityOutline && app.learnSelectedCity) {
    setCityOutlineGroupStyle(app.learnSelectedCityOutline, app.learnSelectedCity, { learn: true });
  }
  if (app.learnSelectedCityHighlight && app.markerLayer) {
    app.markerLayer.removeLayer(app.learnSelectedCityHighlight);
  }
  app.learnSelectedCityKey = "";
  app.learnSelectedCity = null;
  app.learnSelectedCityNode = null;
  app.learnSelectedCityOutline = null;
  app.learnSelectedCityHighlight = null;
  if (options.clearInfo) clearInfo();
}

function clearLearnDots() {
  app.learnDots = [];
  if (app.learnDotsLayer) app.learnDotsLayer.replaceChildren();
}

function resetVisuals(options = {}) {
  clearLearnCitySelection();
  clearInfo();
  setSelectedCounty("");
  app.selectedCounty = null;
  app.hoveredCountyName = null;
  app.hoveredCountyLayer = null;
  app.markerLayer.clearLayers();
  clearLearnDots();
  if (options.clearRetiredSeatDots || !shouldKeepRetiredSeatDots()) clearRetiredSeatDots();
  app.countyLayer.eachLayer((layer) => app.countyLayer.resetStyle(layer));
  applyRetiredCountyStyles();
  applyLearnKnownCountyStyles();
  refreshWater();
  refreshHighways();
}

function countyFinderResultStyle(result) {
  return result === "correct" ? correctStyle : wrongStyle;
}

function applyRetiredCountyStyles() {
  if (!app.countyLayer || !isEasyCountyFinderMode()) return;
  for (const [county, result] of app.retiredCountyResults.entries()) {
    const layer = getCountyLayer(county);
    if (layer) layer.setStyle(countyFinderResultStyle(result));
  }
}

function isLearnKnownCounty(countyName) {
  return app.knownCountyNames.has(norm(countyName));
}

function learnCountyTotals() {
  const features = app.data?.counties?.features || [];
  let known = 0;
  for (const feature of features) {
    if (isLearnKnownCounty(feature.properties.name || feature.properties.NAME)) known += 1;
  }
  return { known, total: features.length };
}

function updateLearnKnownProgress() {
  if (app.stage !== "learn") return;
  const { known, total } = learnCountyTotals();
  $("progressText").textContent = known ? `Known ${known}/${total}` : "Explore";
}

function restoreCountyStyle(countyName, layer, options = {}) {
  if (!layer || !app.countyLayer) return;
  const isCurrent = norm(app.current) === norm(countyName);

  if (app.stage === "learn") {
    if (options.hover) {
      layer.setStyle(hoverCountyStyle);
    } else if (isLearnKnownCounty(countyName)) {
      layer.setStyle(correctStyle);
    } else if (isCurrent) {
      layer.setStyle(targetStyle);
    } else {
      app.countyLayer.resetStyle(layer);
    }
    return;
  }

  if (app.stage === "countyName" && isCurrent) {
    layer.setStyle(targetStyle);
  } else if (app.stage === "cityName" && isCurrentCityCountyName(countyName)) {
    layer.setStyle(targetStyle);
  } else if (app.stage === "countySeatName" && norm(seatCountyName(app.current)) === norm(countyName)) {
    layer.setStyle(targetStyle);
  } else if (app.stage === "countyLocate" && isEasyCountyFinderMode() && app.retiredCountyResults.has(countyName)) {
    layer.setStyle(countyFinderResultStyle(app.retiredCountyResults.get(countyName)));
  } else if (app.stage === "countySeatPick" && isEasyCountyFinderMode() && app.retiredCountyResults.has(countyName)) {
    layer.setStyle(countyFinderResultStyle(app.retiredCountyResults.get(countyName)));
  } else if (["cityCounty", "cityPoint", "cityName", "countyLocate", "countyName", "countySeatPick", "countySeatName"].includes(app.stage)) {
    app.countyLayer.resetStyle(layer);
  }
}

function isCountyHoverStage() {
  return ["learn", "cityCounty", "cityPoint", "cityName", "countyLocate", "countyName", "countySeatPick", "countySeatName"].includes(app.stage);
}

function applyCountyHoverStyle(countyName, layer) {
  if (!layer || !isCountyHoverStage()) return;
  if (app.stage === "learn") {
    restoreCountyStyle(countyName, layer, { hover: true });
  } else {
    layer.setStyle(hoverCountyStyle);
  }
}

function clearHoveredCounty() {
  const previousName = app.hoveredCountyName;
  const previousLayer = app.hoveredCountyLayer;
  app.hoveredCountyName = null;
  app.hoveredCountyLayer = null;
  if (previousName && previousLayer) restoreCountyStyle(previousName, previousLayer);
}

function setHoveredCounty(countyName, layer, options = {}) {
  if (!isCountyHoverStage()) {
    clearHoveredCounty();
    return;
  }
  if (!countyName || !layer) {
    clearHoveredCounty();
    return;
  }
  if (app.hoveredCountyLayer === layer && !options.force) {
    applyCountyHoverStyle(countyName, layer);
    return;
  }
  clearHoveredCounty();
  app.hoveredCountyName = countyName;
  app.hoveredCountyLayer = layer;
  applyCountyHoverStyle(countyName, layer);
}

function countyFeatureRings(feature) {
  const geometry = feature?.geometry;
  if (!geometry || !Array.isArray(geometry.coordinates)) return [];
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

function computeCountyPickBounds(features) {
  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };
  for (const feature of features) {
    for (const ring of countyFeatureRings(feature)) {
      for (const point of ring) {
        const lng = Number(point?.[0]);
        const lat = Number(point?.[1]);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        bounds.minLng = Math.min(bounds.minLng, lng);
        bounds.minLat = Math.min(bounds.minLat, lat);
        bounds.maxLng = Math.max(bounds.maxLng, lng);
        bounds.maxLat = Math.max(bounds.maxLat, lat);
      }
    }
  }
  return Number.isFinite(bounds.minLng) ? bounds : null;
}

function countyPickColor(index) {
  const key = index + 1;
  const r = key & 255;
  const g = (key >> 8) & 255;
  const b = (key >> 16) & 255;
  return { key, css: `rgb(${r}, ${g}, ${b})` };
}

function countyPickPoint(lng, lat) {
  const bounds = app.countyPickBounds;
  if (!bounds) return null;
  return {
    x: (lng - bounds.minLng) * bounds.scale + 1,
    y: (bounds.maxLat - lat) * bounds.scale + 1,
  };
}

function drawCountyFeatureToPickCanvas(ctx, feature, color) {
  ctx.beginPath();
  for (const ring of countyFeatureRings(feature)) {
    if (!Array.isArray(ring) || ring.length < 3) continue;
    let started = false;
    for (const point of ring) {
      const lng = Number(point?.[0]);
      const lat = Number(point?.[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      const canvasPoint = countyPickPoint(lng, lat);
      if (!canvasPoint) continue;
      if (!started) {
        ctx.moveTo(canvasPoint.x, canvasPoint.y);
        started = true;
      } else {
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      }
    }
    if (started) ctx.closePath();
  }
  ctx.fillStyle = color.css;
  ctx.fill("evenodd");
}

function buildCountyPickIndex() {
  const features = app.data?.counties?.features || [];
  const dataBounds = computeCountyPickBounds(features);
  if (!features.length || !dataBounds) return;

  const lngSpan = Math.max(0.01, dataBounds.maxLng - dataBounds.minLng);
  const latSpan = Math.max(0.01, dataBounds.maxLat - dataBounds.minLat);
  const maxWidth = 4096;
  const maxHeight = 2300;
  const scale = Math.min(maxWidth / lngSpan, maxHeight / latSpan);
  const width = Math.ceil(lngSpan * scale) + 3;
  const height = Math.ceil(latSpan * scale) + 3;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) || canvas.getContext("2d");
  if (!ctx) return;

  app.countyPickCanvas = canvas;
  app.countyPickContext = ctx;
  app.countyPickBounds = { ...dataBounds, scale, width, height };
  app.countyPickColorMap = new Map();
  ctx.clearRect(0, 0, width, height);

  features.forEach((feature, index) => {
    const color = countyPickColor(index);
    const name = getCountyName(feature);
    app.countyPickColorMap.set(color.key, {
      name,
      feature,
      layer: getCountyLayer(name),
    });
    drawCountyFeatureToPickCanvas(ctx, feature, color);
  });
}

function countyAtLatLng(latlng) {
  const ctx = app.countyPickContext;
  const bounds = app.countyPickBounds;
  if (!ctx || !bounds || !latlng) return null;
  const lng = Number(latlng.lng);
  const lat = Number(latlng.lat);
  if (
    !Number.isFinite(lng)
    || !Number.isFinite(lat)
    || lng < bounds.minLng
    || lng > bounds.maxLng
    || lat < bounds.minLat
    || lat > bounds.maxLat
  ) {
    return null;
  }

  const point = countyPickPoint(lng, lat);
  if (!point) return null;
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  const samples = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ];

  for (const [dx, dy] of samples) {
    const sx = x + dx;
    const sy = y + dy;
    if (sx < 0 || sy < 0 || sx >= bounds.width || sy >= bounds.height) continue;
    const [r, g, b] = ctx.getImageData(sx, sy, 1, 1).data;
    const key = r + (g << 8) + (b << 16);
    const hit = app.countyPickColorMap.get(key);
    if (hit?.layer) return hit;
  }
  return null;
}

function syncHoveredCountyFromLatLng(latlng) {
  app.countyHoverFrame = 0;
  if (!isCountyHoverStage()) {
    clearHoveredCounty();
    return;
  }
  const hit = countyAtLatLng(latlng);
  if (hit) {
    setHoveredCounty(hit.name, hit.layer);
  } else {
    clearHoveredCounty();
  }
}

function scheduleHoveredCountySync(latlng) {
  app.pendingCountyHoverLatLng = latlng;
  if (app.countyHoverFrame) return;
  app.countyHoverFrame = requestAnimationFrame(() => {
    syncHoveredCountyFromLatLng(app.pendingCountyHoverLatLng);
  });
}

function applyLearnKnownCountyStyles() {
  if (!app.countyLayer || app.stage !== "learn") return;
  app.countyLayer.eachLayer((layer) => {
    const name = getCountyName(layer);
    if (isLearnKnownCounty(name)) layer.setStyle(correctStyle);
  });
  updateLearnKnownProgress();
}

function isTextEntryTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || ["input", "textarea", "select"].includes(tagName);
}

function toggleHoveredLearnCountyKnown(event) {
  if (event.key.toLowerCase() !== "k" || event.metaKey || event.ctrlKey || event.altKey) return;
  if (app.stage !== "learn" || isTextEntryTarget(event.target)) return;

  const countyName = app.hoveredCountyName;
  const layer = app.hoveredCountyLayer || getCountyLayer(countyName);
  if (!countyName || !layer) return;

  event.preventDefault();
  const key = norm(countyName);
  const nextKnown = !app.knownCountyNames.has(key);
  if (nextKnown) {
    app.knownCountyNames.add(key);
  } else {
    app.knownCountyNames.delete(key);
  }

  restoreCountyStyle(countyName, layer, { hover: true });
  updateLearnKnownProgress();
  setFeedback(`${escapeHtml(countyDisplayName(countyName))} ${nextKnown ? "marked known" : "unmarked"}.`);
}

function hasCityCoordinates(city) {
  return Number.isFinite(Number(city?.lat)) && Number.isFinite(Number(city?.lon));
}

function isLearnSeatHighlighted(city) {
  return Boolean(city?.is_county_seat && getSettings().learnHighlightSeats);
}

function learnCityLabel(city) {
  return `${city.name}${isLearnSeatHighlighted(city) ? " ★" : ""}`;
}

function allLearnCities() {
  const cities = app.data.cities.filter(hasCityCoordinates);
  const seen = new Set(cities.map((city) => norm(city.name)));
  for (const fallback of countySeatFallbacks) {
    if (seen.has(norm(fallback.name)) || !hasCityCoordinates(fallback)) continue;
    cities.push(fallback);
    seen.add(norm(fallback.name));
  }
  return cities;
}

function citiesForCounty(countyName) {
  const countyKey = norm(countyName);
  const cities = app.data.cities.filter((city) => {
    if (!hasCityCoordinates(city)) return false;
    const counties = (city.counties || []).map(norm);
    return counties.includes(countyKey) || norm(city.primary_county) === countyKey;
  });
  for (const fallback of countySeatFallbacks) {
    if (norm(seatCountyName(fallback)) !== countyKey) continue;
    if (!cities.some((city) => norm(city.name) === norm(fallback.name))) cities.push(fallback);
  }
  return cities;
}

function countySeatForCounty(countyName) {
  const countyKey = norm(countyName);
  return countySeatRecords().find((city) => norm(seatCountyName(city)) === countyKey);
}

function updateLearnDotPositions() {
  app.learnDotsFrame = 0;
  if (!app.map || !app.learnDots.length) return;
  for (const { node, latLng } of app.learnDots) {
    const point = app.map.latLngToContainerPoint(latLng);
    node.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -50%)`;
  }
}

function scheduleLearnDotUpdate() {
  if (!app.learnDots.length || app.learnDotsFrame) return;
  app.learnDotsFrame = requestAnimationFrame(updateLearnDotPositions);
}

function addLearnDot(city, label) {
  if (!app.learnDotsLayer) return;
  const lat = Number(city.lat);
  const lng = Number(city.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const node = document.createElement("button");
  node.type = "button";
  const highlightSeat = isLearnSeatHighlighted(city);
  node.className = `learn-map-dot${highlightSeat ? " seat" : ""}`;
  node.dataset.label = label;
  node.setAttribute("aria-label", label);
  if (highlightSeat) node.textContent = "★";
  node.addEventListener("mouseenter", () => showLearnCityInfo(city));
  node.addEventListener("focus", () => showLearnCityInfo(city));
  node.addEventListener("mouseleave", () => {
    if (!app.learnSelectedCityKey) clearInfo();
  });
  node.addEventListener("blur", () => {
    if (!app.learnSelectedCityKey) clearInfo();
  });
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectLearnCity(city, { node });
  });
  const tooltip = document.createElement("span");
  tooltip.className = "learn-map-tooltip";
  tooltip.textContent = label;
  node.appendChild(tooltip);
  app.learnDotsLayer.appendChild(node);
  app.learnDots.push({ node, latLng: L.latLng(lat, lng) });
}

function showLearnCityInfo(city, options = {}) {
  if (!options.force && app.learnSelectedCityKey && !isLearnCitySelected(city)) return;
  const county = city.county_seat_of || city.primary_county || (city.counties && city.counties[0]);
  showInfoForCity(city, city.is_county_seat
    ? `<span class="good">County seat.</span> Seat of ${escapeHtml(countyDisplayName(county))}.`
    : `<span class="good">Learn mode.</span> ${escapeHtml(city.name)} details.`);
}

function selectLearnCity(city, options = {}) {
  const nextKey = learnCityKey(city);
  clearLearnCitySelection();
  app.learnSelectedCityKey = nextKey;
  app.learnSelectedCity = city;
  app.learnSelectedCityNode = options.node || null;
  app.learnSelectedCityOutline = options.outlineLayer || null;
  app.learnSelectedCityNode?.classList.add("selected");

  if (app.learnSelectedCityOutline) {
    setCityOutlineGroupStyle(app.learnSelectedCityOutline, city, { learn: true, selected: true });
    bringToFrontSafe(app.learnSelectedCityOutline);
  } else {
    app.learnSelectedCityHighlight = drawLearnSelectedCityHighlight(city);
  }

  showLearnCityInfo(city, { force: true });
}

function renderLearnCities(cities) {
  const showOutlines = getSettings().learnCityOutlines;
  for (const city of cities) {
    const label = learnCityLabel(city);
    if (!showOutlines || !drawCityOutline(city, label, { learn: true })) {
      addLearnDot(city, label);
    }
  }
}

function showLearnAllCities() {
  if (app.stage !== "learn") return;
  app.current = null;
  app.selectedCounty = null;
  clearLearnCitySelection();
  clearInfo();
  app.markerLayer.clearLayers();
  clearLearnDots();
  app.countyLayer.eachLayer((layer) => app.countyLayer.resetStyle(layer));
  applyLearnKnownCountyStyles();

  const cities = allLearnCities();
  const showOutlines = getSettings().learnCityOutlines;
  renderLearnCities(cities);

  $("questionTitle").textContent = "All Cities";
  $("questionHelp").textContent = `${cities.length} places shown. Click a ${showOutlines ? "city outline" : "dot"} to pin its details.`;
  setFeedback("");
  setSelectedCounty("");
  setStageVisual("learn");
  updateLearnKnownProgress();
  updateLearnDotPositions();
  refreshWater();
  refreshHighways();
}

function refreshLearnDisplay() {
  if (app.stage !== "learn") return;
  if (getSettings().learnAllCities) {
    showLearnAllCities();
  } else if (app.current) {
    showLearnCounty(app.current, getCountyLayer(app.current));
  } else {
    startLearnMode();
  }
}

function showLearnCounty(countyName, countyLayer) {
  if (app.stage !== "learn") return;
  app.current = countyName;
  app.selectedCounty = countyName;
  clearLearnCitySelection();
  clearInfo();
  app.markerLayer.clearLayers();
  clearLearnDots();
  app.countyLayer.eachLayer((layer) => app.countyLayer.resetStyle(layer));
  applyLearnKnownCountyStyles();
  restoreCountyStyle(countyName, countyLayer);

  const cities = citiesForCounty(countyName);
  const countySeat = countySeatForCounty(countyName);
  const seatText = countySeat ? `County seat: ${countySeat.name}` : "County seat: unknown";
  const showOutlines = getSettings().learnCityOutlines;
  renderLearnCities(cities);

  $("questionTitle").textContent = countySeat
    ? `${countyDisplayName(countyName)} - County Seat: ${countySeat.name}`
    : `${countyDisplayName(countyName)} - County Seat: Unknown`;
  $("questionHelp").textContent = `${cities.length} places. ${seatText}. Click a ${showOutlines ? "city outline" : "dot"} to pin its details.`;
  setFeedback("");
  setSelectedCounty(countyName, "", "County", `${seatText} - ${cities.length} places ${showOutlines ? "outlined" : "shown"}`);
  $("selectedCounty").querySelector("em")?.classList.add("seat-detail");
  setStageVisual("learn");
  updateLearnKnownProgress();
  updateLearnDotPositions();
  refreshWater();
  refreshHighways();
}

function getCountyName(featureOrLayer) {
  const props = featureOrLayer.feature ? featureOrLayer.feature.properties : featureOrLayer.properties;
  return props.name || props.NAME;
}

function getCountyLayer(name) {
  return app.countyLayersByName.get(norm(name));
}

function moveToBounds(bounds, options = {}) {
  if (!app.map) return;
  const padded = options.pad ? bounds.pad(options.pad) : bounds;
  const mapOptions = {
    paddingTopLeft: options.paddingTopLeft || [28, 96],
    paddingBottomRight: options.paddingBottomRight || [28, 96],
    maxZoom: options.maxZoom,
    animate: options.animate !== false,
    duration: options.duration ?? 0.5,
    easeLinearity: options.easeLinearity ?? 0.12,
  };
  app.map.fitBounds(padded, mapOptions);
}

function fitNC() {
  moveToBounds(app.countyLayer.getBounds(), {
    paddingTopLeft: [24, 92],
    paddingBottomRight: [24, 82],
  });
}

function fitCounty(name) {
  const layer = getCountyLayer(name);
  if (!layer) return fitNC();
  moveToBounds(layer.getBounds(), {
    pad: 0.16,
    paddingTopLeft: [32, 110],
    paddingBottomRight: [32, 118],
    maxZoom: 10,
    duration: 0.48,
  });
}

function fitResultPoints(points) {
  const bounds = L.latLngBounds(points);
  moveToBounds(bounds, {
    pad: 0.28,
    paddingTopLeft: [36, 104],
    paddingBottomRight: [36, 132],
    maxZoom: 9,
    duration: 0.48,
  });
}

function installImageLikeWheelZoom() {
  const map = app.map;
  const container = map.getContainer();
  let wheelFrame = 0;
  let pendingDelta = 0;
  let lastWheelEvent = null;

  const normalizeWheelDelta = (event) => {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
    return event.deltaY;
  };

  const clampZoom = (zoom) => {
    const minZoom = Number.isFinite(map.getMinZoom()) ? map.getMinZoom() : 5;
    const maxZoom = Number.isFinite(map.getMaxZoom()) ? map.getMaxZoom() : 13;
    return Math.min(maxZoom, Math.max(minZoom, zoom));
  };

  const applyWheelZoom = () => {
    wheelFrame = 0;
    if (!lastWheelEvent || !document.body.classList.contains("in-game")) {
      pendingDelta = 0;
      return;
    }

    const point = map.mouseEventToContainerPoint(lastWheelEvent);
    const zoomChange = -pendingDelta / 180;
    pendingDelta = 0;
    if (Math.abs(zoomChange) < 0.002) return;

    map.setZoomAround(point, clampZoom(map.getZoom() + zoomChange), {
      animate: false,
    });
  };

  container.addEventListener("wheel", (event) => {
    if (!document.body.classList.contains("in-game")) return;
    event.preventDefault();
    event.stopPropagation();
    pendingDelta += normalizeWheelDelta(event);
    lastWheelEvent = event;
    if (!wheelFrame) wheelFrame = requestAnimationFrame(applyWheelZoom);
  }, { passive: false });
}

function bringToFrontSafe(layer) {
  if (!layer) return;
  if (typeof layer.bringToFront === "function") {
    layer.bringToFront();
    return;
  }
  if (typeof layer.eachLayer === "function") {
    layer.eachLayer((child) => {
      if (child && typeof child.bringToFront === "function") child.bringToFront();
    });
  }
}

function isLayerVisible(layer) {
  return Boolean(app.map && layer && app.map.hasLayer(layer));
}

function highwayFeatureStyle(feature) {
  const type = feature?.properties?.route_type || "";
  if (type === "I") {
    return { ...highwayStyle, weight: highwayStyle.weight + 0.7, opacity: Math.min(0.8, highwayStyle.opacity + 0.16) };
  }
  if (type === "U") {
    return { ...highwayStyle, weight: highwayStyle.weight + 0.25, opacity: Math.min(0.72, highwayStyle.opacity + 0.08) };
  }
  if (type === "S") {
    return { ...highwayStyle, weight: Math.max(1, highwayStyle.weight - 0.25), opacity: Math.max(0.42, highwayStyle.opacity - 0.06) };
  }
  return highwayStyle;
}

function selectedHighwayTypes() {
  return [...document.querySelectorAll(".highway-type-input:checked")]
    .map((input) => input.dataset.highwayType)
    .filter((type) => highwayTypes.includes(type));
}

function syncHighwayTypeMenu() {
  const enabled = $("highwaysInput").checked;
  $("highwayTypeMenu").classList.toggle("hidden", !enabled);
  document.querySelectorAll(".highway-type-input").forEach((input) => {
    input.disabled = !enabled;
  });
}

function refreshHighwayLayerStyles() {
  app.highwayLayersByType?.forEach((layer) => layer.setStyle(highwayFeatureStyle));
}

function waterFeatureStyle(feature) {
  const kind = feature?.properties?.water_kind || "area";
  return kind === "river"
    ? { ...waterLineStyle, fillOpacity: 0 }
    : waterAreaStyle;
}

async function ensureWaterLayer() {
  if (app.waterLayer) return true;
  if (app.waterLoading) return app.waterLoading;
  if (!app.map) return false;

  app.waterLoading = fetch("/api/water")
    .then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      const water = await res.json();
      app.waterLayer = L.geoJSON(water || { type: "FeatureCollection", features: [] }, {
        renderer: app.mapRenderer,
        smoothFactor: 1.4,
        style: waterFeatureStyle,
        interactive: false,
      });
      return true;
    })
    .catch((err) => {
      console.error("Could not load water layer", err);
      $("waterInput").checked = false;
      return false;
    })
    .finally(() => {
      app.waterLoading = null;
    });

  return app.waterLoading;
}

function refreshOverlayOrder() {
  if (isLayerVisible(app.waterLayer)) bringToFrontSafe(app.waterLayer);
  if (isLayerVisible(app.highwayLayer)) bringToFrontSafe(app.highwayLayer);
  bringToFrontSafe(app.countyBorderLayer);
  bringToFrontSafe(app.retiredMarkerLayer);
  bringToFrontSafe(app.markerLayer);
  bringToFrontSafe(app.targetLayer);
}

function refreshHighways() {
  if (!app.map || !app.highwayLayer) return;
  const shouldShow = $("highwaysInput").checked;
  syncHighwayTypeMenu();
  app.highwayLayer.clearLayers();
  if (shouldShow) {
    const selectedTypes = new Set(selectedHighwayTypes());
    for (const type of highwayTypes) {
      const layer = app.highwayLayersByType.get(type);
      if (layer && selectedTypes.has(type)) app.highwayLayer.addLayer(layer);
    }
  }
  if (shouldShow && !app.map.hasLayer(app.highwayLayer)) {
    app.highwayLayer.addTo(app.map);
  } else if (!shouldShow && app.map.hasLayer(app.highwayLayer)) {
    app.map.removeLayer(app.highwayLayer);
  }
  refreshOverlayOrder();
}

async function refreshWater() {
  if (!app.map) return;
  const shouldShow = $("waterInput").checked;
  if (!shouldShow) {
    if (app.waterLayer && app.map.hasLayer(app.waterLayer)) app.map.removeLayer(app.waterLayer);
    refreshOverlayOrder();
    return;
  }
  const loaded = await ensureWaterLayer();
  if (!loaded || !$("waterInput").checked || !app.waterLayer) return;
  if (!app.map.hasLayer(app.waterLayer)) {
    app.waterLayer.addTo(app.map);
  }
  refreshOverlayOrder();
}

function sortRecords(records, order, direction) {
  const arr = [...records];
  if (order === "random") return shuffle(arr);

  const dir = direction === "desc" ? -1 : 1;
  arr.sort((a, b) => {
    if (order === "population") {
      const ap = numericValue(a.population);
      const bp = numericValue(b.population);
      const am = ap === null;
      const bm = bp === null;
      if (am !== bm) return am ? 1 : -1;
      if (am && bm) return String(a.name).localeCompare(String(b.name));
      return (ap - bp) * dir;
    }
    if (order === "founded") {
      const am = !a.founded_date;
      const bm = !b.founded_date;
      if (am !== bm) return am ? 1 : -1;
      return String(a.founded_date).localeCompare(String(b.founded_date)) * dir;
    }
    return String(a.name).localeCompare(String(b.name)) * dir;
  });
  return arr;
}

function sortCountyNames(names, order, direction) {
  const arr = [...names];
  if (order === "random") return shuffle(arr);
  const dir = direction === "desc" ? -1 : 1;
  return arr.sort((a, b) => String(a).localeCompare(String(b)) * dir);
}

function cityQuestionKey(city) {
  if (!city) return "";
  const lat = Number(city.lat);
  const lon = Number(city.lon);
  const coord = Number.isFinite(lat) && Number.isFinite(lon) ? `${lat.toFixed(6)},${lon.toFixed(6)}` : "";
  return `city:${norm(city.name)}:${coord}`;
}

function recordRepeatProgress(correct, item, key) {
  if (!key) return;
  if (correct) {
    app.completedCountyNames.add(key);
  } else if (getSettings().repeatMisses && !app.completedCountyNames.has(key)) {
    app.sequence.push(item);
  }
}

function seatCountyName(seat) {
  return seat?.county_seat_of || seat?.primary_county || (seat?.counties && seat.counties[0]) || "";
}

function prepareCityOutlines() {
  app.cityOutlinesByGeoid = new Map();
  for (const feature of app.data?.city_outlines?.features || []) {
    const geoid = feature?.properties?.geoid || feature?.properties?.GEOID;
    if (geoid) app.cityOutlinesByGeoid.set(String(geoid), feature);
  }
}

function cityOutlineFeature(city) {
  const geoid = city?.place_geoid;
  return geoid ? app.cityOutlinesByGeoid.get(String(geoid)) : null;
}

function cityOutlineStyle(city, options = {}, hovered = false) {
  const isSeat = options.seat || (city?.is_county_seat && (!options.learn || getSettings().learnHighlightSeats));
  const baseColor = isSeat ? "#f59e0b" : "#38bdf8";
  const strokeColor = options.correct === false ? "#fb7185" : baseColor;
  if (options.selected) {
    return {
      color: hovered ? "#ffffff" : "#f8fafc",
      weight: isSeat ? 4.4 : 4,
      opacity: 1,
      fillColor: baseColor,
      fillOpacity: hovered ? 0.46 : 0.38,
      dashArray: null,
    };
  }
  return {
    color: hovered ? "#f8fafc" : strokeColor,
    weight: (isSeat ? 2.7 : 2.2) + (hovered ? 1.2 : 0),
    opacity: hovered ? 1 : 0.95,
    fillColor: baseColor,
    fillOpacity: hovered ? 0.32 : (options.learn ? 0.18 : 0.22),
    dashArray: options.correct === false && !hovered ? "8,6" : null,
  };
}

function drawCityOutline(city, label = "", options = {}) {
  const feature = cityOutlineFeature(city);
  const targetLayer = options.targetLayer || app.markerLayer;
  if (!feature || !targetLayer) return false;
  const normalStyle = cityOutlineStyle(city, options, false);
  const hoverStyle = cityOutlineStyle(city, options, true);
  const selectedStyleForCity = cityOutlineStyle(city, { ...options, selected: true }, false);
  const tooltip = label || city.name;
  const infoHtml = Object.prototype.hasOwnProperty.call(options, "infoHtml") ? options.infoHtml : (options.learn
    ? null
    : `<span class="good">${city.is_county_seat ? "County seat outline." : "City outline shown."}</span>`);

  let outline;
  outline = L.geoJSON(feature, {
    renderer: app.mapRenderer,
    interactive: options.interactive !== false,
    bubblingMouseEvents: false,
    style: () => normalStyle,
    onEachFeature: (_feature, layer) => {
      layer.bindTooltip(tooltip, {
        direction: "top",
        sticky: true,
        opacity: 0.96,
      });
      layer.on({
        mouseover: () => {
          layer.setStyle(isLearnCitySelected(city) ? cityOutlineStyle(city, { ...options, selected: true }, true) : hoverStyle);
          if (options.learn) {
            showLearnCityInfo(city);
          } else {
            showInfoForCity(city, infoHtml);
          }
          bringToFrontSafe(layer);
        },
        mouseout: () => {
          layer.setStyle(isLearnCitySelected(city) ? selectedStyleForCity : normalStyle);
          if (options.learn && !app.learnSelectedCityKey) clearInfo();
        },
        click: (event) => {
          if (event?.originalEvent) L.DomEvent.stop(event.originalEvent);
          if (options.learn) {
            selectLearnCity(city, { outlineLayer: outline });
          } else {
            showInfoForCity(city, infoHtml);
          }
        },
      });
    },
  });
  outline.addTo(targetLayer);
  bringToFrontSafe(targetLayer);
  return outline;
}

function drawLearnSelectedCityHighlight(city) {
  const feature = cityOutlineFeature(city);
  if (!feature || !app.markerLayer) return null;
  const highlight = L.geoJSON(feature, {
    renderer: app.mapRenderer,
    interactive: false,
    style: () => cityOutlineStyle(city, { learn: true, selected: true }),
  });
  highlight.addTo(app.markerLayer);
  bringToFrontSafe(app.markerLayer);
  return highlight;
}

function countySeatRecords() {
  const records = app.data.cities.filter((city) => (
    city.is_county_seat
    && seatCountyName(city)
    && Number.isFinite(Number(city.lat))
    && Number.isFinite(Number(city.lon))
  ));
  const existingCounties = new Set(records.map((city) => norm(seatCountyName(city))));
  for (const fallback of countySeatFallbacks) {
    if (!existingCounties.has(norm(seatCountyName(fallback)))) records.push(fallback);
  }
  return records;
}

function sortCountySeatRecords(records, order, direction) {
  const arr = [...records];
  if (order === "random") return shuffle(arr);
  const dir = direction === "desc" ? -1 : 1;
  return arr.sort((a, b) => {
    const byCounty = seatCountyName(a).localeCompare(seatCountyName(b)) * dir;
    if (byCounty) return byCounty;
    return String(a.name).localeCompare(String(b.name)) * dir;
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSequence() {
  const s = getSettings();
  app.mode = s.mode;
  app.cityTask = s.cityTask;
  app.countyTask = s.countyTask;
  app.seatNoMapTask = s.seatNoMapTask;
  app.countyFinderDifficulty = s.countyFinderDifficulty;
  setModePill();
  app.requiredCountyNames = new Set();
  app.completedCountyNames = new Set();
  app.retiredCountyResults = new Map();
  clearRetiredSeatDots();
  if (s.mode === "learn") {
    app.sequence = [];
  } else if (s.mode === "city") {
    const usable = app.data.cities.filter((city) => (
      Number.isFinite(Number(city.lat))
      && Number.isFinite(Number(city.lon))
      && cityMatchesCountyFilter(city)
    ));
    const sorted = sortRecords(usable, s.order, s.direction);
    app.sequence = s.cityLimit ? sorted.slice(0, s.cityLimit) : sorted;
    if (s.repeatMisses) app.requiredCountyNames = new Set(app.sequence.map(cityQuestionKey));
  } else if (s.mode === "county") {
    const names = allCountyNames().filter(isQuizCountySelected);
    const sorted = sortCountyNames(names, s.order, s.direction);
    app.sequence = s.countyLimit ? sorted.slice(0, s.countyLimit) : sorted;
    if (s.repeatMisses || s.countyTask === "pick") app.requiredCountyNames = new Set(app.sequence);
  } else if (s.mode === "seat") {
    const filteredSeats = countySeatRecords().filter((seat) => isQuizCountySelected(seatCountyName(seat)));
    const sorted = sortCountySeatRecords(filteredSeats, s.order, s.direction);
    app.sequence = s.countyLimit ? sorted.slice(0, s.countyLimit) : sorted;
    app.requiredCountyNames = new Set(app.sequence.map(seatCountyName));
  } else {
    app.sequence = [];
  }
  app.index = 0;
  app.scoreCorrect = 0;
  app.scoreTotal = 0;
  updateScore();
  updateProgressBar();
}

function currentProgress() {
  if (getSettings().repeatMisses && app.requiredCountyNames.size) {
    return `${app.completedCountyNames.size} of ${app.requiredCountyNames.size} complete`;
  }
  if (!app.sequence.length) return "No questions";
  return `${app.index + 1} of ${app.sequence.length}`;
}

function startQuiz(options = {}) {
  const startOptions = options && typeof options === "object" && !("target" in options) ? options : {};
  const preserveMapView = Boolean(startOptions.preserveMapView && app.map);
  const preservedView = preserveMapView
    ? { center: app.map.getCenter(), zoom: app.map.getZoom() }
    : null;
  if (!app.data || (getSettings().mode !== "learn" && app.quizCountyNames.size === 0)) return;
  buildSequence();
  enterGameMode({ preserveMapView });
  $("nextButton").classList.add("hidden");
  $("restartButton").classList.add("hidden");
  $("typedAnswerBox").classList.add("hidden");
  setFeedback("");
  requestAnimationFrame(() => {
    if (!app.map) {
      initMap();
    } else {
      app.map.invalidateSize();
      if (preservedView) {
        app.map.setView(preservedView.center, preservedView.zoom, { animate: false });
      } else {
        fitNC();
      }
    }
    if (app.mode === "learn") {
      startLearnMode();
    } else {
      nextQuestion();
    }
  });
}

function startLearnMode() {
  resetVisuals();
  app.stage = "learn";
  app.current = null;
  app.answered = false;
  applyLearnKnownCountyStyles();
  $("nextButton").classList.add("hidden");
  $("typedAnswerBox").classList.add("hidden");
  updateLearnKnownProgress();
  if (getSettings().learnAllCities) {
    showLearnAllCities();
    updateProgressBar();
    return;
  }
  $("questionTitle").textContent = "Learn";
  $("questionHelp").textContent = "Click any county.";
  setFeedback("");
  setStageVisual("learn");
  updateProgressBar();
}

function finishRound(message = "") {
  app.stage = "finished";
  resetVisuals();
  $("progressText").textContent = "Finished";
  $("questionTitle").textContent = "Done!";
  $("questionHelp").textContent = message || `Final score: ${app.scoreCorrect} / ${app.scoreTotal}.`;
  $("ultraHardPrompt").textContent = "";
  $("nextButton").classList.add("hidden");
  $("restartButton").classList.remove("hidden");
  $("typedAnswerBox").classList.add("hidden");
  setFeedback("");
  setStageVisual("finished");
  updateProgressBar(true);
  updateDockVisibility();
}

function nextQuestion() {
  app.advanceArmedAt = 0;
  if (app.index >= app.sequence.length) {
    finishRound(`Final score: ${app.scoreCorrect} / ${app.scoreTotal}.`);
    return;
  }
  resetVisuals();
  $("ultraHardPrompt").textContent = "";
  setFeedback("");
  $("nextButton").classList.add("hidden");
  $("restartButton").classList.add("hidden");
  $("nextButton").textContent = "Click anywhere to continue";
  $("typedAnswerBox").classList.add("hidden");
  updateProgressBar();
  if (app.mode === "city") askCityQuestion();
  if (app.mode === "county" && app.countyTask === "pick") askCountyLocateQuestion();
  if (app.mode === "county" && app.countyTask === "name") askCountyNameQuestion();
  if (app.mode === "seat" && app.countyTask === "pick") askCountySeatPickQuestion();
  if (app.mode === "seat" && app.countyTask === "name") askCountySeatNameQuestion();
  if (app.mode === "seat" && app.countyTask === "ultra") askCountySeatUltraHardQuestion();
}

function askCityQuestion() {
  const s = getSettings();
  const city = app.sequence[app.index];
  app.current = city;
  if (app.cityTask === "ultra") {
    askUltraHardCountyQuestion(city, "city");
    return;
  }
  if (app.cityTask === "name") {
    askCityNameQuestion(city);
    return;
  }
  app.stage = "cityPoint";
  app.cityCountyCorrect = true;
  app.answered = false;
  const star = s.showStars && city.is_county_seat ? " ★" : "";
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = `${city.name}${star}`;
  $("questionHelp").textContent = `Click within ${s.threshold} miles of the city.`;
  setStageVisual("cityPoint");
}

function askCityNameQuestion(city) {
  const county = cityPrimaryCounty(city);
  app.current = city;
  app.stage = "cityName";
  app.answered = false;
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = "Name this city";
  $("questionHelp").textContent = "Type the city shown on the map.";
  $("typedAnswerBox").classList.remove("hidden");
  $("countyNameInput").placeholder = "City name";
  $("countyNameInput").value = "";
  const layer = getCountyLayer(county);
  if (layer) layer.setStyle(targetStyle);
  drawCityPromptTarget(city, "City location");
  setStageVisual("cityName");
  setTimeout(() => $("countyNameInput").focus(), 50);
}

function askUltraHardCountyQuestion(item, kind) {
  const config = noMapQuestionConfig(item, kind);
  app.current = item;
  app.stage = "ultraHardCounty";
  app.answered = false;
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = config.prompt;
  $("ultraHardPrompt").textContent = config.prompt;
  $("questionHelp").textContent = config.help;
  $("typedAnswerBox").classList.remove("hidden");
  $("countyNameInput").placeholder = config.placeholder;
  $("countyNameInput").value = "";
  setStageVisual("ultraHardCounty");
  setTimeout(() => $("countyNameInput").focus(), 50);
}

function noMapQuestionConfig(item, kind = app.mode) {
  if (kind === "seat" && app.seatNoMapTask === "seat") {
    const county = seatCountyName(item);
    return {
      prompt: countyDisplayName(county),
      help: "What is this county's seat?",
      placeholder: "County seat name",
      answers: [item.name],
      answerText: item.name,
      resultText: `${item.name} is the county seat of ${countyDisplayName(county)}.`,
    };
  }

  const counties = kind === "seat"
    ? [seatCountyName(item)].filter(Boolean)
    : uniqueCountyNames(cityCountyNames(item));
  const answerText = counties.map(countyDisplayName).join(" / ");
  return {
    prompt: item.name,
    help: kind === "seat" ? "Which county has this county seat?" : "Which county is this city in?",
    placeholder: "County name",
    answers: counties,
    answerText,
    resultText: `${item.name} is in ${answerText}.`,
  };
}

function askCountyLocateQuestion() {
  const county = app.sequence[app.index];
  if (!county) {
    finishRound("No counties left in this round.");
    return;
  }
  app.current = county;
  app.stage = "countyLocate";
  app.answered = false;
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = `${county} County`;
  $("questionHelp").textContent = "Click the county.";
  setStageVisual("countyLocate");
}

function askCountyNameQuestion() {
  const county = app.sequence[app.index];
  app.current = county;
  app.stage = "countyName";
  app.answered = false;
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = "Name this county";
  $("questionHelp").textContent = "Type the highlighted county name.";
  $("typedAnswerBox").classList.remove("hidden");
  $("countyNameInput").placeholder = "County name";
  $("countyNameInput").value = "";
  const layer = getCountyLayer(county);
  if (layer) layer.setStyle(targetStyle);
  setStageVisual("countyName");
  setTimeout(() => $("countyNameInput").focus(), 50);
}

function askCountySeatPickQuestion() {
  const seat = app.sequence[app.index];
  if (!seat) {
    finishRound("No county seats left in this round.");
    return;
  }
  app.current = seat;
  app.stage = "countySeatPick";
  app.answered = false;
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = seat.name;
  const s = getSettings();
  $("questionHelp").textContent = s.specificCityPicker
    ? `Click within ${s.specificCityRadius} miles of this county seat.`
    : "Pick the county that has this county seat.";
  setStageVisual("countySeatPick");
}

function askCountySeatNameQuestion() {
  const seat = app.sequence[app.index];
  const county = seatCountyName(seat);
  app.current = seat;
  app.stage = "countySeatName";
  app.answered = false;
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = countyDisplayName(county);
  $("questionHelp").textContent = "Name the county seat.";
  $("typedAnswerBox").classList.remove("hidden");
  $("countyNameInput").placeholder = "County seat name";
  $("countyNameInput").value = "";
  const layer = getCountyLayer(county);
  if (layer) layer.setStyle(targetStyle);
  drawCountySeatPromptTarget(seat, "County seat location");
  setSelectedCounty(county, "", "County", "Name the seat shown on the map.");
  setStageVisual("countySeatName");
  setTimeout(() => $("countyNameInput").focus(), 50);
}

function askCountySeatUltraHardQuestion() {
  const seat = app.sequence[app.index];
  if (!seat) {
    finishRound("No county seats left in this round.");
    return;
  }
  askUltraHardCountyQuestion(seat, "seat");
}

function onCountyClick(feature, layer, event) {
  if (app.stage === "answered") {
    advanceIfReady(event && event.originalEvent);
    return;
  }
  if (event && event.originalEvent) {
    L.DomEvent.stop(event.originalEvent);
  }
  const hit = event?.latlng ? countyAtLatLng(event.latlng) : null;
  const clicked = hit?.name || getCountyName(feature);
  const clickedLayer = hit?.layer || layer;
  setHoveredCounty(clicked, clickedLayer, { force: true });
  if (app.stage === "cityCounty") {
    handleCityCountyClick(clicked, clickedLayer, event && event.latlng);
  } else if (app.stage === "countyLocate") {
    handleCountyLocateClick(clicked, clickedLayer);
  } else if (app.stage === "learn") {
    if (getSettings().learnAllCities) {
      clearLearnCitySelection({ clearInfo: true });
      return;
    }
    showLearnCounty(clicked, clickedLayer);
  } else if (app.stage === "countySeatPick") {
    handleCountySeatPickClick(clicked, clickedLayer, event && event.latlng);
  } else if (app.stage === "cityPoint" && event && event.latlng) {
    handleCityPointClick(event.latlng);
  }
}

function handleCityCountyClick(clicked, clickedLayer, clickedLatLng) {
  if (app.stage !== "cityCounty") return;
  const city = app.current;
  const s = getSettings();
  const possible = (city.counties || []).map(norm);
  const countyCorrect = possible.includes(norm(clicked)) || norm(clicked) === norm(city.primary_county);
  const specificResult = specificPickerResult(city, clickedLatLng, clickedLayer, s);
  const specificCorrect = !specificResult.enabled || specificResult.correct;
  const questionCorrect = countyCorrect && specificCorrect;
  app.cityCountyCorrect = countyCorrect;
  app.selectedCounty = clicked;

  const zoomCounty = city.primary_county || (city.counties && city.counties[0]) || clicked;
  clickedLayer.setStyle(questionCorrect ? selectedStyle : wrongStyle);
  const targetLayer = getCountyLayer(zoomCounty);
  if (targetLayer) targetLayer.setStyle(questionCorrect ? correctStyle : targetStyle);

  const correctCountyText = (city.counties || [city.primary_county]).filter(Boolean).join(", ");
  if (countyCorrect && s.testCityPoint && !s.specificCityPicker) {
    setSelectedCounty(clicked, "good", "Correct county");
    setFeedback(`<span class="good">County accepted.</span> Now click where ${escapeHtml(city.name)} is within the county.`);
    app.stage = "cityPoint";
    setStageVisual("cityPoint");
    $("questionHelp").textContent = `Place it in ${zoomCounty} County. Radius: ${s.threshold} miles.`;
  } else if (questionCorrect) {
    app.scoreTotal += 1;
    app.scoreCorrect += 1;
    recordRepeatProgress(true, city, cityQuestionKey(city));
    updateScore();
    updateProgressBar(true);
    const revealType = revealCityAnswerTarget(city, `${escapeHtml(city.name)}: exact learning point`);
    const revealText = revealType === "outline"
      ? "City outline shown."
      : revealType === "point"
        ? "Exact point shown."
        : "City outline unavailable.";
    setSelectedCounty(correctCountyText || clicked, "good", "Correct county", revealText);
    setFeedback(`<span class="good">Correct county.</span> ${escapeHtml(city.name)} is in <b>${escapeHtml(countyDisplayName(correctCountyText || clicked))}</b>.`);
    showInfoForCity(city, `<span class="good">County correct.</span> ${escapeHtml(revealText)}`);
    $("questionHelp").textContent = revealText;
    $("nextButton").classList.remove("hidden");
    app.stage = "answered";
    app.answered = true;
    setStageVisual("answered");
  } else {
    app.scoreTotal += 1;
    recordRepeatProgress(false, city, cityQuestionKey(city));
    updateScore();
    updateProgressBar(true);
    const missDetail = countyCorrect && specificResult.enabled && specificResult.distance !== undefined
      ? `Your click was ${specificResult.distance.toFixed(1)} miles away.`
      : `You picked ${countyDisplayName(clicked)}.`;
    setSelectedCounty(correctCountyText, "bad", "Correct county", missDetail);
    const result = specificResult.target && specificResult.guess
      ? specificResult
      : clickDistanceToPlace(city, clickedLatLng, clickedLayer);
    const dist = result?.distance ?? 0;
    drawCityResult(result.guess, result.target, {
      correct: false,
      guessLabel: countyCorrect
        ? `Your click: ${dist.toFixed(1)} miles away`
        : `${escapeHtml(clicked)} County pick`,
      targetLabel: `${escapeHtml(city.name)}: exact learning point`,
      showTargetPoint: !s.cityOutlines,
      radiusMiles: specificResult.enabled ? specificResult.radius : null,
    });
    if (s.cityOutlines) {
      drawCityOutline(city, `${escapeHtml(city.name)} outline`, {
        correct: false,
        infoHtml: countyCorrect && specificResult.enabled
          ? `<span class="bad">Click too far.</span> Correct county: ${escapeHtml(correctCountyText)}.`
          : `<span class="bad">County missed.</span> Correct county: ${escapeHtml(correctCountyText)}.`,
      });
    }
    const feedback = countyCorrect && specificResult.enabled
      ? `<span class="bad">County right, click too far.</span> ${escapeHtml(city.name)} needed a click within ${specificResult.radius} miles; yours was ${dist.toFixed(1)} miles away.`
      : `<span class="bad">Wrong county.</span> ${escapeHtml(city.name)} is in <b>${escapeHtml(correctCountyText)} County</b>. Your pick was ${dist.toFixed(1)} miles from the city point.`;
    setFeedback(`${feedback}${s.repeatMisses ? " It will come back later." : ""}`);
    showInfoForCity(city, countyCorrect && specificResult.enabled
      ? `<span class="bad">Click too far.</span> Correct county: ${escapeHtml(correctCountyText)}.`
      : `<span class="bad">County missed.</span> Correct county: ${escapeHtml(correctCountyText)}.`);
    $("nextButton").classList.remove("hidden");
    app.stage = "answered";
    app.answered = true;
    setStageVisual("answered");
  }
}

function handleCountyLocateClick(clicked, layer) {
  if (app.stage !== "countyLocate") return;
  const target = app.current;
  const correct = norm(clicked) === norm(target);
  const repeatMisses = getSettings().repeatMisses;
  const keepTargetInGame = !correct && repeatMisses;
  const easyMode = isEasyCountyFinderMode();
  app.scoreTotal += 1;
  if (correct) {
    app.scoreCorrect += 1;
    app.completedCountyNames.add(target);
    app.retiredCountyResults.set(target, "correct");
  } else if (repeatMisses && !app.completedCountyNames.has(target)) {
    app.sequence.push(target);
  } else {
    app.retiredCountyResults.set(target, "wrong");
  }
  updateScore();
  updateProgressBar(true);
  if (correct) {
    layer.setStyle(correctStyle);
  } else {
    layer.setStyle(keepTargetInGame ? selectedStyle : wrongStyle);
  }
  const targetLayer = getCountyLayer(target);
  if (targetLayer) {
    const targetResult = app.retiredCountyResults.get(target);
    if (correct) {
      targetLayer.setStyle(correctStyle);
    } else if (keepTargetInGame || !easyMode) {
      targetLayer.setStyle(targetStyle);
    } else if (targetResult === "wrong") {
      targetLayer.setStyle(wrongStyle);
    } else {
      targetLayer.setStyle(correctStyle);
    }
  }
  $("progressText").textContent = currentProgress();
  setFeedback(correct
    ? `<span class="good">Correct.</span> That is ${escapeHtml(target)} County.`
    : `<span class="bad">Not quite.</span> You clicked ${escapeHtml(clicked)} County. The correct answer is <b>${escapeHtml(target)} County</b>.${repeatMisses ? " It will come back later." : ""}`);
  $("nextButton").classList.remove("hidden");
  app.stage = "answered";
  app.answered = true;
  setStageVisual("answered");
}

function handleCountyNameSubmit() {
  if (app.stage === "ultraHardCounty") {
    handleUltraHardCountySubmit();
    return;
  }
  if (app.stage === "cityName") {
    handleCityNameSubmit();
    return;
  }
  if (app.stage === "countySeatName") {
    handleCountySeatNameSubmit();
    return;
  }
  if (app.stage !== "countyName") return;
  const target = app.current;
  const answer = $("countyNameInput").value;
  const correct = norm(answer) === norm(target);
  const repeatMisses = getSettings().repeatMisses;
  app.scoreTotal += 1;
  if (correct) {
    app.scoreCorrect += 1;
    app.completedCountyNames.add(target);
  } else if (repeatMisses && !app.completedCountyNames.has(target)) {
    app.sequence.push(target);
  }
  updateScore();
  updateProgressBar(true);
  const targetLayer = getCountyLayer(target);
  if (targetLayer) targetLayer.setStyle(correctStyle);
  setFeedback(correct
    ? `<span class="good">Correct.</span> That is ${escapeHtml(target)} County.`
    : `<span class="bad">Not quite.</span> The highlighted county is <b>${escapeHtml(target)} County</b>.${repeatMisses ? " It will come back later." : ""}`);
  $("nextButton").classList.remove("hidden");
  app.stage = "answered";
  app.answered = true;
  setStageVisual("answered");
}

function handleCityNameSubmit() {
  if (app.stage !== "cityName") return;
  const city = app.current;
  const answer = $("countyNameInput").value;
  const correct = norm(answer) === norm(city.name);
  const repeatMisses = getSettings().repeatMisses;
  const counties = uniqueCountyNames(cityCountyNames(city));
  const countyText = counties.map(countyDisplayName).join(" / ");

  app.scoreTotal += 1;
  if (correct) app.scoreCorrect += 1;
  recordRepeatProgress(correct, city, cityQuestionKey(city));
  updateScore();
  updateProgressBar(true);

  for (const county of counties) {
    const layer = getCountyLayer(county);
    if (layer) layer.setStyle(correct ? correctStyle : targetStyle);
  }
  $("typedAnswerBox").classList.add("hidden");
  app.markerLayer.clearLayers();
  revealCityAnswerTarget(city, `${escapeHtml(city.name)}: exact learning point`);

  const resultNode = $("selectedCounty");
  resultNode.className = `selected-county ${correct ? "good" : "bad"}`;
  resultNode.innerHTML = `
    <span>Correct city</span>
    <strong>${escapeHtml(city.name)}</strong>
    <em>${escapeHtml(countyText || "County unknown")}</em>
  `;
  updateDockVisibility();
  setFeedback(correct
    ? `<span class="good">Correct.</span> That city is ${escapeHtml(city.name)}.`
    : `<span class="bad">Not quite.</span> The city is <b>${escapeHtml(city.name)}</b>.${repeatMisses ? " It will come back later." : ""}`);
  showInfoForCity(city, correct
    ? `<span class="good">City named.</span>`
    : `<span class="bad">City missed.</span> Correct answer: ${escapeHtml(city.name)}.`);
  $("questionTitle").textContent = city.name;
  $("questionHelp").textContent = countyText || "City revealed.";
  $("nextButton").classList.remove("hidden");
  app.stage = "answered";
  app.answered = true;
  setStageVisual("answered");
}

function uniqueCountyNames(countyNames) {
  const seen = new Set();
  return countyNames.filter((county) => {
    const key = norm(county);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function handleUltraHardCountySubmit() {
  if (app.stage !== "ultraHardCounty") return;
  const item = app.current;
  const config = noMapQuestionConfig(item);
  const answer = $("countyNameInput").value;
  const correct = config.answers.some((expected) => norm(answer) === norm(expected));
  const repeatKey = app.mode === "city" ? cityQuestionKey(item) : seatCountyName(item);

  app.scoreTotal += 1;
  if (correct) app.scoreCorrect += 1;
  recordRepeatProgress(correct, item, repeatKey);
  updateScore();
  updateProgressBar(true);

  $("typedAnswerBox").classList.add("hidden");
  const resultNode = $("selectedCounty");
  resultNode.className = `selected-county ${correct ? "good" : "bad"}`;
  resultNode.innerHTML = `
    <span>Correct answer</span>
    <strong>${escapeHtml(config.answerText)}</strong>
    <em>${escapeHtml(correct ? "Answer accepted." : `You answered ${answer || "nothing"}.`)}</em>
  `;
  updateDockVisibility();
  setFeedback(correct
    ? `<span class="good">Correct.</span> ${escapeHtml(config.resultText)}`
    : `<span class="bad">Not quite.</span> ${escapeHtml(config.resultText)}${getSettings().repeatMisses ? " It will come back later." : ""}`);
  $("questionHelp").textContent = config.answerText;
  $("nextButton").classList.remove("hidden");
  app.stage = "answered";
  app.answered = true;
  setStageVisual("answered");
}

function handleCountySeatPickClick(clicked, layer, clickedLatLng) {
  if (app.stage !== "countySeatPick") return;
  const seat = app.current;
  const targetCounty = seatCountyName(seat);
  const s = getSettings();
  const countyCorrect = norm(clicked) === norm(targetCounty);
  const specificResult = specificPickerResult(seat, clickedLatLng, layer, s);
  const specificCorrect = !specificResult.enabled || specificResult.correct;
  const correct = countyCorrect && specificCorrect;
  const repeatMisses = getSettings().repeatMisses;
  const keepTargetInGame = !correct && repeatMisses;
  const easyMode = isEasyCountyFinderMode();

  app.scoreTotal += 1;
  if (correct) {
    app.scoreCorrect += 1;
    app.completedCountyNames.add(targetCounty);
    app.retiredCountyResults.set(targetCounty, "correct");
    retainCountySeatPoint(seat, "correct");
  } else if (repeatMisses && !app.completedCountyNames.has(targetCounty)) {
    app.sequence.push(seat);
  } else {
    app.retiredCountyResults.set(targetCounty, "wrong");
    retainCountySeatPoint(seat, "wrong");
  }
  updateScore();
  updateProgressBar(true);

  if (correct) {
    layer.setStyle(correctStyle);
  } else {
    layer.setStyle(keepTargetInGame ? selectedStyle : wrongStyle);
  }
  const targetLayer = getCountyLayer(targetCounty);
  if (targetLayer) {
    const targetResult = app.retiredCountyResults.get(targetCounty);
    if (correct) {
      targetLayer.setStyle(correctStyle);
    } else if (keepTargetInGame || !easyMode) {
      targetLayer.setStyle(targetStyle);
    } else if (targetResult === "wrong") {
      targetLayer.setStyle(wrongStyle);
    } else {
      targetLayer.setStyle(correctStyle);
    }
  }

  const target = specificResult.target || targetLatLngForPlace(seat);
  if (correct) {
    revealCountySeatAnswerTarget(seat, `${escapeHtml(seat.name)}: county seat of ${escapeHtml(countyDisplayName(targetCounty))}`);
  } else {
    const result = specificResult.target && specificResult.guess
      ? specificResult
      : clickDistanceToPlace(seat, clickedLatLng, layer);
    const guess = result?.guess || clickedLatLng || layer.getBounds().getCenter();
    const dist = result?.distance ?? 0;
    drawCityResult(guess, target, {
      correct: false,
      guessLabel: countyCorrect && specificResult.enabled
        ? `Your click: ${dist.toFixed(1)} miles away`
        : `${escapeHtml(clicked)} County pick`,
      targetLabel: `${escapeHtml(seat.name)}: county seat of ${escapeHtml(countyDisplayName(targetCounty))}`,
      showTargetPoint: !s.seatOutlines,
      radiusMiles: specificResult.enabled ? specificResult.radius : null,
    });
    if (s.seatOutlines) {
      drawCityOutline(seat, `${escapeHtml(seat.name)} outline`, {
        seat: true,
        correct: false,
        infoHtml: countyCorrect && specificResult.enabled
          ? `<span class="bad">Click too far.</span> County seat of ${escapeHtml(countyDisplayName(targetCounty))}.`
          : `<span class="bad">County missed.</span> Correct county: ${escapeHtml(countyDisplayName(targetCounty))}.`,
      });
    }
  }

  const detail = correct
    ? `${seat.name} is the county seat.`
    : countyCorrect && specificResult.enabled && specificResult.distance !== undefined
      ? `Your click was ${specificResult.distance.toFixed(1)} miles away.`
      : `You picked ${countyDisplayName(clicked)}.`;
  setSelectedCounty(
    targetCounty,
    correct ? "good" : "bad",
    correct ? "County seat county" : "Correct county",
    detail
  );
  const feedback = correct
    ? `<span class="good">Correct.</span> ${escapeHtml(seat.name)} is the county seat of <b>${escapeHtml(countyDisplayName(targetCounty))}</b>.`
    : countyCorrect && specificResult.enabled
      ? `<span class="bad">County right, click too far.</span> ${escapeHtml(seat.name)} needed a click within ${specificResult.radius} miles; yours was ${specificResult.distance?.toFixed(1) ?? "too far"} miles away.`
      : `<span class="bad">Not quite.</span> ${escapeHtml(seat.name)} is the county seat of <b>${escapeHtml(countyDisplayName(targetCounty))}</b>.`;
  setFeedback(`${feedback}${!correct && repeatMisses ? " It will come back later." : ""}`);
  showInfoForCity(seat, correct
    ? `<span class="good">County correct.</span> County seat of ${escapeHtml(countyDisplayName(targetCounty))}.`
    : countyCorrect && specificResult.enabled
      ? `<span class="bad">Click too far.</span> Correct county: ${escapeHtml(countyDisplayName(targetCounty))}.`
      : `<span class="bad">County missed.</span> Correct county: ${escapeHtml(countyDisplayName(targetCounty))}.`);
  $("nextButton").classList.remove("hidden");
  app.stage = "answered";
  app.answered = true;
  setStageVisual("answered");
}

function handleCountySeatNameSubmit() {
  if (app.stage !== "countySeatName") return;
  const seat = app.current;
  const county = seatCountyName(seat);
  const answer = $("countyNameInput").value;
  const correct = norm(answer) === norm(seat.name);
  const repeatMisses = getSettings().repeatMisses;

  app.scoreTotal += 1;
  if (correct) {
    app.scoreCorrect += 1;
    app.completedCountyNames.add(county);
  } else if (repeatMisses && !app.completedCountyNames.has(county)) {
    app.sequence.push(seat);
  }
  updateScore();
  updateProgressBar(true);

  const targetLayer = getCountyLayer(county);
  if (targetLayer) targetLayer.setStyle(correct ? correctStyle : targetStyle);
  app.markerLayer.clearLayers();
  revealCountySeatAnswerTarget(seat, `${escapeHtml(seat.name)}: county seat of ${escapeHtml(countyDisplayName(county))}`);
  setSelectedCounty(county, correct ? "good" : "bad", "County", `County seat: ${seat.name}`);
  setFeedback(correct
    ? `<span class="good">Correct.</span> ${escapeHtml(seat.name)} is the county seat of ${escapeHtml(countyDisplayName(county))}.`
    : `<span class="bad">Not quite.</span> The county seat is <b>${escapeHtml(seat.name)}</b>.${repeatMisses ? " It will come back later." : ""}`);
  showInfoForCity(seat, correct
    ? `<span class="good">County seat named.</span>`
    : `<span class="bad">County seat missed.</span> Correct answer: ${escapeHtml(seat.name)}.`);
  $("nextButton").classList.remove("hidden");
  app.stage = "answered";
  app.answered = true;
  setStageVisual("answered");
}

function onMapClick(e) {
  if (app.stage === "answered") {
    advanceIfReady(e && e.originalEvent);
    return;
  }
  if (app.stage === "learn") {
    clearLearnCitySelection({ clearInfo: true });
    return;
  }
  if (app.stage !== "cityPoint") return;
  handleCityPointClick(e.latlng);
}

function isAdvanceBlockedTarget(target) {
  return target instanceof Element && Boolean(target.closest([
    "button",
    "input",
    "select",
    "textarea",
    "label",
    "a",
    ".settings-panel",
    ".settings-backdrop",
    ".map-toolbar",
    ".map-display-menu",
  ].join(",")));
}

function advanceIfReady(event, options = {}) {
  if (app.stage !== "answered") return false;
  if (performance.now() < app.advanceArmedAt) return false;
  if (!options.allowBlockedTarget && event && isAdvanceBlockedTarget(event.target)) return false;
  app.index += 1;
  nextQuestion();
  return true;
}

function drawCityResult(clicked, target, options = {}) {
  if (!clicked || !target) return;
  const guessColor = options.correct ? "#22c55e" : "#fb7185";
  const targetColor = "#f8fafc";
  const lineColor = options.correct ? "#22c55e" : "#f59e0b";

  L.circleMarker(clicked, {
    radius: 7,
    color: guessColor,
    weight: 3,
    fillColor: guessColor,
    fillOpacity: 0.38,
  }).addTo(app.markerLayer).bindPopup(options.guessLabel || "Your pick");

  if (options.radiusMiles) {
    L.circle(target, {
      radius: options.radiusMiles * 1609.344,
      color: "#38bdf8",
      weight: 1.5,
      opacity: 0.82,
      fillColor: "#38bdf8",
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(app.markerLayer);
  }

  if (options.showTargetPoint !== false) {
    L.circleMarker(target, {
      radius: 8,
      color: targetColor,
      weight: 3,
      fillColor: "#38bdf8",
      fillOpacity: 0.9,
    }).addTo(app.markerLayer).bindPopup(options.targetLabel || "Actual location");
  }

  L.polyline([clicked, target], {
    color: lineColor,
    weight: 2.5,
    opacity: 0.9,
    dashArray: "6,7",
  }).addTo(app.markerLayer);

  if (options.fitResult) fitResultPoints([clicked, target]);
}

function drawCityTargetPoint(city, label = "", options = {}) {
  const targetLayer = options.targetLayer || app.markerLayer;
  if (!targetLayer) return false;
  const target = { lat: Number(city.lat), lng: Number(city.lon) };
  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return false;
  const interactive = options.interactive !== false;
  const marker = L.circleMarker(target, {
    radius: 8,
    color: "#f8fafc",
    weight: 3,
    fillColor: "#38bdf8",
    fillOpacity: 0.9,
    interactive,
  }).addTo(targetLayer);
  if (interactive) marker.bindPopup(label || `${escapeHtml(city.name)}: exact learning point`);
  return marker;
}

function drawCityPromptTarget(city, label = "City location") {
  if (getSettings().cityOutlines) {
    return drawCityOutline(city, label, {
      interactive: false,
      infoHtml: "",
    }) ? "outline" : "none";
  }
  return drawCityTargetPoint(city, label, { interactive: false }) ? "point" : "none";
}

function revealCityAnswerTarget(city, label = "") {
  if (getSettings().cityOutlines) {
    return drawCityOutline(city, label || `${city.name} outline`, {
      infoHtml: `<span class="good">County correct.</span> City outline shown.`,
    }) ? "outline" : "none";
  }
  return drawCityTargetPoint(city, label) ? "point" : "none";
}

function drawCountySeatPoint(seat, label = "County seat location", options = {}) {
  const targetLayer = options.targetLayer || app.markerLayer;
  if (!targetLayer) return false;
  const target = { lat: Number(seat.lat), lng: Number(seat.lon) };
  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return false;
  const marker = L.circleMarker(target, {
    radius: 8,
    color: "#f8fafc",
    weight: 3,
    fillColor: "#f59e0b",
    fillOpacity: 0.95,
  }).addTo(targetLayer).bindPopup(label);
  return marker;
}

function drawCountySeatPromptTarget(seat, label = "County seat location") {
  if (getSettings().seatOutlines) {
    return drawCityOutline(seat, label, {
      seat: true,
      interactive: false,
      infoHtml: "",
    }) ? "outline" : "none";
  }
  drawCountySeatPoint(seat, label);
  return "point";
}

function revealCountySeatAnswerTarget(seat, label = "County seat location", options = {}) {
  if (getSettings().seatOutlines) {
    return drawCityOutline(seat, label, {
      ...options,
      seat: true,
      infoHtml: options.infoHtml || `<span class="good">County seat outline.</span> ${escapeHtml(seat.name)}.`,
    }) ? "outline" : "none";
  }
  return drawCountySeatPoint(seat, label, options) ? "point" : "none";
}

function retainCountySeatPoint(seat, result) {
  if (!app.retiredMarkerLayer || !shouldKeepRetiredSeatDots()) return;
  const county = seatCountyName(seat);
  const key = norm(county);
  if (!key || app.retiredSeatMarkers.has(key)) return;
  const label = `${escapeHtml(seat.name)} - ${escapeHtml(countyDisplayName(county))}`;
  const resultText = result === "correct" ? "County correct." : "County missed.";
  if (getSettings().seatOutlines) {
    const outline = drawCityOutline(seat, `${label} county seat outline`, {
      targetLayer: app.retiredMarkerLayer,
      seat: true,
      correct: result === "correct",
      infoHtml: `<span class="${result === "correct" ? "good" : "bad"}">${resultText}</span> County seat of ${escapeHtml(countyDisplayName(county))}.`,
    });
    if (outline) {
      app.retiredSeatMarkers.set(key, outline);
      bringToFrontSafe(app.retiredMarkerLayer);
      bringToFrontSafe(app.markerLayer);
    }
    return;
  }
  const target = { lat: Number(seat.lat), lng: Number(seat.lon) };
  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return;
  const color = result === "correct" ? "#22c55e" : "#fb7185";
  const marker = L.circleMarker(target, {
    radius: 7,
    color: "#f8fafc",
    weight: 2.5,
    fillColor: color,
    fillOpacity: 0.94,
    interactive: true,
  }).bindTooltip(`${seat.name} - ${countyDisplayName(county)}`, {
    direction: "top",
    opacity: 0.95,
    offset: [0, -8],
  });
  marker.addTo(app.retiredMarkerLayer);
  app.retiredSeatMarkers.set(key, marker);
  bringToFrontSafe(app.retiredMarkerLayer);
  bringToFrontSafe(app.markerLayer);
}

function handleCityPointClick(latlng) {
  if (app.stage !== "cityPoint") return;
  const city = app.current;
  const target = { lat: Number(city.lat), lng: Number(city.lon) };
  const clicked = latlng;
  const dist = milesBetween(clicked, target);
  const threshold = getSettings().threshold;
  const pointCorrect = dist <= threshold;
  const directCityPick = app.mode === "city" && app.cityTask === "pick";
  const questionCorrect = directCityPick ? pointCorrect : app.cityCountyCorrect && pointCorrect;

  app.scoreTotal += 1;
  if (questionCorrect) app.scoreCorrect += 1;
  recordRepeatProgress(questionCorrect, city, cityQuestionKey(city));
  updateScore();
  updateProgressBar(true);

  drawCityResult(clicked, target, {
    correct: pointCorrect,
    radiusMiles: threshold,
    guessLabel: `Your guess: ${dist.toFixed(1)} miles away`,
    targetLabel: `${escapeHtml(city.name)}: exact learning point`,
    showTargetPoint: !getSettings().cityOutlines,
  });
  if (getSettings().cityOutlines) {
    drawCityOutline(city, `${escapeHtml(city.name)} outline`, {
      correct: pointCorrect,
      infoHtml: `<span class="${pointCorrect ? "good" : "bad"}">${pointCorrect ? "Location close enough." : "Study the city outline."}</span>`,
    });
  }

  const result = pointCorrect
    ? `<span class="good">Location close enough</span>: ${dist.toFixed(1)} miles away.`
    : `<span class="bad">Too far</span>: ${dist.toFixed(1)} miles away.`;
  if (directCityPick) {
    const county = cityPrimaryCounty(city);
    setSelectedCounty(county, pointCorrect ? "good" : "bad", "City location", `${city.name}: ${dist.toFixed(1)} miles away`);
    setFeedback(`${result} ${questionCorrect ? "Question counted correct." : `Study the real point.${getSettings().repeatMisses ? " It will come back later." : ""}`}`);
    showInfoForCity(city, result);
  } else {
    const countyResult = app.cityCountyCorrect ? `<span class="good">County correct</span>` : `<span class="bad">County missed</span>`;
    setFeedback(`${countyResult}. ${result} ${questionCorrect ? "Question counted correct." : `Question counted incorrect, but study the real point.${getSettings().repeatMisses ? " It will come back later." : ""}`}`);
    showInfoForCity(city, `${countyResult}. ${result}`);
  }
  clearHoveredCounty();
  $("nextButton").classList.remove("hidden");
  app.stage = "answered";
  app.answered = true;
  setStageVisual("answered");
}

function initMap() {
  app.mapRenderer = L.canvas({
    padding: 0.65,
    tolerance: 8,
  });

  app.map = L.map("map", {
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true,
    renderer: app.mapRenderer,
    scrollWheelZoom: false,
    zoomSnap: 0,
    zoomDelta: 0.25,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    inertia: true,
    inertiaDeceleration: 2600,
    easeLinearity: 0.12,
    maxBoundsViscosity: 0.72,
  });
  app.map.on("click", onMapClick);
  app.map.on("mouseout", clearHoveredCounty);
  app.map.on("mousemove", (event) => scheduleHoveredCountySync(event.latlng));
  app.map.on("dragstart", () => document.body.classList.add("map-dragging"));
  app.map.on("dragend", () => document.body.classList.remove("map-dragging"));
  app.map.on("move zoom resize viewreset", scheduleLearnDotUpdate);
  installImageLikeWheelZoom();
  app.learnDotsLayer = document.createElement("div");
  app.learnDotsLayer.className = "learn-dots-layer";
  $("mapWrap").appendChild(app.learnDotsLayer);
  app.retiredMarkerLayer = L.layerGroup().addTo(app.map);
  app.markerLayer = L.layerGroup().addTo(app.map);

  app.highwayLayer = L.layerGroup();
  app.highwayLayersByType = new Map();
  for (const type of highwayTypes) {
    const features = (app.data.highways?.features || [])
      .filter((feature) => feature?.properties?.route_type === type);
    const layer = L.geoJSON({ type: "FeatureCollection", features }, {
      renderer: app.mapRenderer,
      smoothFactor: 1.25,
      style: highwayFeatureStyle,
      interactive: false,
    });
    app.highwayLayersByType.set(type, layer);
  }

  app.countyLayer = L.geoJSON(app.data.counties, {
    renderer: app.mapRenderer,
    style: () => baseCountyStyle,
    bubblingMouseEvents: false,
    onEachFeature: (feature, layer) => {
      const name = getCountyName(feature);
      app.countyLayersByName.set(norm(name), layer);
      layer.on({
        mouseover: (event) => {
          scheduleHoveredCountySync(event.latlng);
        },
        mousemove: (event) => {
          scheduleHoveredCountySync(event.latlng);
        },
        mouseout: (event) => {
          if (event?.latlng) {
            scheduleHoveredCountySync(event.latlng);
          } else if (app.hoveredCountyLayer === layer) {
            clearHoveredCounty();
          }
        },
        click: (event) => onCountyClick(feature, layer, event),
      });
    },
  }).addTo(app.map);
  buildCountyPickIndex();

  app.countyBorderLayer = L.geoJSON(app.data.counties, {
    renderer: app.mapRenderer,
    style: () => countyBorderStyle,
    interactive: false,
  }).addTo(app.map);

  app.map.setMaxBounds(app.countyLayer.getBounds().pad(0.5));
  fitNC();
  refreshWater();
  refreshHighways();
}

async function bootstrap() {
  try {
    const res = await fetch("/api/bootstrap");
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }
    app.data = await res.json();
    prepareCityOutlines();
    const md = app.data.metadata || {};
    $("dataNotes").textContent = `${fmtNum(md.city_count)} places ready`;
    $("questionTitle").textContent = "Ready";
    $("questionHelp").textContent = "Start a round from the menu.";
    $("progressText").textContent = "Data loaded";
    loadCountyFilter();
    exitGameMode();
    updateModeButtons();
    setStageVisual("ready");
    updateProgressBar();
    app.stage = "ready";
  } catch (err) {
    $("questionTitle").textContent = "App failed to load";
    $("questionHelp").textContent = "The app could not load its local data.";
    $("dataNotes").textContent = String(err);
    setMapStatus("Unable to load app data.");
    console.error(err);
  }
}

$("thresholdInput").addEventListener("input", () => {
  $("thresholdLabel").textContent = $("thresholdInput").value;
  if (app.stage === "cityPoint") {
    const city = app.current;
    $("questionHelp").textContent = `Click within ${getSettings().threshold} miles of ${city ? city.name : "the city"}.`;
    setStageVisual("cityPoint");
  }
});
$("cityPointTestInput")?.addEventListener("change", updateModeButtons);
$("specificCityPickerInput").addEventListener("change", updateModeButtons);
$("specificCityRadiusInput").addEventListener("input", () => {
  if (app.stage === "cityCounty" || app.stage === "countySeatPick") setStageVisual(app.stage);
});
["learnAllCitiesInput", "learnHighlightSeatsInput"].forEach((id) => {
  $(id).addEventListener("change", refreshLearnDisplay);
});
document.querySelectorAll('input[name="learnCityDisplay"]').forEach((input) => {
  input.addEventListener("change", refreshLearnDisplay);
});
$("highwaysInput").addEventListener("change", refreshHighways);
document.querySelectorAll(".highway-type-input").forEach((input) => {
  input.addEventListener("change", refreshHighways);
});
$("waterInput").addEventListener("change", refreshWater);
$("seatOutlineInput").addEventListener("change", refreshCountySeatTargetDisplay);
$("modeSelect").addEventListener("change", updateModeButtons);
$("orderSelect").addEventListener("change", () => {
  if ($("orderSelect").value === "population") $("directionSelect").value = "desc";
  updateModeButtons();
});
document.querySelectorAll('input[name="countyTask"]').forEach((input) => {
  input.addEventListener("change", updateModeButtons);
});
document.querySelectorAll('input[name="cityTask"]').forEach((input) => {
  input.addEventListener("change", updateModeButtons);
});
document.querySelectorAll('input[name="seatNoMapTask"]').forEach((input) => {
  input.addEventListener("change", updateModeButtons);
});
document.querySelectorAll('input[name="countyFinderDifficulty"]').forEach((input) => {
  input.addEventListener("change", updateModeButtons);
});
document.querySelectorAll('input[name="appTheme"], input[name="cursorType"], input[name="cursorPlayer"]').forEach((input) => {
  input.addEventListener("change", applyPreferencesFromControls);
});
document.querySelectorAll(".mode-card").forEach((button) => {
  button.addEventListener("click", () => {
    $("modeSelect").value = button.dataset.mode;
    $("modeSelect").dispatchEvent(new Event("change"));
  });
});
$("settingsButton").addEventListener("click", () => setSettingsOpen(true));
$("settingsCloseButton").addEventListener("click", () => setSettingsOpen(false));
$("settingsBackdrop").addEventListener("click", () => setSettingsOpen(false));
$("fullscreenButton").addEventListener("click", toggleFullscreen);
$("mapDisplayButton").addEventListener("click", (event) => {
  event.stopPropagation();
  setMapDisplayOpen($("mapDisplayPanel").classList.contains("hidden"));
});
$("countyFilterButton").addEventListener("click", () => setCountyFilterOpen(true));
$("countyFilterCloseButton").addEventListener("click", () => setCountyFilterOpen(false));
$("countyFilterDoneButton").addEventListener("click", () => setCountyFilterOpen(false));
$("countyFilterBackdrop").addEventListener("click", () => setCountyFilterOpen(false));
$("countyFilterSelectAllButton").addEventListener("click", () => setCountyFilterSelection(allCountyNames()));
$("countyFilterDeselectAllButton").addEventListener("click", () => setCountyFilterSelection([]));
document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("keydown", (event) => {
  toggleHoveredLearnCountyKnown(event);
  if (event.key === "Enter" && !event.repeat) {
    const advanced = advanceIfReady(event, { allowBlockedTarget: true });
    if (advanced) event.preventDefault();
  }
  if (event.key === "Escape") {
    setSettingsOpen(false);
    setCountyFilterOpen(false);
    setMapDisplayOpen(false);
  }
});
document.addEventListener("mouseup", () => document.body.classList.remove("map-dragging"));
document.addEventListener("click", (event) => {
  if (
    !$("mapDisplayPanel").classList.contains("hidden")
    && event.target instanceof Element
    && !event.target.closest("#mapDisplayMenu")
  ) {
    setMapDisplayOpen(false);
  }
  advanceIfReady(event);
});
window.addEventListener("blur", () => document.body.classList.remove("map-dragging"));
$("fitButton").addEventListener("click", () => {
  refitCurrentView();
});
$("quitButton").addEventListener("click", quitToMenu);
$("startButton").addEventListener("click", () => startQuiz());
$("nextButton").addEventListener("click", () => {
  app.index += 1;
  nextQuestion();
});
$("restartButton").addEventListener("click", () => startQuiz({ preserveMapView: true }));
$("submitNameButton").addEventListener("click", handleCountyNameSubmit);
$("countyNameInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCountyNameSubmit();
});

const dockObserver = new MutationObserver(updateDockVisibility);
["feedback", "selectedCounty", "typedAnswerBox", "nextButton", "restartButton"].forEach((id) => {
  dockObserver.observe($(id), {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
  });
});
loadPreferences();
updateDockVisibility();
updateModeButtons();
updateFullscreenButton();

bootstrap();
