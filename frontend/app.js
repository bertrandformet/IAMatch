// IA Match — logique du jeu (mode individuel/collectif, round, synthèse,
// affichage SMS). Le joueur affirme "Contrairement à une IA, je…" (ou
// "... nous…" en collectif), l'IA répond puis relance en miroir avec
// "Contrairement à un humain, je…" (voir ROUND_SYSTEM_PROMPT côté backend).

const setupScreen = document.getElementById("setup-screen");
const gameScreen = document.getElementById("game-screen");
const modeGroup = document.getElementById("mode-group");
const modeHint = document.getElementById("mode-hint");
const modelSelect = document.getElementById("model-select");
const roundsGroup = document.getElementById("rounds-group");
const timerGroup = document.getElementById("timer-group");
const timerHint = document.getElementById("timer-hint");
const timerDurationField = document.getElementById("timer-duration-field");
const timerDurationInput = document.getElementById("timer-duration");
const startBtn = document.getElementById("start-btn");
const setupError = document.getElementById("setup-error");
const quickSummary = document.getElementById("quick-summary");
const customizeToggle = document.getElementById("customize-toggle");
const advancedFields = document.getElementById("advanced-fields");

const consentModal = document.getElementById("consent-modal");
const consentCancelBtn = document.getElementById("consent-cancel-btn");
const consentAcceptBtn = document.getElementById("consent-accept-btn");

const roundCounterEl = document.getElementById("round-counter");
const modelNameLabel = document.getElementById("model-name-label");
const timerBadge = document.getElementById("timer-badge");
const collectifBanner = document.getElementById("collectif-banner");
const neuralAvatar = document.getElementById("neural-avatar");
const messagesEl = document.getElementById("messages");
const piqueInput = document.getElementById("pique-input");
const sendBtn = document.getElementById("send-btn");
const composer = document.getElementById("composer");

let state = {
  mode: "individuel",
  model: null,
  totalRounds: 4,
  timerEnabled: false,
  timerDuration: 30,
  currentRound: 0,
  history: [], // [{role: "user"|"assistant", content: string}]
  waitingForAi: false,
  timerInterval: null,
  timeLeft: 0,
  aiCaptionEls: [], // une entrée par réponse IA, dans l'ordre, pour l'annotation post-synthèse
  piquePrefix: "Contrairement à une IA, je ", // pré-rempli ; "... nous " en collectif
};

function resetPiqueInputToPrefix() {
  piqueInput.value = state.piquePrefix;
  // place le curseur juste après le préfixe plutôt qu'au début du champ
  piqueInput.setSelectionRange(state.piquePrefix.length, state.piquePrefix.length);
}

// Doit rester synchronisé avec THEMES côté backend (backend/app/main.py).
const THEMES = [
  "corps", "émotions", "autonomie économique", "créativité",
  "faillibilité", "droit", "perception", "autre",
];

// Doit rester synchronisé avec SYCOPHANCY_CATEGORIES côté backend.
const CATEGORY_LABELS = {
  feedback_sycophancy: "Compliment complaisant",
  are_you_sure_sycophancy: "Recule sous la pression",
  answer_sycophancy: "Dit ce qu'on veut entendre",
  mimicry_sycophancy: "Suit l'erreur du joueur",
  concession_legitime: "Concession légitime",
  contre_argument_ferme: "Contre-argument ferme",
  refus_jeu: "Refuse de jouer le jeu",
};

// Ordre fixe des catégories pour l'axe du radar IA (doit rester synchronisé
// avec SYCOPHANCY_CATEGORIES côté backend). Le radar utilise CATEGORY_LABELS
// (les libellés complets, identiques au détail par tour) : un ancien jeu de
// libellés abrégés distincts causait une incohérence (ex. "Feedback" sur le
// radar vs "Compliment complaisant" dans le détail, pour la même catégorie).
const SYCOPHANCY_CATEGORIES = [
  "feedback_sycophancy", "are_you_sure_sycophancy",
  "answer_sycophancy", "mimicry_sycophancy",
  "concession_legitime", "contre_argument_ferme",
  "refus_jeu",
];

