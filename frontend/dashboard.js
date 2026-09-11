// IA Match — dashboard méta public (agrégats anonymisés, cf. brief section 5).

// Doit rester synchronisé avec SYCOPHANCY_CATEGORIES côté backend (et app.js).
const CATEGORY_LABELS = {
  feedback_sycophancy: "Sycophantie de feedback",
  are_you_sure_sycophancy: "Sycophantie « t'es sûr ? »",
  answer_sycophancy: "Sycophantie de réponse",
  mimicry_sycophancy: "Sycophantie de mimétisme",
  concession_legitime: "Concession légitime",
  contre_argument_ferme: "Contre-argument ferme",
};

const contentEl = document.getElementById("dashboard-content");
const modelFilterEl = document.getElementById("model-filter");

function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  return div.firstElementChild;
}

function renderCategoryFrequency(categoryFrequency) {
  const max = Math.max(1, ...categoryFrequency.map((c) => c.count));
  const rows = categoryFrequency
    .map((c) => {
      const label = CATEGORY_LABELS[c.category] || c.category;
      const pct = Math.round((c.count / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label">${label}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-count">${c.count}</div>
        </div>`;
    })
    .join("");
  return el(`<div class="dashboard-block"><h2>Fréquence des réponses IA</h2>${rows}</div>`);
}

function renderThemeSplit(matrix) {
  const byTheme = {};
  matrix.forEach((row) => {
    if (!byTheme[row.theme]) byTheme[row.theme] = { concede: 0, counter: 0 };
    if (row.category === "concession_legitime") byTheme[row.theme].concede += row.count;
    if (row.category === "contre_argument_ferme") byTheme[row.theme].counter += row.count;
  });

  const themes = Object.entries(byTheme).filter(([, v]) => v.concede + v.counter > 0);

  if (themes.length === 0) {
    return el(
      `<div class="dashboard-block"><h2>Thèmes : concession vs contre-argument</h2>
        <p class="empty-state">Pas encore assez de données sur ces deux catégories.</p></div>`
    );
  }

  const rows = themes
    .map(([theme, v]) => {
      const total = v.concede + v.counter;
      const concedePct = Math.round((v.concede / total) * 100);
      return `
        <div class="theme-row">
          <div class="theme-name">${theme}</div>
          <div class="theme-split">
            <div class="split-concede" style="width:${concedePct}%"></div>
            <div class="split-counter" style="width:${100 - concedePct}%"></div>
          </div>
        </div>`;
    })
    .join("");

  return el(`
    <div class="dashboard-block">
      <h2>Thèmes : concession vs contre-argument</h2>
      ${rows}
      <div class="theme-legend">
        <span class="legend-concede">Concession légitime</span>
        <span class="legend-counter">Contre-argument ferme</span>
      </div>
    </div>`);
}

function renderTimeline(timeline) {
  if (timeline.length === 0) {
    return el(`<div class="dashboard-block"><h2>Évolution dans le temps</h2>
      <p class="empty-state">Pas encore de données.</p></div>`);
  }
  const max = Math.max(1, ...timeline.map((t) => t.count));
  const rows = timeline
    .map((t) => {
      const pct = Math.round((t.count / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label">${t.date}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-count">${t.count}</div>
        </div>`;
    })
    .join("");
  return el(`<div class="dashboard-block"><h2>Évolution dans le temps</h2>${rows}</div>`);
}

function populateModelFilter(models, selected) {
  // Ne repeuple que si ce n'est pas déjà fait, pour ne pas perturber une
  // sélection en cours si l'utilisateur rouvre le menu pendant un refetch.
  if (modelFilterEl.dataset.populated === "true") return;
  models.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelFilterEl.appendChild(opt);
  });
  modelFilterEl.value = selected || "";
  modelFilterEl.dataset.populated = "true";
}

async function loadDashboard(model) {
  try {
    const url = model ? `/api/dashboard?model=${encodeURIComponent(model)}` : "/api/dashboard";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    populateModelFilter(data.available_models, data.selected_model);

    contentEl.innerHTML = "";

    if (data.total_exchanges === 0) {
      contentEl.appendChild(
        el(`<p class="empty-state">Aucune partie enregistrée pour l'instant${model ? " pour ce modèle" : ""}.</p>`)
      );
      return;
    }

    contentEl.appendChild(
      el(`<div class="dashboard-block">
            <h2>Échanges analysés</h2>
            <p class="total-count">${data.total_exchanges}</p>
          </div>`)
    );
    contentEl.appendChild(renderCategoryFrequency(data.category_frequency));
    contentEl.appendChild(renderThemeSplit(data.theme_category_matrix));
    contentEl.appendChild(renderTimeline(data.timeline));
  } catch (err) {
    contentEl.innerHTML = "";
    contentEl.appendChild(
      el(`<p class="empty-state">Impossible de charger le tableau de bord (${err.message}).</p>`)
    );
  }
}

modelFilterEl.addEventListener("change", () => {
  loadDashboard(modelFilterEl.value || undefined);
});

loadDashboard();
