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

  const themes = Object.entries(byTheme);
  if (themes.length === 0) {
    return el(`<div class="dashboard-block"><h2>Répartition par thème</h2>
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

  return el(`<div class="dashboard-block"><h2>Répartition par thème</h2>${rows}</div>`);
}

// Courbe SVG à la main (pas de librairie de graphiques, cf. stack "sans
// étape de build") plutôt qu'une barre par jour : plus lisible pour repérer
// une tendance sur plusieurs jours une fois l'usage réel accumulé.
function buildTimelineSvg(timeline) {
  const width = 600;
  const height = 220;
  const padLeft = 28;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 28;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const n = timeline.length;
  const maxCount = Math.max(1, ...timeline.map((t) => t.count));
  const xFor = (i) => padLeft + (n === 1 ? innerWidth / 2 : (innerWidth * i) / (n - 1));
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

  const linePoints = timeline.map((t, i) => `${xFor(i)},${yFor(t.count)}`).join(" ");
  const areaPoints = `${xFor(0)},${yFor(0)} ${linePoints} ${xFor(n - 1)},${yFor(0)}`;

  const area = document.createElementNS(svgNS, "polygon");
  area.setAttribute("points", areaPoints);
  area.setAttribute("class", "timeline-area");
  svg.appendChild(area);

  const polyline = document.createElementNS(svgNS, "polyline");
  polyline.setAttribute("points", linePoints);
  polyline.setAttribute("class", "timeline-line");
  svg.appendChild(polyline);

  timeline.forEach((t, i) => {
    const x = xFor(i);
    const y = yFor(t.count);

    const point = document.createElementNS(svgNS, "circle");
    point.setAttribute("cx", x);
    point.setAttribute("cy", y);
    point.setAttribute("r", 3.5);
    point.setAttribute("class", "timeline-point");
    svg.appendChild(point);

    const dateLabel = document.createElementNS(svgNS, "text");
    dateLabel.setAttribute("x", x);
    dateLabel.setAttribute("y", height - padBottom + 16);
    dateLabel.setAttribute("class", "timeline-label");
    dateLabel.setAttribute("text-anchor", "middle");
    dateLabel.textContent = t.date.slice(5); // MM-JJ, plus compact que la date complète
    svg.appendChild(dateLabel);
  });

  return svg;
}

function renderTimeline(timeline) {
  if (timeline.length === 0) {
    return el(`<div class="dashboard-block"><h2>Évolution dans le temps</h2>
      <p class="empty-state">Pas encore de données.</p></div>`);
  }
  const block = el(`<div class="dashboard-block"><h2>Évolution dans le temps</h2></div>`);
  block.appendChild(buildTimelineSvg(timeline));
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
