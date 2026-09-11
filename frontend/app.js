// IA Match — squelette front (mode individuel, round de jeu, appel Albert brut).
// Pas de synthèse, pas de score, pas de dashboard à ce stade : ce fichier ne fait
// que gérer l'échange brut « Moi au moins… » / réponse IA et son affichage SMS.

const setupScreen = document.getElementById("setup-screen");
const gameScreen = document.getElementById("game-screen");
const modeSelect = document.getElementById("mode-select");
const modeHint = document.getElementById("mode-hint");
const modelSelect = document.getElementById("model-select");
const roundsSelect = document.getElementById("rounds-select");
const timerToggle = document.getElementById("timer-toggle");
const timerDurationField = document.getElementById("timer-duration-field");
const timerDurationInput = document.getElementById("timer-duration");
const startBtn = document.getElementById("start-btn");
const setupError = document.getElementById("setup-error");

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
};

// Doit rester synchronisé avec THEMES côté backend (backend/app/main.py).
const THEMES = [
  "corps", "émotions", "autonomie économique", "créativité",
  "faillibilité", "droit", "perception", "autre",
];

// Doit rester synchronisé avec SYCOPHANCY_CATEGORIES côté backend.
const CATEGORY_LABELS = {
  feedback_sycophancy: "Sycophantie de feedback",
  are_you_sure_sycophancy: "Sycophantie « t'es sûr ? »",
  answer_sycophancy: "Sycophantie de réponse",
  mimicry_sycophancy: "Sycophantie de mimétisme",
  concession_legitime: "Concession légitime",
  contre_argument_ferme: "Contre-argument ferme",
};

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

timerToggle.addEventListener("change", () => {
  timerDurationField.style.display = timerToggle.checked ? "block" : "none";
});

modeSelect.addEventListener("change", () => {
  modeHint.style.display = modeSelect.value === "collectif" ? "block" : "none";
});

startBtn.addEventListener("click", () => {
  state.mode = modeSelect.value;
  state.model = modelSelect.value;
  state.totalRounds = parseInt(roundsSelect.value, 10);
  state.timerEnabled = timerToggle.checked;
  state.timerDuration = parseInt(timerDurationInput.value, 10) || 30;
  state.currentRound = 1;
  state.history = [];

  modelNameLabel.textContent = state.model;
  updateRoundCounter();
  collectifBanner.style.display = state.mode === "collectif" ? "block" : "none";
  piqueInput.placeholder = state.mode === "collectif" ? "Nous au moins…" : "Moi au moins…";

  setupScreen.classList.remove("active");
  gameScreen.classList.add("active");

  if (state.timerEnabled) {
    timerBadge.style.display = "inline-block";
    startTimer();
  }

  piqueInput.focus();
});

function updateRoundCounter() {
  roundCounterEl.textContent = `Tour ${state.currentRound} / ${state.totalRounds}`;
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
  // cf. Kahneman/Système 1 dans le brief). S'il n'y a rien à envoyer, on laisse
  // simplement le badge signaler le dépassement plutôt que de bloquer le jeu.
  if (piqueInput.value.trim() && !state.waitingForAi) {
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
  const btn = document.createElement("button");
  btn.textContent = "Rejouer";
  btn.addEventListener("click", () => window.location.reload());
  container.appendChild(btn);
}

async function endGame() {
  composer.style.display = "none";
  timerBadge.style.display = "none";

  const loadingBanner = document.createElement("div");
  loadingBanner.className = "end-banner";
  loadingBanner.textContent = "Partie terminée — analyse de la synthèse en cours…";
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
    loadingBanner.textContent = `Partie terminée — la synthèse n'a pas pu être calculée (${err.message}).`;
    addReplayButton(loadingBanner);
  }
}

