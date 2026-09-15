// IA Match — dashboard méta public (agrégats anonymisés, cf. brief section 5).

// Doit rester synchronisé avec SYCOPHANCY_CATEGORIES côté backend (et app.js).
const CATEGORY_LABELS = {
  feedback_sycophancy: "Compliment complaisant",
  are_you_sure_sycophancy: "Recule sous la pression",
  answer_sycophancy: "Dit ce qu'on veut entendre",
  mimicry_sycophancy: "Suit l'erreur du joueur",
  concession_legitime: "Concession légitime",
  contre_argument_ferme: "Contre-argument ferme",
  refus_jeu: "Refuse de jouer le jeu",
};

const contentEl = document.getElementById("dashboard-content");
const modelFilterEl = document.getElementById("model-filter");

// "category" et "theme" viennent de la base (produits par le modèle-analyste,
// pas de code contrôlé côté serveur) et sont affichés à tout visiteur de
// cette page publique — échappement systématique avant interpolation dans
// un template innerHTML pour ne pas rouvrir la XSS stockée corrigée ici.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
          <div class="bar-label">${escapeHtml(label)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-count">${c.count}</div>
        </div>`;
    })
    .join("");
  return el(`<div class="dashboard-block"><h2>Fréquence des réponses IA</h2>${rows}</div>`);
}

// Une phrase par thème plutôt qu'un graphique à 2 catégories fixes (l'ancien
// découpage concession/contre-argument ignorait les 4 autres catégories : un
// thème dominé par le compliment complaisant, par exemple, apparaissait à
// tort comme "sans données"). Toutes les catégories comptent ici.
function renderThemeBreakdown(matrix) {
  const byTheme = {};
  matrix.forEach((row) => {
    if (!byTheme[row.theme]) byTheme[row.theme] = {};
    byTheme[row.theme][row.category] = (byTheme[row.theme][row.category] || 0) + row.count;
  });

  // Triés par nombre d'échanges décroissant : sans ça, l'ordre dépend d'un
  // GROUP BY SQL sans ORDER BY (arbitraire), et "autre" pouvait apparaître en
  // premier par pur hasard de tri plutôt que parce qu'il domine réellement.
  const themes = Object.entries(byTheme).sort(
    (a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0)
  );
  if (themes.length === 0) {
    return el(`<div class="dashboard-block"><h2>Répartition par thème (joueur)</h2>
      <p class="empty-state">Pas encore de données.</p></div>`);
  }

  const rows = themes
    .map(([theme, categories]) => {
      const total = Object.values(categories).reduce((a, b) => a + b, 0);
      const detail = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `${escapeHtml(CATEGORY_LABELS[cat] || cat)} (${count})`)
        .join(", ");
      return `
        <div class="theme-breakdown-row">
          <div class="theme-breakdown-head">
            <strong>${escapeHtml(theme)}</strong>
            <span class="theme-breakdown-count">${total} échange${total > 1 ? "s" : ""}</span>
          </div>
          <p class="theme-breakdown-detail">${detail}</p>
        </div>`;
    })
    .join("");

  return el(`<div class="dashboard-block"><h2>Répartition par thème (joueur)</h2>${rows}</div>`);
}

// Regroupe les lignes plates (date, modèle, count) de l'API en un total par
// jour + un détail par modèle ce même jour — ordre déjà chronologique côté
// SQL (ORDER BY d ASC), donc pas besoin de re-trier ici.
function pivotTimeline(rows) {
  const byDate = new Map();
  rows.forEach((r) => {
    if (!byDate.has(r.date)) byDate.set(r.date, { date: r.date, total: 0, byModel: {} });
    const entry = byDate.get(r.date);
    entry.total += r.count;
    entry.byModel[r.model] = (entry.byModel[r.model] || 0) + r.count;
  });
  return Array.from(byDate.values());
}

// Couleur déterministe par modèle (angle doré : bien répartie quel que soit
// le nombre de modèles présents, pas de palette figée à entretenir).
function modelColor(index) {
  return `hsl(${Math.round((index * 137.5) % 360)}, 60%, 50%)`;
}

// Histogramme SVG à la main (pas de librairie de graphiques, cf. stack "sans
// étape de build") : une courbe/aire avec un seul jour de données n'affiche
// qu'un point isolé, illisible et donnant l'impression d'un graphique cassé.
// Une barre générale par jour, accolée d'une barre par modèle quand plus
// d'un modèle est présent (aucun filtre "Modèle" actif) — dégénère en une
// simple barre par jour dès qu'un seul modèle est en jeu (filtre actif, ou
// données qui n'en contiennent qu'un pour l'instant).
function buildTimelineSvg(days, models) {
  const width = 600;
  const height = 220;
  const padLeft = 28;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 28;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const n = days.length;
  const showModelBars = models.length > 1;
  const barsPerSlot = showModelBars ? models.length + 1 : 1;
  const maxCount = Math.max(1, ...days.map((d) => d.total));
  const slotWidth = innerWidth / n;
  const gap = 2;
  const barWidth = Math.min(showModelBars ? 14 : 36, (slotWidth - gap * (barsPerSlot - 1)) / barsPerSlot);
  const clusterWidth = barWidth * barsPerSlot + gap * (barsPerSlot - 1);
  const xForSlot = (i) => padLeft + slotWidth * (i + 0.5);
  const yFor = (v) => padTop + innerHeight - (v / maxCount) * innerHeight;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "timeline-svg");

  [0, 0.5, 1].forEach((frac) => {
    const y = padTop + innerHeight - frac * innerHeight;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", padLeft);
    line.setAttribute("x2", width - padRight);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", "timeline-grid");
    svg.appendChild(line);

    const axisLabel = document.createElementNS(svgNS, "text");
    axisLabel.setAttribute("x", 2);
    axisLabel.setAttribute("y", y - 3);
    axisLabel.setAttribute("class", "timeline-axis-label");
    axisLabel.textContent = String(Math.round(frac * maxCount));
    svg.appendChild(axisLabel);
  });

  days.forEach((day, i) => {
    const clusterStart = xForSlot(i) - clusterWidth / 2;

    const totalTop = yFor(day.total);
    const totalBar = document.createElementNS(svgNS, "rect");
    totalBar.setAttribute("x", clusterStart);
    totalBar.setAttribute("y", totalTop);
    totalBar.setAttribute("width", barWidth);
    totalBar.setAttribute("height", Math.max(0, padTop + innerHeight - totalTop));
    totalBar.setAttribute("rx", 2);
    totalBar.setAttribute("class", "timeline-bar-total");
    svg.appendChild(totalBar);

    const totalLabel = document.createElementNS(svgNS, "text");
    totalLabel.setAttribute("x", clusterStart + barWidth / 2);
    totalLabel.setAttribute("y", totalTop - 5);
    totalLabel.setAttribute("class", "timeline-count-label");
    totalLabel.setAttribute("text-anchor", "middle");
    totalLabel.textContent = String(day.total);
    svg.appendChild(totalLabel);

    if (showModelBars) {
      models.forEach((m, mi) => {
        const count = day.byModel[m] || 0;
        const x = clusterStart + (mi + 1) * (barWidth + gap);
        const top = yFor(count);
        const bar = document.createElementNS(svgNS, "rect");
        bar.setAttribute("x", x);
        bar.setAttribute("y", top);
        bar.setAttribute("width", barWidth);
        bar.setAttribute("height", Math.max(0, padTop + innerHeight - top));
        bar.setAttribute("rx", 2);
        bar.setAttribute("class", "timeline-model-bar");
        bar.setAttribute("fill", modelColor(mi));
        svg.appendChild(bar);
      });
    }

    const dateLabel = document.createElementNS(svgNS, "text");
    dateLabel.setAttribute("x", xForSlot(i));
    dateLabel.setAttribute("y", height - padBottom + 16);
    dateLabel.setAttribute("class", "timeline-label");
    dateLabel.setAttribute("text-anchor", "middle");
    dateLabel.textContent = day.date.slice(5); // MM-JJ, plus compact que la date complète
    svg.appendChild(dateLabel);
  });

  return svg;
}

function buildTimelineLegend(models) {
  if (models.length <= 1) return null;
  const legend = document.createElement("div");
  legend.className = "timeline-legend";
  const items = [`<span class="timeline-legend-item"><span class="timeline-swatch timeline-swatch-total"></span>Total</span>`].concat(
    models.map(
      (m, i) =>
        `<span class="timeline-legend-item"><span class="timeline-swatch" style="background:${modelColor(i)}"></span>${escapeHtml(m)}</span>`
    )
  );
  legend.innerHTML = items.join("");
  return legend;
}

function renderTimeline(timeline) {
  if (timeline.length === 0) {
    return el(`<div class="dashboard-block"><h2>Évolution dans le temps</h2>
      <p class="empty-state">Pas encore de données.</p></div>`);
  }
  const days = pivotTimeline(timeline);
  const models = Array.from(new Set(timeline.map((r) => r.model))).sort();
  const compare = models.length > 1 ? ", barre générale et une barre par modèle" : "";
  const block = el(`<div class="dashboard-block">
    <h2>Évolution dans le temps</h2>
    <p class="block-subtitle">Nombre d'échanges (réplique + réponse IA) analysés par jour${compare}.</p>
  </div>`);
  const legend = buildTimelineLegend(models);
  if (legend) block.appendChild(legend);
  block.appendChild(buildTimelineSvg(days, models));
  return block;
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
    contentEl.appendChild(renderThemeBreakdown(data.theme_category_matrix));
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