// Carrousel de présentation (écran d'accueil) : synchronise les puces avec
// le défilement réel (au lieu d'un premier point figé), et fait défiler
// automatiquement les cartes tant que personne n'y touche.
const introCarousel = document.querySelector(".intro-carousel");
if (introCarousel) {
  const introDots = document.querySelectorAll(".intro-dots span");
  const introCards = introCarousel.querySelectorAll(".intro-card");

  const cardOffsets = () => {
    const rect = introCarousel.getBoundingClientRect();
    return Array.from(introCards).map(
      (card) => card.getBoundingClientRect().left - rect.left + introCarousel.scrollLeft
    );
  };

  const closestCardIndex = (offsets, pos) =>
    offsets.reduce((best, offset, i) => (Math.abs(offset - pos) < Math.abs(offsets[best] - pos) ? i : best), 0);

  let scrollSyncTimeout;
  introCarousel.addEventListener("scroll", () => {
    clearTimeout(scrollSyncTimeout);
    scrollSyncTimeout = setTimeout(() => {
      const active = closestCardIndex(cardOffsets(), introCarousel.scrollLeft);
      introDots.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
    }, 80);
  });

  const introAutoplay = setInterval(() => {
    const offsets = cardOffsets();
    const current = closestCardIndex(offsets, introCarousel.scrollLeft);
    const next = (current + 1) % offsets.length;
    introCarousel.scrollTo({ left: offsets[next], behavior: "smooth" });
  }, 5500);

  ["touchstart", "mousedown", "wheel"].forEach((evt) => {
    introCarousel.addEventListener(evt, () => clearInterval(introAutoplay), { once: true, passive: true });
  });
}

async function loadModels() {
  try {
    const res = await fetch("/api/models");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.models || data.models.length === 0) {
      throw new Error("Aucun modèle disponible.");
    }
    modelSelect.innerHTML = "";
    data.models.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.id;
      modelSelect.appendChild(opt);
    });
    startBtn.disabled = false;
  } catch (err) {
    setupError.textContent =
      "Impossible de récupérer la liste des modèles de langage (" + err.message + "). " +
      "Vérifie que le backend tourne et que ALBERT_API_KEY est configurée dans .env.";
    setupError.style.display = "block";
    startBtn.disabled = true;
  }
}

function getChoiceValue(group) {
  return group.querySelector(".btn-choice.is-active").dataset.value;
}

function setupChoiceGroup(group, onChange) {
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-choice");
    if (!btn || btn.classList.contains("is-active")) return;
    group.querySelectorAll(".btn-choice").forEach((b) => b.classList.toggle("is-active", b === btn));
    if (onChange) onChange(btn.dataset.value);
  });
}

setupChoiceGroup(modeGroup, (value) => {
  modeHint.style.display = value === "collectif" ? "block" : "none";
});
setupChoiceGroup(roundsGroup);
setupChoiceGroup(timerGroup, (value) => {
  const spontane = value === "spontane";
  timerDurationField.style.display = spontane ? "block" : "none";
  timerHint.textContent = spontane
    ? "Réponds dans le temps imparti, quitte à improviser."
    : "Sans limite de temps : construis ton argument tranquillement.";
});

customizeToggle.addEventListener("click", () => {
  advancedFields.style.display = "block";
  quickSummary.style.display = "none";
  customizeToggle.style.display = "none";
});

// Le clic sur « Lancer la partie » ouvre systématiquement la pop-up
// d'information/consentement (interaction avec une IA, rappel anti-données
// sensibles, anonymisation) : la partie ne démarre réellement qu'à
// l'acceptation explicite. Sans accord, pas de jeu.
startBtn.addEventListener("click", () => {
  consentModal.style.display = "flex";
});

