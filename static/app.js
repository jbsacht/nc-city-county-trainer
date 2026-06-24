const $ = (id) => document.getElementById(id);

const app = {
  data: null,
  map: null,
  mapRenderer: null,
  countyLayer: null,
  highwayLayer: null,
  markerLayer: null,
  retiredMarkerLayer: null,
  learnDotsLayer: null,
  learnDots: [],
  learnDotsFrame: 0,
  targetLayer: null,
  countyLayersByName: new Map(),
  retiredSeatMarkers: new Map(),
  sequence: [],
  index: 0,
  requiredCountyNames: new Set(),
  completedCountyNames: new Set(),
  retiredCountyResults: new Map(),
  knownCountyNames: new Set(),
  countyTask: "pick",
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
const highwayStyle = { color: "#f59e0b", weight: 1.7, opacity: 0.5 };

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
    highway: { color: "#fbbf24", weight: 1.7, opacity: 0.48 },
  },
  beach: {
    base: { color: "#2f6f8f", weight: 1.2, opacity: 0.95, fillColor: "#d7f2ed", fillOpacity: 0.74 },
    hover: { color: "#0f766e", weight: 2.6, fillColor: "#8ddbd0", fillOpacity: 0.82 },
    selected: { color: "#f97316", weight: 3, fillColor: "#fed7aa", fillOpacity: 0.82 },
    correct: { color: "#15803d", weight: 3.5, fillColor: "#bbf7d0", fillOpacity: 0.84 },
    wrong: { color: "#e11d48", weight: 3.5, fillColor: "#fecdd3", fillOpacity: 0.86 },
    target: { color: "#0369a1", weight: 4, fillColor: "#bae6fd", fillOpacity: 0.88 },
    highway: { color: "#b45309", weight: 1.8, opacity: 0.5 },
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

function getSettings() {
  return {
    mode: $("modeSelect").value,
    countyTask: getRadioValue("countyTask", "pick"),
    countyFinderDifficulty: getRadioValue("countyFinderDifficulty", "easy"),
    order: $("orderSelect").value,
    direction: $("directionSelect").value,
    cityLimit: parseLimitInput("cityLimitInput"),
    countyLimit: parseLimitInput("countyLimitInput"),
    threshold: Number($("thresholdInput").value),
    showStars: $("seatStarsInput").checked,
    testCityPoint: $("cityPointTestInput").checked,
    showHighways: $("highwaysInput").checked,
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
  Object.assign(highwayStyle, styles.highway);
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
  if (app.stage === "learn" && app.current) {
    const layer = getCountyLayer(app.current);
    if (layer) restoreCountyStyle(app.current, layer);
  }
  applyLearnKnownCountyStyles();
  if (app.highwayLayer) app.highwayLayer.setStyle(highwayStyle);
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
  panel.classList.toggle("dock-hidden", !(hasFeedback || hasSelected || hasTyped || hasNext));
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
  if (mode === "learn") return "Learn";
  if (mode === "county") {
    const task = mode === app.mode ? app.countyTask : getRadioValue("countyTask", "pick");
    if (task === "name") return "Name Counties";
    const difficulty = mode === app.mode ? app.countyFinderDifficulty : getSettings().countyFinderDifficulty;
    return `Pick Counties ${difficulty === "easy" ? "Easy" : "Hard"}`;
  }
  if (mode === "seat") {
    const task = mode === app.mode ? app.countyTask : getRadioValue("countyTask", "pick");
    if (task === "name") return "Name County Seats";
    const difficulty = mode === app.mode ? app.countyFinderDifficulty : getSettings().countyFinderDifficulty;
    return `County Seats ${difficulty === "easy" ? "Easy" : "Hard"}`;
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
  return getSettings().testCityPoint
    ? ["County", "City spot", "Learn"]
    : ["County", "Reveal city", "Next"];
}

function setStageVisual(stage) {
  if (stage === "learn") {
    renderStageSteps(["Explore", "Inspect", "Remember"], 0, 0);
    setMapStatus("Click a county to reveal its cities.");
  } else if (stage === "cityCounty") {
    renderStageSteps(cityStageSteps(), 0, 0);
    setMapStatus("Click the county first.");
  } else if (stage === "cityPoint") {
    renderStageSteps(cityStageSteps(), 1, 1);
    setMapStatus("Now click the city location inside the county.");
  } else if (stage === "answered") {
    const steps = app.mode === "city" ? cityStageSteps() : ["Answer", "Review", "Next"];
    renderStageSteps(steps, 2, 2);
    setMapStatus("Review the answer, then click anywhere to continue.");
    $("nextButton").textContent = "Click anywhere to continue";
    app.advanceArmedAt = performance.now() + 180;
  } else if (stage === "countyLocate") {
    renderStageSteps(["Read", "Click county", "Review"], 1, 0);
    setMapStatus("Click the named county.");
  } else if (stage === "countyName") {
    renderStageSteps(["Study shape", "Type name", "Review"], 1, 0);
    setMapStatus("Type the highlighted county name.");
  } else if (stage === "countySeatPick") {
    renderStageSteps(["Read seat", "Pick county", "Review"], 1, 0);
    setMapStatus("Click the county for this county seat.");
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
  const countyTask = getRadioValue("countyTask", "pick");
  const testCityPoint = $("cityPointTestInput").checked;
  const countyTaskMode = usesCountyTaskSettings(active);
  const countySeatMode = isCountySeatMode(active);
  const repeatMissesMode = active === "city" || countyTaskMode;
  updateOrderOptions(active);
  document.querySelectorAll(".mode-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === active);
  });
  $("countyTaskLabel").textContent = countySeatMode ? "County seat challenge" : "County challenge";
  $("countyPickTaskLabel").textContent = "Pick county";
  $("countyNameTaskLabel").textContent = countySeatMode ? "Name county seat" : "Name county";
  $("countyLimitLabel").textContent = countySeatMode ? "County seat limit" : "County limit";
  $("countyLimitInput").placeholder = countySeatMode ? "All county seats" : "All counties";
  $("countyDifficultyLabel").textContent = countySeatMode ? "County seat picker difficulty" : "Pick county difficulty";
  showMenuSection("orderOptions", shouldShowOrderOptions(active), "grid");
  showMenuSection("cityOptions", active === "city");
  showMenuSection("cityRadiusOption", active === "city" && testCityPoint, "grid");
  showMenuSection("countyFinderOptions", countyTaskMode);
  showMenuSection("countyPickOptions", countyTaskMode && countyTask === "pick");
  showMenuSection("repeatMissesOption", repeatMissesMode, "flex");
  showMenuSection("directionOption", $("orderSelect").value !== "random" && shouldShowOrderOptions(active));
  setModePill();
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
      orderSelect.value = "population";
      $("directionSelect").value = "desc";
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

function enterGameMode() {
  document.body.classList.add("in-game");
  document.body.classList.toggle("learn-mode", getSettings().mode === "learn");
  requestAnimationFrame(refitCurrentView);
}

function exitGameMode() {
  document.body.classList.remove("in-game");
  document.body.classList.remove("learn-mode");
}

function quitToMenu() {
  if (app.map && app.markerLayer && app.countyLayer) {
    resetVisuals({ clearRetiredSeatDots: true });
    fitNC();
  }
  app.stage = "ready";
  app.current = null;
  $("nextButton").classList.add("hidden");
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

function clearLearnDots() {
  app.learnDots = [];
  if (app.learnDotsLayer) app.learnDotsLayer.replaceChildren();
}

function resetVisuals(options = {}) {
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
    if (isLearnKnownCounty(countyName)) {
      layer.setStyle(correctStyle);
    } else if (options.hover) {
      layer.setStyle(hoverCountyStyle);
    } else if (isCurrent) {
      layer.setStyle(targetStyle);
    } else {
      app.countyLayer.resetStyle(layer);
    }
    return;
  }

  if (app.stage === "countySeatName" && norm(seatCountyName(app.current)) === norm(countyName)) {
    layer.setStyle(targetStyle);
  } else if (app.stage === "countyLocate" && isEasyCountyFinderMode() && app.retiredCountyResults.has(countyName)) {
    layer.setStyle(countyFinderResultStyle(app.retiredCountyResults.get(countyName)));
  } else if (app.stage === "countySeatPick" && isEasyCountyFinderMode() && app.retiredCountyResults.has(countyName)) {
    layer.setStyle(countyFinderResultStyle(app.retiredCountyResults.get(countyName)));
  } else if (["cityCounty", "countySeatPick"].includes(app.stage) || app.stage === "countyLocate") {
    app.countyLayer.resetStyle(layer);
  }
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

function citiesForCounty(countyName) {
  const countyKey = norm(countyName);
  const cities = app.data.cities.filter((city) => {
    if (!Number.isFinite(Number(city.lat)) || !Number.isFinite(Number(city.lon))) return false;
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
  node.className = `learn-map-dot${city.is_county_seat ? " seat" : ""}`;
  node.dataset.label = label;
  node.setAttribute("aria-label", label);
  if (city.is_county_seat) node.textContent = "★";
  const showLearnCityInfo = () => {
    const county = city.county_seat_of || city.primary_county || (city.counties && city.counties[0]);
    showInfoForCity(city, city.is_county_seat
      ? `<span class="good">County seat.</span> Seat of ${escapeHtml(countyDisplayName(county))}.`
      : `<span class="good">Learn mode.</span> ${escapeHtml(city.name)} details.`);
  };
  node.addEventListener("mouseenter", showLearnCityInfo);
  node.addEventListener("focus", showLearnCityInfo);
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showLearnCityInfo();
  });
  const tooltip = document.createElement("span");
  tooltip.className = "learn-map-tooltip";
  tooltip.textContent = label;
  node.appendChild(tooltip);
  app.learnDotsLayer.appendChild(node);
  app.learnDots.push({ node, latLng: L.latLng(lat, lng) });
}

function showLearnCounty(countyName, countyLayer) {
  if (app.stage !== "learn") return;
  app.current = countyName;
  app.selectedCounty = countyName;
  clearInfo();
  app.markerLayer.clearLayers();
  clearLearnDots();
  app.countyLayer.eachLayer((layer) => app.countyLayer.resetStyle(layer));
  applyLearnKnownCountyStyles();
  restoreCountyStyle(countyName, countyLayer);

  const cities = citiesForCounty(countyName);
  const countySeat = countySeatForCounty(countyName);
  const seatText = countySeat ? `County seat: ${countySeat.name}` : "County seat: unknown";
  for (const city of cities) {
    const label = `${city.name}${city.is_county_seat ? " ★" : ""}`;
    addLearnDot(city, label);
  }

  $("questionTitle").textContent = countySeat
    ? `${countyDisplayName(countyName)} - County Seat: ${countySeat.name}`
    : `${countyDisplayName(countyName)} - County Seat: Unknown`;
  $("questionHelp").textContent = `${cities.length} places. ${seatText}. Hover a dot to see its name.`;
  setFeedback("");
  setSelectedCounty(countyName, "", "County", `${seatText} - ${cities.length} places shown`);
  $("selectedCounty").querySelector("em")?.classList.add("seat-detail");
  setStageVisual("learn");
  updateLearnKnownProgress();
  updateLearnDotPositions();
  refreshHighways();
}

function getCountyName(featureOrLayer) {
  const props = featureOrLayer.feature ? featureOrLayer.feature.properties : featureOrLayer.properties;
  return props.name || props.NAME;
}

function getCountyLayer(name) {
  return app.countyLayersByName.get(norm(name));
}

function coordsBBox(coords, bbox = [Infinity, Infinity, -Infinity, -Infinity]) {
  for (const item of coords) {
    if (typeof item[0] === "number") {
      bbox[0] = Math.min(bbox[0], item[0]);
      bbox[1] = Math.min(bbox[1], item[1]);
      bbox[2] = Math.max(bbox[2], item[0]);
      bbox[3] = Math.max(bbox[3], item[1]);
    } else {
      coordsBBox(item, bbox);
    }
  }
  return bbox;
}

function buildCountyMasks(counties) {
  return counties.features.flatMap((feature) => {
    const geometry = feature.geometry || {};
    const polygons = geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
    return polygons.map((rings) => ({
      rings,
      bbox: coordsBBox(rings),
    }));
  });
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInCountyMask(point, mask) {
  const [x, y] = point;
  const [minX, minY, maxX, maxY] = mask.bbox;
  if (x < minX || x > maxX || y < minY || y > maxY) return false;
  if (!pointInRing(point, mask.rings[0])) return false;
  return !mask.rings.slice(1).some((hole) => pointInRing(point, hole));
}

function clipHighwaysToCounties(highways, counties) {
  const masks = buildCountyMasks(counties);
  const isInsideNC = (point) => masks.some((mask) => pointInCountyMask(point, mask));
  const interpolate = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
  const samePoint = (a, b) => Math.abs(a[0] - b[0]) < 1e-8 && Math.abs(a[1] - b[1]) < 1e-8;
  const clipLine = (line) => {
    const pieces = [];
    let current = [];
    const samples = 10;

    for (let i = 0; i < line.length - 1; i += 1) {
      const a = line[i];
      const b = line[i + 1];
      for (let s = 0; s < samples; s += 1) {
        const t0 = s / samples;
        const t1 = (s + 1) / samples;
        const mid = interpolate(a, b, (t0 + t1) / 2);
        if (isInsideNC(mid)) {
          const p0 = interpolate(a, b, t0);
          const p1 = interpolate(a, b, t1);
          if (!current.length || !samePoint(current[current.length - 1], p0)) current.push(p0);
          current.push(p1);
        } else if (current.length > 1) {
          pieces.push(current);
          current = [];
        }
      }
    }

    if (current.length > 1) pieces.push(current);
    return pieces;
  };

  const features = [];
  for (const feature of highways.features || []) {
    const geometry = feature.geometry || {};
    const lines = geometry.type === "LineString"
      ? [geometry.coordinates]
      : geometry.type === "MultiLineString"
        ? geometry.coordinates
        : [];
    const clipped = lines.flatMap(clipLine).filter((line) => line.length > 1);
    if (!clipped.length) continue;
    features.push({
      ...feature,
      geometry: clipped.length === 1
        ? { type: "LineString", coordinates: clipped[0] }
        : { type: "MultiLineString", coordinates: clipped },
    });
  }

  return { type: "FeatureCollection", features };
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

function refreshHighways() {
  if (!app.map || !app.highwayLayer) return;
  const shouldShow = $("highwaysInput").checked;
  if (shouldShow && !app.map.hasLayer(app.highwayLayer)) {
    app.highwayLayer.addTo(app.map);
    bringToFrontSafe(app.highwayLayer);
  } else if (!shouldShow && app.map.hasLayer(app.highwayLayer)) {
    app.map.removeLayer(app.highwayLayer);
  }
  bringToFrontSafe(app.countyLayer);
  bringToFrontSafe(app.retiredMarkerLayer);
  bringToFrontSafe(app.markerLayer);
  bringToFrontSafe(app.targetLayer);
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
  app.countyTask = s.countyTask;
  app.countyFinderDifficulty = s.countyFinderDifficulty;
  setModePill();
  app.requiredCountyNames = new Set();
  app.completedCountyNames = new Set();
  app.retiredCountyResults = new Map();
  clearRetiredSeatDots();
  if (s.mode === "learn") {
    app.sequence = [];
  } else if (s.mode === "city") {
    const usable = app.data.cities.filter((c) => Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon)));
    const sorted = sortRecords(usable, s.order, s.direction);
    app.sequence = s.cityLimit ? sorted.slice(0, s.cityLimit) : sorted;
    if (s.repeatMisses) app.requiredCountyNames = new Set(app.sequence.map(cityQuestionKey));
  } else if (s.mode === "county") {
    const names = app.data.counties.features.map((f) => f.properties.name || f.properties.NAME);
    const sorted = sortCountyNames(names, s.order, s.direction);
    app.sequence = s.countyLimit ? sorted.slice(0, s.countyLimit) : sorted;
    if (s.repeatMisses || s.countyTask === "pick") app.requiredCountyNames = new Set(app.sequence);
  } else if (s.mode === "seat") {
    const sorted = sortCountySeatRecords(countySeatRecords(), s.order, s.direction);
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

function startQuiz() {
  if (!app.data) return;
  buildSequence();
  enterGameMode();
  $("nextButton").classList.add("hidden");
  $("typedAnswerBox").classList.add("hidden");
  setFeedback("");
  requestAnimationFrame(() => {
    if (!app.map) {
      initMap();
    } else {
      app.map.invalidateSize();
      fitNC();
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
  $("questionTitle").textContent = "Learn";
  $("questionHelp").textContent = "Click any county.";
  setFeedback("");
  setStageVisual("learn");
  updateProgressBar();
}

function nextQuestion() {
  app.advanceArmedAt = 0;
  if (app.index >= app.sequence.length) {
    app.stage = "finished";
    resetVisuals();
    $("progressText").textContent = "Finished";
    $("questionTitle").textContent = "Done!";
    $("questionHelp").textContent = `Final score: ${app.scoreCorrect} / ${app.scoreTotal}. Restart with another order or mode to keep learning.`;
    $("nextButton").classList.add("hidden");
    setStageVisual("answered");
    updateProgressBar(true);
    setMapStatus("Session complete.");
    return;
  }
  resetVisuals();
  setFeedback("");
  $("nextButton").classList.add("hidden");
  $("nextButton").textContent = "Click anywhere to continue";
  $("typedAnswerBox").classList.add("hidden");
  updateProgressBar();
  if (app.mode === "city") askCityQuestion();
  if (app.mode === "county" && app.countyTask === "pick") askCountyLocateQuestion();
  if (app.mode === "county" && app.countyTask === "name") askCountyNameQuestion();
  if (app.mode === "seat" && app.countyTask === "pick") askCountySeatPickQuestion();
  if (app.mode === "seat" && app.countyTask === "name") askCountySeatNameQuestion();
}

function askCityQuestion() {
  const s = getSettings();
  const city = app.sequence[app.index];
  app.current = city;
  app.stage = "cityCounty";
  app.cityCountyCorrect = false;
  app.answered = false;
  const star = s.showStars && city.is_county_seat ? " ★" : "";
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = `${city.name}${star}`;
  $("questionHelp").textContent = "Pick the county.";
  setStageVisual("cityCounty");
}

function askCountyLocateQuestion() {
  const county = app.sequence[app.index];
  if (!county) {
    app.stage = "finished";
    $("progressText").textContent = "Finished";
    $("questionTitle").textContent = "Done!";
    $("questionHelp").textContent = "No counties left in this round.";
    setMapStatus("Session complete.");
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
    app.stage = "finished";
    $("progressText").textContent = "Finished";
    $("questionTitle").textContent = "Done!";
    $("questionHelp").textContent = "No county seats left in this round.";
    setMapStatus("Session complete.");
    return;
  }
  app.current = seat;
  app.stage = "countySeatPick";
  app.answered = false;
  $("progressText").textContent = currentProgress();
  $("questionTitle").textContent = seat.name;
  $("questionHelp").textContent = "Pick the county that has this county seat.";
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
  drawCountySeatPoint(seat, "County seat location");
  setSelectedCounty(county, "", "County", "Name the seat shown on the map.");
  setStageVisual("countySeatName");
  setTimeout(() => $("countyNameInput").focus(), 50);
}

function onCountyClick(feature, layer, event) {
  if (app.stage === "answered") {
    advanceIfReady(event && event.originalEvent);
    return;
  }
  if (event && event.originalEvent) {
    L.DomEvent.stop(event.originalEvent);
  }
  const clicked = getCountyName(feature);
  if (app.stage === "cityCounty") {
    handleCityCountyClick(clicked, layer, event && event.latlng);
  } else if (app.stage === "countyLocate") {
    handleCountyLocateClick(clicked, layer);
  } else if (app.stage === "learn") {
    showLearnCounty(clicked, layer);
  } else if (app.stage === "countySeatPick") {
    handleCountySeatPickClick(clicked, layer, event && event.latlng);
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
  app.cityCountyCorrect = countyCorrect;
  app.selectedCounty = clicked;

  const zoomCounty = city.primary_county || (city.counties && city.counties[0]) || clicked;
  clickedLayer.setStyle(countyCorrect ? selectedStyle : wrongStyle);
  const targetLayer = getCountyLayer(zoomCounty);
  if (targetLayer) targetLayer.setStyle(countyCorrect ? correctStyle : targetStyle);

  const correctCountyText = (city.counties || [city.primary_county]).filter(Boolean).join(", ");
  if (countyCorrect && s.testCityPoint) {
    setSelectedCounty(clicked, "good", "Correct county");
    setFeedback(`<span class="good">County accepted.</span> Now click where ${escapeHtml(city.name)} is within the county.`);
    app.stage = "cityPoint";
    setStageVisual("cityPoint");
    $("questionHelp").textContent = `Place it in ${zoomCounty} County. Radius: ${s.threshold} miles.`;
  } else if (countyCorrect) {
    app.scoreTotal += 1;
    app.scoreCorrect += 1;
    recordRepeatProgress(true, city, cityQuestionKey(city));
    updateScore();
    updateProgressBar(true);
    setSelectedCounty(correctCountyText || clicked, "good", "Correct county", "Exact point shown.");
    drawCityTargetPoint(city, `${escapeHtml(city.name)}: exact learning point`);
    setFeedback(`<span class="good">Correct county.</span> ${escapeHtml(city.name)} is in <b>${escapeHtml(countyDisplayName(correctCountyText || clicked))}</b>.`);
    showInfoForCity(city, `<span class="good">County correct.</span> Exact city point shown.`);
    $("questionHelp").textContent = "Exact city point shown.";
    $("nextButton").classList.remove("hidden");
    app.stage = "answered";
    app.answered = true;
    setStageVisual("answered");
  } else {
    app.scoreTotal += 1;
    recordRepeatProgress(false, city, cityQuestionKey(city));
    updateScore();
    updateProgressBar(true);
    setSelectedCounty(correctCountyText, "bad", "Correct county", `You picked ${countyDisplayName(clicked)}.`);
    const guess = clickedLatLng || clickedLayer.getBounds().getCenter();
    const target = { lat: Number(city.lat), lng: Number(city.lon) };
    const dist = milesBetween(guess, target);
    drawCityResult(guess, target, {
      correct: false,
      guessLabel: `${escapeHtml(clicked)} County pick`,
      targetLabel: `${escapeHtml(city.name)}: exact learning point`,
    });
    setFeedback(`<span class="bad">Wrong county.</span> ${escapeHtml(city.name)} is in <b>${escapeHtml(correctCountyText)} County</b>. Your pick was ${dist.toFixed(1)} miles from the city point.${s.repeatMisses ? " It will come back later." : ""}`);
    showInfoForCity(city, `<span class="bad">County missed.</span> Correct county: ${escapeHtml(correctCountyText)}.`);
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

function handleCountySeatPickClick(clicked, layer, clickedLatLng) {
  if (app.stage !== "countySeatPick") return;
  const seat = app.current;
  const targetCounty = seatCountyName(seat);
  const correct = norm(clicked) === norm(targetCounty);
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

  const target = { lat: Number(seat.lat), lng: Number(seat.lon) };
  if (correct) {
    drawCountySeatPoint(seat, `${escapeHtml(seat.name)}: county seat of ${escapeHtml(countyDisplayName(targetCounty))}`);
  } else {
    const guess = clickedLatLng || layer.getBounds().getCenter();
    drawCityResult(guess, target, {
      correct: false,
      guessLabel: `${escapeHtml(clicked)} County pick`,
      targetLabel: `${escapeHtml(seat.name)}: county seat of ${escapeHtml(countyDisplayName(targetCounty))}`,
    });
  }

  setSelectedCounty(
    targetCounty,
    correct ? "good" : "bad",
    correct ? "County seat county" : "Correct county",
    correct ? `${seat.name} is the county seat.` : `You picked ${countyDisplayName(clicked)}.`
  );
  setFeedback(correct
    ? `<span class="good">Correct.</span> ${escapeHtml(seat.name)} is the county seat of <b>${escapeHtml(countyDisplayName(targetCounty))}</b>.`
    : `<span class="bad">Not quite.</span> ${escapeHtml(seat.name)} is the county seat of <b>${escapeHtml(countyDisplayName(targetCounty))}</b>.${repeatMisses ? " It will come back later." : ""}`);
  showInfoForCity(seat, correct
    ? `<span class="good">County correct.</span> County seat of ${escapeHtml(countyDisplayName(targetCounty))}.`
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
  drawCountySeatPoint(seat, `${escapeHtml(seat.name)}: county seat of ${escapeHtml(countyDisplayName(county))}`);
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
  ].join(",")));
}

function advanceIfReady(event) {
  if (app.stage !== "answered") return false;
  if (performance.now() < app.advanceArmedAt) return false;
  if (event && isAdvanceBlockedTarget(event.target)) return false;
  app.index += 1;
  nextQuestion();
  return true;
}

function drawCityResult(clicked, target, options = {}) {
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

  L.circleMarker(target, {
    radius: 8,
    color: targetColor,
    weight: 3,
    fillColor: "#38bdf8",
    fillOpacity: 0.9,
  }).addTo(app.markerLayer).bindPopup(options.targetLabel || "Actual location");

  L.polyline([clicked, target], {
    color: lineColor,
    weight: 2.5,
    opacity: 0.9,
    dashArray: "6,7",
  }).addTo(app.markerLayer);

  if (options.fitResult) fitResultPoints([clicked, target]);
}

function drawCityTargetPoint(city, label = "") {
  const target = { lat: Number(city.lat), lng: Number(city.lon) };
  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return;
  L.circleMarker(target, {
    radius: 8,
    color: "#f8fafc",
    weight: 3,
    fillColor: "#38bdf8",
    fillOpacity: 0.9,
  }).addTo(app.markerLayer).bindPopup(label || `${escapeHtml(city.name)}: exact learning point`);
}

function drawCountySeatPoint(seat, label = "County seat location") {
  const target = { lat: Number(seat.lat), lng: Number(seat.lon) };
  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return;
  L.circleMarker(target, {
    radius: 8,
    color: "#f8fafc",
    weight: 3,
    fillColor: "#f59e0b",
    fillOpacity: 0.95,
  }).addTo(app.markerLayer).bindPopup(label);
}

function retainCountySeatPoint(seat, result) {
  if (!app.retiredMarkerLayer || !shouldKeepRetiredSeatDots()) return;
  const county = seatCountyName(seat);
  const key = norm(county);
  if (!key || app.retiredSeatMarkers.has(key)) return;
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
  const questionCorrect = app.cityCountyCorrect && pointCorrect;

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
  });

  const result = pointCorrect
    ? `<span class="good">Location close enough</span>: ${dist.toFixed(1)} miles away.`
    : `<span class="bad">Too far</span>: ${dist.toFixed(1)} miles away.`;
  const countyResult = app.cityCountyCorrect ? `<span class="good">County correct</span>` : `<span class="bad">County missed</span>`;
  setFeedback(`${countyResult}. ${result} ${questionCorrect ? "Question counted correct." : `Question counted incorrect, but study the real point.${getSettings().repeatMisses ? " It will come back later." : ""}`}`);
  showInfoForCity(city, `${countyResult}. ${result}`);
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
  app.map.on("dragstart", () => document.body.classList.add("map-dragging"));
  app.map.on("dragend", () => document.body.classList.remove("map-dragging"));
  app.map.on("move zoom resize viewreset", scheduleLearnDotUpdate);
  installImageLikeWheelZoom();
  app.learnDotsLayer = document.createElement("div");
  app.learnDotsLayer.className = "learn-dots-layer";
  $("mapWrap").appendChild(app.learnDotsLayer);
  app.retiredMarkerLayer = L.layerGroup().addTo(app.map);
  app.markerLayer = L.layerGroup().addTo(app.map);

  app.highwayLayer = L.geoJSON(clipHighwaysToCounties(app.data.highways, app.data.counties), {
    renderer: app.mapRenderer,
    style: () => highwayStyle,
    interactive: false,
  });

  app.countyLayer = L.geoJSON(app.data.counties, {
    renderer: app.mapRenderer,
    style: () => baseCountyStyle,
    bubblingMouseEvents: false,
    onEachFeature: (feature, layer) => {
      const name = getCountyName(feature);
      app.countyLayersByName.set(norm(name), layer);
      layer.on({
        mouseover: () => {
          app.hoveredCountyName = name;
          app.hoveredCountyLayer = layer;
          if (app.stage === "learn") {
            restoreCountyStyle(name, layer, { hover: true });
          } else if (["cityCounty", "countySeatPick"].includes(app.stage) || app.stage === "countyLocate") {
            layer.setStyle(hoverCountyStyle);
          }
        },
        mouseout: () => {
          if (app.hoveredCountyLayer === layer) {
            app.hoveredCountyName = null;
            app.hoveredCountyLayer = null;
          }
          restoreCountyStyle(name, layer);
        },
        click: (event) => onCountyClick(feature, layer, event),
      });
    },
  }).addTo(app.map);

  app.map.setMaxBounds(app.countyLayer.getBounds().pad(0.5));
  fitNC();
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
    const md = app.data.metadata || {};
    $("dataNotes").textContent = `${fmtNum(md.city_count)} places ready`;
    $("questionTitle").textContent = "Ready";
    $("questionHelp").textContent = "Start a round from the menu.";
    $("progressText").textContent = "Data loaded";
    $("startButton").disabled = false;
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
    const county = city && (city.primary_county || (city.counties && city.counties[0]));
    $("questionHelp").textContent = `Place ${city ? city.name : "the city"}${county ? ` within ${county} County` : ""}. Radius: ${getSettings().threshold} miles.`;
  }
});
$("cityPointTestInput").addEventListener("change", updateModeButtons);
$("highwaysInput").addEventListener("change", refreshHighways);
$("modeSelect").addEventListener("change", updateModeButtons);
$("orderSelect").addEventListener("change", () => {
  if ($("orderSelect").value === "population") $("directionSelect").value = "desc";
  updateModeButtons();
});
document.querySelectorAll('input[name="countyTask"]').forEach((input) => {
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
document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("keydown", (event) => {
  toggleHoveredLearnCountyKnown(event);
  if (event.key === "Escape") setSettingsOpen(false);
});
document.addEventListener("mouseup", () => document.body.classList.remove("map-dragging"));
document.addEventListener("click", (event) => {
  advanceIfReady(event);
});
window.addEventListener("blur", () => document.body.classList.remove("map-dragging"));
$("fitButton").addEventListener("click", () => {
  refitCurrentView();
});
$("quitButton").addEventListener("click", quitToMenu);
$("startButton").addEventListener("click", startQuiz);
$("nextButton").addEventListener("click", () => {
  app.index += 1;
  nextQuestion();
});
$("submitNameButton").addEventListener("click", handleCountyNameSubmit);
$("countyNameInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCountyNameSubmit();
});

const dockObserver = new MutationObserver(updateDockVisibility);
["feedback", "selectedCounty", "typedAnswerBox", "nextButton"].forEach((id) => {
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
