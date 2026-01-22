// ===== Recommender UI =====

const RS_FEATURES = [
  { key: "country", label: "Country", type: "categorical" },
  { key: "status", label: "Status (present stage)", type: "categorical" },
  { key: "duration", label: "Duration (end_year - begin_year)", type: "numeric" },
  { key: "nbs_area", label: "NbS Area (m²)", type: "numeric" },
  { key: "previous_area_type", label: "Area Before Intervention", type: "categorical" },
  { key: "total_cost", label: "Total Cost", type: "numeric" },
  { key: "sources_of_funding", label: "Sources of Funding", type: "multitag" },
];
let RS_META = null;

function el(id) { return document.getElementById(id); }

function togglePanel(buttonId, panelId) {
  const btn = el(buttonId);
  const panel = el(panelId);
  if (!btn || !panel) return;
  btn.addEventListener("click", () => {
    panel.classList.toggle("open");
  });
}

function renderFeatureChips() {
  const available = el("rs-available");
  const selected = el("rs-selected");
  available.innerHTML = "";
  selected.innerHTML = "";

  RS_FEATURES.forEach(f => {
    const div = document.createElement("div");
    div.className = "rs-item";
    div.textContent = f.label;
    div.dataset.key = f.key;
    div.dataset.type = f.type;
    available.appendChild(div);
  });

  new Sortable(available, {
    group: "rs",
    animation: 150,
    onSort: rebuildPreferenceInputs,
    onAdd: rebuildPreferenceInputs,
    onRemove: rebuildPreferenceInputs,
  });

  new Sortable(selected, {
    group: "rs",
    animation: 150,
    onSort: rebuildPreferenceInputs,
    onAdd: rebuildPreferenceInputs,
    onRemove: rebuildPreferenceInputs,
  });
}

function getSelectedFeatureKeys() {
  const selected = el("rs-selected");
  return Array.from(selected.querySelectorAll(".rs-item")).map(x => x.dataset.key);
}

function buildSelectInput(featureKey, label, options) {
  const wrapper = document.createElement("div");
  wrapper.className = "mb-2";

  const lab = document.createElement("label");
  lab.className = "form-label";
  lab.textContent = label;

  const select = document.createElement("select");
  select.className = "form-select";
  select.id = `rs-pref-${featureKey}`;

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "(optional)";
  select.appendChild(empty);

  options.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });

  wrapper.appendChild(lab);
  wrapper.appendChild(select);
  return wrapper;
}

function buildNumberInput(featureKey, label, range) {
  const wrapper = document.createElement("div");
  wrapper.className = "mb-2";

  const lab = document.createElement("label");
  lab.className = "form-label";
  lab.textContent = `${label} (optional)`;

  const input = document.createElement("input");
  input.type = "number";
  input.className = "form-control";
  input.id = `rs-pref-${featureKey}`;
  if (range && Number.isFinite(range.min)) input.min = range.min;
  if (range && Number.isFinite(range.max)) input.max = range.max;
  input.placeholder = range ? `min ${range.min} / max ${range.max}` : "";

  wrapper.appendChild(lab);
  wrapper.appendChild(input);
  return wrapper;
}

function buildMultiSelect(featureKey, label, options) {
  const wrapper = document.createElement("div");
  wrapper.className = "mb-2";

  const lab = document.createElement("label");
  lab.className = "form-label";
  lab.textContent = `${label} (optional, multi-select)`;

  const select = document.createElement("select");
  select.className = "form-select";
  select.id = `rs-pref-${featureKey}`;
  select.multiple = true;
  select.size = Math.min(8, Math.max(4, options.length));

  options.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });

  wrapper.appendChild(lab);
  wrapper.appendChild(select);
  return wrapper;
}