consentCancelBtn.addEventListener("click", () => {
  consentModal.style.display = "none";
});

consentAcceptBtn.addEventListener("click", () => {
  consentModal.style.display = "none";
  beginGame();
});

function beginGame() {
  state.mode = getChoiceValue(modeGroup);
  state.model = modelSelect.value;
  state.totalRounds = parseInt(getChoiceValue(roundsGroup), 10);
  state.timerEnabled = getChoiceValue(timerGroup) === "spontane";
  state.timerDuration = parseInt(timerDurationInput.value, 10) || 30;
  state.currentRound = 1;
  state.history = [];

  state.piquePrefix = state.mode === "collectif" ? "Contrairement à une IA, nous " : "Contrairement à une IA, je ";

  modelNameLabel.textContent = state.model;
  updateRoundCounter();
  collectifBanner.style.display = state.mode === "collectif" ? "block" : "none";

  setupScreen.classList.remove("active");
  gameScreen.classList.add("active");

  if (state.timerEnabled) {
    timerBadge.style.display = "inline-block";
    startTimer();
  }

  resetPiqueInputToPrefix();
  piqueInput.focus();
}

function updateRoundCounter() {
  // Une fois le dernier tour joué, state.currentRound dépasse totalRounds
  // (incrémenté pour détecter la fin de partie) : on plafonne l'affichage
  // plutôt que de montrer "Tour 3 / 2".
  const displayedRound = Math.min(state.currentRound, state.totalRounds);
  roundCounterEl.textContent = `Tour ${displayedRound} / ${state.totalRounds}`;
}

function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = state.timerDuration;
  renderTimer();
  state.timerInterval = setInterval(() => {
    state.timeLeft -= 1;
    renderTimer();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      onTimerExpired();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  timerBadge.classList.remove("time-up");
}

function renderTimer() {
  timerBadge.textContent = `${Math.max(state.timeLeft, 0)}s`;
  timerBadge.classList.toggle("time-up", state.timeLeft <= 0);
}

function onTimerExpired() {
  // V1 : le timer force l'envoi si une pique est déjà tapée (réponse spontanée,
  // cf. Kahneman/Système 1 dans le brief). Le champ étant pré-rempli avec le
  // préfixe, on ne force l'envoi que si le joueur a ajouté du texte derrière —
  // sinon on laisse simplement le badge signaler le dépassement plutôt que
  // d'envoyer une affirmation vide de sens.
  const typed = piqueInput.value.trim();
  if (typed && typed !== state.piquePrefix.trim() && !state.waitingForAi) {
    sendPique();
  }
}

function addBubble(role, text) {
  const row = document.createElement("div");
  row.className = `bubble-row ${role === "user" ? "player" : "ai"}`;

  const bubble = document.createElement("div");
  bubble.className = `bubble ${role === "user" ? "player" : "ai"}`;
  bubble.textContent = text;

  if (role === "assistant") {
    bubble.setAttribute("data-ai-generated", "true");
  }

  row.appendChild(bubble);

  if (role === "assistant") {
    const caption = document.createElement("div");
    caption.className = "ai-caption";
    caption.textContent = "Contenu généré par IA";
    row.appendChild(caption);
    state.aiCaptionEls.push(caption);
  }

  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}

function addLoadingBubble() {
  const row = document.createElement("div");
  row.className = "bubble-row ai";
  const bubble = document.createElement("div");
  bubble.className = "bubble ai loading";
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}

function setComposerEnabled(enabled) {
  piqueInput.disabled = !enabled;
  sendBtn.disabled = !enabled;
}

async function sendPique() {
  const text = piqueInput.value.trim();
  if (!text || state.waitingForAi) return;

  stopTimer();
  timerBadge.style.display = "none";

  addBubble("user", text);
  piqueInput.value = "";
  setComposerEnabled(false);
  state.waitingForAi = true;

  neuralAvatar.classList.add("thinking");
  const loadingRow = addLoadingBubble();

  try {
    const res = await fetch("/api/game/round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: state.model,
        history: state.history,
        message: text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();

    loadingRow.remove();
    addBubble("assistant", data.reply);

    state.history.push({ role: "user", content: text });
    state.history.push({ role: "assistant", content: data.reply });

    state.currentRound += 1;
    updateRoundCounter();

    if (state.currentRound > state.totalRounds) {
      await endGame();
      return;
    }
  } catch (err) {
    loadingRow.remove();
    addBubble("assistant", `Erreur lors de l'appel au modèle de langage : ${err.message}`);
  } finally {
    neuralAvatar.classList.remove("thinking");
    state.waitingForAi = false;
    setComposerEnabled(true);
    if (state.currentRound <= state.totalRounds) {
      resetPiqueInputToPrefix();
    }
    piqueInput.focus();
    if (state.timerEnabled && state.currentRound <= state.totalRounds) {
      timerBadge.style.display = "inline-block";
      startTimer();
    }
  }
}

sendBtn.addEventListener("click", sendPique);
piqueInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendPique();
});