function renderSynthesis(data) {
  // Annote chaque bulle IA déjà affichée avec sa classification de sycophantie.
  data.responses.forEach((r) => {
    const captionEl = state.aiCaptionEls[r.index];
    if (!captionEl) return;
    const label = CATEGORY_LABELS[r.category] || r.category;
    captionEl.textContent = `Contenu généré par IA · ${label}`;
    const explanation = document.createElement("div");
    explanation.className = "ai-explanation";
    explanation.textContent = r.explanation;
    captionEl.after(explanation);
  });

  const panel = document.createElement("div");
  panel.className = "synthesis-panel";

  const totalScore = data.piques.reduce((sum, p) => sum + p.warrant_score, 0);
  const maxScore = data.piques.length * 2;
  const scoreBlock = document.createElement("div");
  scoreBlock.className = "synthesis-block";
  scoreBlock.innerHTML = `
    <h2>Score argumentatif</h2>
    <p class="score-value">${totalScore} / ${maxScore}</p>
    <p class="score-hint">Explicitation du lien logique (warrant) de chaque pique — Toulmin, 1958.</p>
  `;
  panel.appendChild(scoreBlock);

  const themeCounts = {};
  THEMES.forEach((t) => (themeCounts[t] = 0));
  data.piques.forEach((p) => {
    themeCounts[p.theme] = (themeCounts[p.theme] || 0) + 1;
  });
  const radarBlock = document.createElement("div");
  radarBlock.className = "synthesis-block";
  radarBlock.innerHTML = "<h2>Catégories argumentatives explorées</h2>";
  radarBlock.appendChild(buildRadarSvg(themeCounts));
  panel.appendChild(radarBlock);

  const detailBlock = document.createElement("div");
  detailBlock.className = "synthesis-block";
  detailBlock.innerHTML = "<h2>Détail par pique</h2>";
  data.piques.forEach((p) => {
    const row = document.createElement("div");
    row.className = "pique-detail-row";
    row.innerHTML = `
      <div class="pique-detail-head">
        <strong>Pique ${p.index + 1}</strong>
        <span class="pique-theme">${p.theme}</span>
        <span class="pique-score">${p.warrant_score}/2</span>
      </div>
      <p class="pique-comment">${p.warrant_comment}</p>
    `;
    detailBlock.appendChild(row);
  });
  panel.appendChild(detailBlock);

  addReplayButton(panel);

  messagesEl.appendChild(panel);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function buildRadarSvg(counts) {
  const size = 340;
  const center = size / 2;
  const radius = 95;
  const svgNS = "http://www.w3.org/2000/svg";
  const angleStep = (2 * Math.PI) / THEMES.length;
  const values = THEMES.map((t) => counts[t] || 0);
  const maxValue = Math.max(1, ...values);

  const pointOn = (frac, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return [center + frac * radius * Math.cos(angle), center + frac * radius * Math.sin(angle)];
  };

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("class", "radar-svg");

  [0.25, 0.5, 0.75, 1].forEach((frac) => {
    const points = THEMES.map((_, i) => pointOn(frac, i).join(",")).join(" ");
    const ring = document.createElementNS(svgNS, "polygon");
    ring.setAttribute("points", points);
    ring.setAttribute("class", "radar-grid");
    svg.appendChild(ring);
  });

  THEMES.forEach((theme, i) => {
    const [x2, y2] = pointOn(1, i);
    const axis = document.createElementNS(svgNS, "line");
    axis.setAttribute("x1", center);
    axis.setAttribute("y1", center);
    axis.setAttribute("x2", x2);
    axis.setAttribute("y2", y2);
    axis.setAttribute("class", "radar-axis");
    svg.appendChild(axis);

    const [lx, ly] = pointOn(1.2, i);
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", lx);
    label.setAttribute("y", ly);
    label.setAttribute("class", "radar-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = theme;
    svg.appendChild(label);
  });

  const dataPoints = values.map((v, i) => pointOn(v / maxValue, i).join(",")).join(" ");
  const dataPolygon = document.createElementNS(svgNS, "polygon");
  dataPolygon.setAttribute("points", dataPoints);
  dataPolygon.setAttribute("class", "radar-data");
  svg.appendChild(dataPolygon);

  return svg;
}

loadModels();