function rebuildPreferenceInputs() {
  const box = el("rs-preferences");
  box.innerHTML = "";

  const keys = getSelectedFeatureKeys();
  if (!RS_META) return;

  keys.forEach(key => {
    const f = RS_FEATURES.find(x => x.key === key);
    if (!f) return;

    if (f.type === "categorical") {
      const opts = (RS_META.categorical && RS_META.categorical[key]) ? RS_META.categorical[key] : [];
      box.appendChild(buildSelectInput(key, f.label, opts));
    }

    if (f.type === "numeric") {
      const range = (RS_META.numeric_ranges && RS_META.numeric_ranges[key]) ? RS_META.numeric_ranges[key] : null;
      box.appendChild(buildNumberInput(key, f.label, range));
    }

    if (f.type === "multitag") {
      const opts = RS_META.funding_tags || [];
      box.appendChild(buildMultiSelect(key, f.label, opts));
    }
  });
}

function getPreferencesFromInputs() {
  const prefs = {};
  const keys = getSelectedFeatureKeys();

  keys.forEach(key => {
    const input = el(`rs-pref-${key}`);
    if (!input) return;

    if (input.multiple) {
      const values = Array.from(input.selectedOptions).map(o => o.value).filter(v => v);
      if (values.length) prefs[key] = values;
      return;
    }

    const v = input.value;
    if (v !== "" && v != null) {
      if (["duration", "nbs_area", "total_cost"].includes(key)) {
        const num = Number(v);
        if (!Number.isNaN(num)) prefs[key] = num;
      } else {
        prefs[key] = v;
      }
    }
  });

  return prefs;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString();
}

/**
 * Results renderer:
 * - Numbers the projects
 * - Shows key dataset fields
 * - Link at the bottom
 * - No similarity shown
 * - Adds class "rs-card" so CSS grid styling works
 */
function renderRSResults(items) {
  const panel = el("rs-results-panel");
  const list = el("rs-results-list");
  list.innerHTML = "";

  panel.classList.remove("hidden");

  if (!items || !items.length) {
    list.innerHTML = "<div class='text-muted'>No recommendations returned.</div>";
    return;
  }

  const IMPORTANT_FIELDS = [
    { key: "status", label: "Status" },
    { key: "total_cost", label: "Total cost (€)", fmt: formatNumber },
    { key: "nbs_area", label: "NbS area (m²)", fmt: formatNumber },
    { key: "duration", label: "Duration (years)", fmt: formatNumber },
    { key: "previous_area_type", label: "Area before" },
    { key: "sources_of_funding", label: "Funding" },
    { key: "spatial_scale", label: "Spatial scale" },
    { key: "nbs_type", label: "NbS type" },
  ];

  items.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "rs-card"; // <-- IMPORTANT for boxed grid styling

    const title = `${i + 1}. ${item.intervention_name || "(no title)"}`;
    const city = item.city || "";
    const country = item.country || "";

    const linkHtml = item.link
      ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">open</a>`
      : "";

    const detailsLines = IMPORTANT_FIELDS
      .filter(f => item[f.key] != null && String(item[f.key]).trim() !== "")
      .map(f => {
        const raw = item[f.key];
        const value = f.fmt ? f.fmt(raw) : String(raw);
        return `<div class="small"><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(value)}</div>`;
      })
      .join("");

    card.innerHTML = `
      <div class="fw-semibold">${escapeHtml(title)}</div>
      <div class="small text-muted">${escapeHtml(city)}${city && country ? ", " : ""}${escapeHtml(country)}</div>
      <div class="mt-1">${detailsLines}</div>
      <div class="small mt-1">${linkHtml}</div>
    `;

    list.appendChild(card);
  });
}

async function loadRSMeta() {
  const res = await fetch("/api/rs-meta");
  RS_META = await res.json();
}

async function runRecommendation() {
  const selected_features = getSelectedFeatureKeys();
  const preferences = getPreferencesFromInputs();
  const k = Number(el("rs-k").value);

  const payload = { selected_features, preferences, k };

  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const items = await res.json();
  renderRSResults(items);
}

function initKSlider() {
  const slider = el("rs-k");
  const label = el("rs-k-label");
  const sync = () => label.textContent = slider.value;
  slider.addEventListener("input", sync);
  sync();
}

document.addEventListener("DOMContentLoaded", async () => {
  togglePanel("rs-filter", "rs-panel");

  initKSlider();
  renderFeatureChips();

  await loadRSMeta();
  rebuildPreferenceInputs();

  el("rs-run").addEventListener("click", runRecommendation);
});