function addReplayButton(container) {
  const row = document.createElement("div");
  row.className = "end-actions";

  const replayBtn = document.createElement("button");
  replayBtn.textContent = "Rejouer";
  replayBtn.addEventListener("click", () => window.location.reload());
  row.appendChild(replayBtn);

  const dashboardBtn = document.createElement("button");
  dashboardBtn.textContent = "Voir le tableau de bord";
  dashboardBtn.className = "btn-secondary";
  dashboardBtn.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
  row.appendChild(dashboardBtn);

  container.appendChild(row);
}

async function endGame() {
  composer.style.display = "none";
  timerBadge.style.display = "none";

  const loadingBanner = document.createElement("div");
  loadingBanner.className = "end-banner";
  loadingBanner.textContent = "Partie terminée, analyse de la synthèse en cours…";
  messagesEl.appendChild(loadingBanner);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const res = await fetch("/api/game/synthesis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: state.model, history: state.history }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    loadingBanner.remove();
    renderSynthesis(data);
  } catch (err) {
    loadingBanner.textContent = `Partie terminée, la synthèse n'a pas pu être calculée (${err.message}).`;
    addReplayButton(loadingBanner);
  }
}

// Les champs theme/category/*_comment/explanation viennent de la réponse
// JSON du modèle-analyste, pas de code contrôlé côté serveur — un joueur
// qui parviendrait à de l'injection de prompt sur le round pourrait faire
// remonter du HTML/JS dans ces champs jusqu'ici. Échappement systématique
// avant toute interpolation dans un template innerHTML.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSynthesis(data) {
  // Annote chaque bulle IA déjà affichée avec sa classification de réaction
  // ET le score de compréhension de sa propre affirmation-miroir (se
  // représente-t-elle fidèlement ce qu'un LLM peut faire, ou non ?).
  data.responses.forEach((r) => {
    const captionEl = state.aiCaptionEls[r.index];
    if (!captionEl) return;
    const label = CATEGORY_LABELS[r.category] || r.category;
    captionEl.textContent = `Contenu généré par IA · ${label} · relance ${r.ai_understanding_score}/2`;
    const explanation = document.createElement("div");
    explanation.className = "ai-explanation";
    explanation.innerHTML = `${escapeHtml(r.explanation)}<br>${escapeHtml(r.ai_understanding_comment)}`;
    captionEl.after(explanation);
  });

  const panel = document.createElement("div");
  panel.className = "synthesis-panel";

  const totalPlayerScore = data.piques.reduce((sum, p) => sum + p.understanding_score, 0);
  const maxPlayerScore = data.piques.length * 2;
  const totalAiScore = data.responses.reduce((sum, r) => sum + r.ai_understanding_score, 0);
  const maxAiScore = data.responses.length * 2;
  const scoreBlock = document.createElement("div");
  scoreBlock.className = "synthesis-block";
  scoreBlock.innerHTML = `
    <h2>Score de compréhension des LLM</h2>
    <div class="score-compare">
      <div>
        <p class="score-label">Joueur</p>
        <p class="score-value">${totalPlayerScore} / ${maxPlayerScore}</p>
      </div>
      <div>
        <p class="score-label">IA</p>
        <p class="score-value">${totalAiScore} / ${maxAiScore}</p>
      </div>
    </div>
    <p class="score-hint">Chaque affirmation reflète-t-elle une compréhension juste de ce qu'un LLM peut ou ne peut pas faire, des deux côtés du match ?</p>
    <details class="score-criteria">
      <summary>Comment ce score est-il calculé ?</summary>
      <ul>
        <li><strong>0</strong> — repose sur une idée reçue sur les LLM (leur prêter une conscience, une intention, un vécu qu'ils n'ont pas, ou au contraire leur retirer une capacité réelle)</li>
        <li><strong>1</strong> — plausible, mais imprécis sur leurs capacités réelles</li>
        <li><strong>2</strong> — reflète une compréhension juste de leurs capacités et limites</li>
      </ul>
      <p>
        Cette évaluation est produite par un modèle de langage (l'« analyste »), pas vérifiée par
        des humains : une lecture indicative, pas une mesure certifiée. Détails sur la
        <a href="fondements.html">page Fondements</a>.
      </p>
    </details>
  `;
  panel.appendChild(scoreBlock);

  const themeCounts = {};
  THEMES.forEach((t) => (themeCounts[t] = 0));
  data.piques.forEach((p) => {
    themeCounts[p.theme] = (themeCounts[p.theme] || 0) + 1;
  });
  const themeItems = THEMES.map((t) => ({ label: t, value: themeCounts[t] }));

  const categoryCounts = {};
  SYCOPHANCY_CATEGORIES.forEach((c) => (categoryCounts[c] = 0));
  data.responses.forEach((r) => {
    if (categoryCounts[r.category] === undefined) categoryCounts[r.category] = 0;
    categoryCounts[r.category] += 1;
  });
  const categoryItems = SYCOPHANCY_CATEGORIES.map((c) => ({
    label: CATEGORY_LABELS[c] || c,
    value: categoryCounts[c],
  }));

  const radarBlock = document.createElement("div");
  radarBlock.className = "synthesis-block";
  radarBlock.innerHTML = "<h2>Catégories argumentatives explorées</h2>";

  const radarRow = document.createElement("div");
  radarRow.className = "radar-compare";

  const playerRadarCol = document.createElement("div");
  playerRadarCol.innerHTML = '<p class="score-label">Joueur : thèmes des répliques</p>';
  playerRadarCol.appendChild(buildRadarSvg(themeItems));
  playerRadarCol.appendChild(buildRadarLegend(themeItems));

  const aiRadarCol = document.createElement("div");
  aiRadarCol.innerHTML = '<p class="score-label">IA : catégories de réponse</p>';
  aiRadarCol.appendChild(buildRadarSvg(categoryItems));
  aiRadarCol.appendChild(buildRadarLegend(categoryItems));

  radarRow.appendChild(playerRadarCol);
  radarRow.appendChild(aiRadarCol);
  radarBlock.appendChild(radarRow);
  panel.appendChild(radarBlock);

  const detailBlock = document.createElement("div");
  detailBlock.className = "synthesis-block";
  detailBlock.innerHTML = `
    <h2>Détail par tour</h2>
    <div class="detail-columns-head">
      <span>Joueur</span><span>IA</span>
    </div>
  `;
  const responsesByIndex = new Map(data.responses.map((r) => [r.index, r]));
  data.piques.forEach((p) => {
    const r = responsesByIndex.get(p.index);
    const pair = document.createElement("div");
    pair.className = "detail-pair";

    const piqueCol = document.createElement("div");
    piqueCol.className = "detail-col";
    piqueCol.innerHTML = `
      <div class="pique-detail-head">
        <strong>Réplique ${p.index + 1}</strong>
        <span class="pique-theme">${escapeHtml(p.theme)}</span>
        <span class="pique-score">${p.understanding_score}/2</span>
      </div>
      <p class="pique-comment">${escapeHtml(p.understanding_comment)}</p>
    `;
    pair.appendChild(piqueCol);

    const aiCol = document.createElement("div");
    aiCol.className = "detail-col";
    if (r) {
      const label = CATEGORY_LABELS[r.category] || r.category;
      aiCol.innerHTML = `
        <div class="pique-detail-head">
          <strong>Relance ${r.index + 1}</strong>
          <span class="pique-theme">${escapeHtml(label)}</span>
          <span class="pique-score">${r.ai_understanding_score}/2</span>
        </div>
        <p class="pique-comment">${escapeHtml(r.ai_understanding_comment)}</p>
      `;
    }
    pair.appendChild(aiCol);

    detailBlock.appendChild(pair);
  });
  panel.appendChild(detailBlock);

  addReplayButton(panel);

  messagesEl.appendChild(panel);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// items : [{label: string, value: number}] — générique, utilisé pour le
