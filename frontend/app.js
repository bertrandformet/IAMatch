// IA Match — squelette front (mode individuel, round de jeu, appel Albert brut).
// Pas de synthèse, pas de score, pas de dashboard à ce stade : ce fichier ne fait
// que gérer l'échange brut « Moi au moins… » / réponse IA et son affichage SMS.

const setupScreen = document.getElementById("setup-screen");
const gameScreen = document.getElementById("game-screen");
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
const neuralAvatar = document.getElementById("neural-avatar");
const messagesEl = document.getElementById("messages");
const piqueInput = document.getElementById("pique-input");
const sendBtn = document.getElementById("send-btn");
const composer = document.getElementById("composer");

let state = {
  model: null,
  totalRounds: 4,
  timerEnabled: false,
  timerDuration: 30,
  currentRound: 0,
  history: [], // [{role: "user"|"assistant", content: string}]
  waitingForAi: false,
  timerInterval: null,
  timeLeft: 0,
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
      "Impossible de récupérer la liste des modèles Albert (" + err.message + "). " +
      "Vérifie que le backend tourne et que ALBERT_API_KEY est configurée dans .env.";
    setupError.style.display = "block";
    startBtn.disabled = true;
  }
}

timerToggle.addEventListener("change", () => {
  timerDurationField.style.display = timerToggle.checked ? "block" : "none";
});

startBtn.addEventListener("click", () => {
  state.model = modelSelect.value;
  state.totalRounds = parseInt(roundsSelect.value, 10);
  state.timerEnabled = timerToggle.checked;
  state.timerDuration = parseInt(timerDurationInput.value, 10) || 30;
  state.currentRound = 1;
  state.history = [];

  modelNameLabel.textContent = state.model;
  updateRoundCounter();

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
      endGame();
      return;
    }
  } catch (err) {
    loadingRow.remove();
    addBubble("assistant", `Erreur lors de l'appel à Albert : ${err.message}`);
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

function endGame() {
  composer.style.display = "none";
  timerBadge.style.display = "none";
  const banner = document.createElement("div");
  banner.className = "end-banner";
  banner.innerHTML = `
    <p>Partie terminée — ${state.totalRounds} tours joués.</p>
    <button id="replay-btn">Rejouer</button>
  `;
  messagesEl.appendChild(banner);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  document.getElementById("replay-btn").addEventListener("click", () => {
    window.location.reload();
  });
}

loadModels();