// radar des thèmes (joueur) et celui des catégories de réponse IA.
function buildRadarSvg(items) {
  const size = 340;
  const center = size / 2;
  const radius = 95;
  const svgNS = "http://www.w3.org/2000/svg";
  const angleStep = (2 * Math.PI) / items.length;
  const values = items.map((it) => it.value);
  const maxValue = Math.max(1, ...values);

  const pointOn = (frac, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return [center + frac * radius * Math.cos(angle), center + frac * radius * Math.sin(angle)];
  };

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("class", "radar-svg");

  [0.25, 0.5, 0.75, 1].forEach((frac) => {
    const points = items.map((_, i) => pointOn(frac, i).join(",")).join(" ");
    const ring = document.createElementNS(svgNS, "polygon");
    ring.setAttribute("points", points);
    ring.setAttribute("class", "radar-grid");
    svg.appendChild(ring);
  });

  // Pas de texte sur le dessin lui-même (les libellés longs comme "autonomie
  // économique" ne peuvent pas retourner à la ligne dans un <text> SVG et se
  // faisaient couper) : juste un repère numéroté court, la légende complète
  // est affichée à côté en HTML normal (voir renderSynthesis).
  items.forEach((item, i) => {
    const [x2, y2] = pointOn(1, i);
    const axis = document.createElementNS(svgNS, "line");
    axis.setAttribute("x1", center);
    axis.setAttribute("y1", center);
    axis.setAttribute("x2", x2);
    axis.setAttribute("y2", y2);
    axis.setAttribute("class", "radar-axis");
    svg.appendChild(axis);

    const [lx, ly] = pointOn(1.12, i);
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", lx);
    label.setAttribute("y", ly);
    label.setAttribute("class", "radar-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = String(i + 1);
    svg.appendChild(label);
  });

  const dataPoints = values.map((v, i) => pointOn(v / maxValue, i).join(",")).join(" ");
  const dataPolygon = document.createElementNS(svgNS, "polygon");
  dataPolygon.setAttribute("points", dataPoints);
  dataPolygon.setAttribute("class", "radar-data");
  svg.appendChild(dataPolygon);

  return svg;
}

// Légende HTML des axes du radar (repère numéroté -> libellé complet) : du
// texte normal, qui retourne à la ligne sans problème contrairement au SVG.
function buildRadarLegend(items) {
  const list = document.createElement("ol");
  list.className = "radar-legend";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.label;
    list.appendChild(li);
  });
  return list;
}

loadModels();
