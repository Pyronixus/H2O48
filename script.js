// jeu
let GRID_SIZE = 6;
const wrapper = document.getElementById("game");
let grid = Array(GRID_SIZE * GRID_SIZE).fill(null);
// objectif
let goalReached = false;
// mode chrono
let chronoInterval = null;
let totalPlayTime = 0;
let last300Points = 0; // Pour suivre les paliers de 300 points

const TILE_DATA = [
  { value: 2, bg: "#e0f7fa", shadow: "#a0d9e2", color: "#555" },
  { value: 4, bg: "#b2ebf2", shadow: "#7ac5cf", color: "#555" },
  { value: 8, bg: "#81d4fa", shadow: "#4fa8cc", color: "#fff" },
  { value: 16, bg: "#4fc3f7", shadow: "#2898c8", color: "#fff" },
  { value: 32, bg: "#29b6f6", shadow: "#0a90cc", color: "#fff" },
  { value: 64, bg: "#039be5", shadow: "#0070aa", color: "#fff" },
  { value: 128, bg: "#0288d1", shadow: "#015f96", color: "#fff" },
  { value: 256, bg: "#0277bd", shadow: "#014d82", color: "#fff" },
  { value: 512, bg: "#01579b", shadow: "#00335a", color: "#fff" },
  { value: 1024, bg: "#002f6c", shadow: "#001535", color: "#fff" },
  { value: 2048, bg: "#001233", shadow: "#000814", color: "#fff" },
  { value: 4096, bg: "#4a148c", shadow: "#2a0852", color: "#fff" },
  { value: 8192, bg: "#311b92", shadow: "#1a0955", color: "#fff" },
  { value: 16384, bg: "#004d40", shadow: "#001f1a", color: "#fff" },
  { value: 32768, bg: "#1a237e", shadow: "#0b0f3b", color: "#fff" },
  { value: 65536, bg: "#000000", shadow: "#00d4ff", color: "#00d4ff" },
];

const sounds = {
  move: new Audio("Assets/Sounds/move.wav"),
  merge: new Audio("Assets/Sounds/merge.wav"),
  win: new Audio("Assets/Sounds/win.wav"),
  gameOver: new Audio("Assets/Sounds/game-over.wav"),
};

function initBackground() {
  wrapper.innerHTML = "";
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const empty = document.createElement("div");
    empty.classList.add("tile-empty");
    empty.addEventListener("mousedown", (e) => {
      if (!isDevMode || grid[i] !== null) return;
      if (e.button === 0) {
        const val = parseInt(document.getElementById("dev-value").value) || 2;
        injectTile(i, val);
        startHoldAction(() => {
          if (grid[i] === null) injectTile(i, val);
        });
      }
    });
    wrapper.appendChild(empty);
  }
}

function updateView() {
  grid.forEach((tile, index) => {
    if (!tile) return;
    const x = index % GRID_SIZE;
    const y = Math.floor(index / GRID_SIZE);

    if (!tile.element) {
      const newtile = document.createElement("div");
      newtile.className = `tile tile-${tile.value} tile-new`;
      const spanTexte = document.createElement("span");
      spanTexte.textContent = tile.value;
      newtile.appendChild(spanTexte);

      newtile.addEventListener("contextmenu", (e) => e.preventDefault());

      newtile.addEventListener("mousedown", (e) => {
        if (isDevMode && e.button === 2) {
          e.preventDefault();
          // Fix : Récupérer dynamiquement l'index car la tuile a pu bouger
          let currentIndex = grid.indexOf(tile);
          if (currentIndex !== -1) {
            newtile.remove();
            grid[currentIndex] = null;
          }
          startHoldAction(() => {
            let dynIndex = grid.indexOf(tile);
            if (dynIndex !== -1 && grid[dynIndex] !== null) {
              grid[dynIndex].element?.remove();
              grid[dynIndex] = null;
            }
          });
        } else if (!isDevMode && e.button === 0) {
          newtile.classList.remove("animate-flip");
          void newtile.offsetWidth; // Force reflow pour relancer l'animation
          newtile.classList.add("animate-flip");
        }
      });

      newtile.style.setProperty("--x", x);
      newtile.style.setProperty("--y", y);
      wrapper.appendChild(newtile);
      tile.element = newtile;
    } else {
      tile.element.style.setProperty("--x", x);
      tile.element.style.setProperty("--y", y);
      tile.element.className = `tile tile-${tile.value}`;
      tile.element.querySelector("span").textContent = tile.value;
      if (tile.merged) {
        tile.element.classList.add("tile-merged");
        tile.merged = false;
      }
    }
  });
}

function spawnTile() {
  let emptyTiles = grid
    .map((val, idx) => (val === null ? idx : null))
    .filter((val) => val !== null);
  if (emptyTiles.length === 0) return;
  let randomIndex = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
  grid[randomIndex] = {
    value: Math.random() < 0.9 ? 2 : 4,
    element: null,
    merged: false,
  };
  updateView();
}

function slide(line, indices) {
  let newLine = Array(GRID_SIZE).fill(null);
  let j = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === null) continue;

    // Check Fusion
    if (
      j > 0 &&
      newLine[j - 1] !== null &&
      newLine[j - 1].value === line[i].value &&
      !newLine[j - 1].merged
    ) {
      const oldTile = line[i];
      const mergeValue = oldTile.value * 2;
      newLine[j - 1].value = mergeValue;
      newLine[j - 1].merged = true;
      updateScore(mergeValue);
      playSound("merge");

      // Fix Visuel : Déplacer l'ancienne tuile vers sa cible avant de la détruire
      const targetIdx = indices[j - 1];
      const targetX = targetIdx % GRID_SIZE;
      const targetY = Math.floor(targetIdx / GRID_SIZE);

      if (oldTile.element) {
        oldTile.element.style.setProperty("--x", targetX);
        oldTile.element.style.setProperty("--y", targetY);
        oldTile.element.style.zIndex = "1";
        setTimeout(() => oldTile.element.remove(), 250);
      }
    } else {
      newLine[j] = line[i];
      j++;
    }
  }
  return newLine;
}

let movingTimeout = null;
let moveCount = 0;

function move(direction) {
  // Si un overlay de victoire ou de défaite est présent, on bloque les mouvements
  if (
    document.getElementById("win-overlay") ||
    document.getElementById("game-over-overlay")
  ) {
    return;
  }

  let oldGrid = JSON.stringify(grid.map((t) => (t ? t.value : null)));

  for (let i = 0; i < GRID_SIZE; i++) {
    let line = [];
    let indices = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      let idx =
        direction === "left" || direction === "right"
          ? i * GRID_SIZE + j
          : j * GRID_SIZE + i;
      line.push(grid[idx]);
      indices.push(idx);
    }

    if (direction === "right" || direction === "down") {
      line.reverse();
      indices.reverse();
    }

    let result = slide(line, indices);

    if (direction === "right" || direction === "down") {
      result.reverse();
      indices.reverse(); // Restaurer l'ordre
    }

    indices.forEach((globalIdx, k) => {
      grid[globalIdx] = result[k];
    });
  }

  // Si le tableau a changé
  if (oldGrid !== JSON.stringify(grid.map((t) => (t ? t.value : null)))) {
    moveCount++;
    playSound("move");
    updateView();
    grid.forEach((tile) => {
      if (tile?.element) tile.element.classList.add("tile-moving");
    });

    clearTimeout(movingTimeout); // Fix Spam bug
    movingTimeout = setTimeout(() => {
      grid.forEach((tile) => {
        if (tile?.element) tile.element.classList.remove("tile-moving");
      });
    }, 260);

    setTimeout(() => {
      spawnTile();
      checkGameOver();
    }, 150);
  }
}

// Support mobile Swipe
let touchStartX = 0,
  touchStartY = 0;
wrapper.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  },
  { passive: true },
);

wrapper.addEventListener(
  "touchend",
  (e) => {
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 40) moveAndStartTimer("right");
      else if (dx < -40) moveAndStartTimer("left");
    } else {
      if (dy > 40) moveAndStartTimer("down");
      else if (dy < -40) moveAndStartTimer("up");
    }
  },
  { passive: true },
);

// Support WASD et Flèches
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  const validKeys = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "w",
    "a",
    "s",
    "d",
    "W",
    "A",
    "S",
    "D",
  ];

  if (validKeys.includes(e.key)) {
    if (e.key.startsWith("Arrow")) e.preventDefault();

    let dir = "";
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") dir = "up";
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") dir = "down";
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") dir = "left";
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") dir = "right";

    moveAndStartTimer(dir);
  }
});

let holdTimeout = null;
let holdInterval = null;

function startHoldAction(callback) {
  clearHoldAction();
  holdTimeout = setTimeout(() => {
    holdInterval = setInterval(callback, 120);
  }, 350);
}

function clearHoldAction() {
  clearTimeout(holdTimeout);
  clearInterval(holdInterval);
  holdTimeout = null;
  holdInterval = null;
}

document.addEventListener("mouseup", clearHoldAction);
document.addEventListener("mouseleave", clearHoldAction);
wrapper.addEventListener("contextmenu", (e) => e.preventDefault());

let isDevMode = false;
let inputBuffer = "";

window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  inputBuffer += e.key.toLowerCase();
  if (inputBuffer.length > 6) inputBuffer = inputBuffer.slice(-6);
  if (inputBuffer.endsWith("h2o")) {
    document.body.classList.toggle("show-debug");
    inputBuffer = "";
  }
  if (inputBuffer.endsWith("visuel")) {
    toggleVisuelMode();
    inputBuffer = "";
  }
});

const btnToggleDev = document.querySelector("#btnToggleDev");

function toggleDevMode() {
  isDevMode = !isDevMode;
  btnToggleDev.textContent = isDevMode ? "Mode Dev : ON" : "Mode Dev : OFF";
  btnToggleDev.style.background = isDevMode ? "#4caf50" : "#fbc02d";
  document.body.classList.toggle("dev-active", isDevMode);
}

function injectTile(index, value) {
  grid[index] = { value, element: null, merged: false };
  updateView();
}

function moveAndStartTimer(direction) {
  const timeCheckbox = document.getElementById("toggle-timer");
  if (timeCheckbox && timeCheckbox.checked) {
    if (timerInterval === null) {
      startTimer();
    }
  } else if (currentMode === "Chrono") {
    startChronoTime();
  } else {
    stopTimer();
    stopChronoTime();
  }
  move(direction);
}

// Logic Scores et Game Over
const score = document.getElementById("score-value");
const bestScore = document.getElementById("best-score-value");
let currentScore = 0;
let maxScore = parseInt(localStorage.getItem("bestScore")) || 0;

function updateScore(points) {
  currentScore += points;
  score.textContent = currentScore;

  // Logique de bonus de temps (tous les 300 points) pour le mode chrono
  if (currentMode === "Chrono") {
    let currentThreshold = Math.floor(currentScore / 300);
    if (currentThreshold > last300Points) {
      let bonus = currentThreshold - last300Points;
      let currentTime = parseInt(chronoTime.textContent);
      chronoTime.textContent = currentTime + bonus; // Ajoute 1s par tranche de 300
      last300Points = currentThreshold;
      redTextChronoTime();

      // effet visuel sur le chrono pour montrer le bonus
      chronoTime.style.scale = "1.2";
      setTimeout(() => (chronoTime.style.scale = "1.0"), 500);
    }
  }

  score.classList.remove("score-pop");
  void score.offsetWidth;
  score.classList.add("score-pop");
  setTimeout(() => score.classList.remove("score-pop"), 150);

  if (currentScore > maxScore) {
    maxScore = currentScore;
    bestScore.textContent = maxScore;
    score.classList.add("score-yellow", "score-big");
    setTimeout(() => score.classList.remove("score-big"), 200);
    localStorage.setItem("bestScore", maxScore);
  }
}

function checkGameOver() {
  const goalValue = document.getElementById("value-goal").textContent;

  // 1. Vérification de la Victoire (Seulement si pas encore atteint)
  if (goalValue !== "Infini" && !goalReached) {
    const target = parseInt(goalValue);
    if (grid.some((t) => t && t.value === target)) {
      goalReached = true;
      stopTimer(); // On arrête le timer pour l'overlay de victoire
      triggerWin();
      return; // On sort pour ne pas afficher le Game Over en même temps
    }
  }

  // 2. Vérification de la défaite (TOUJOURS exécutée si on n'a pas gagné à cet instant)
  // On vérifie s'il reste des cases vides
  if (grid.some((t) => t === null)) return;

  // On vérifie s'il reste des fusions possibles
  let canMove = false;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      let idx = i * GRID_SIZE + j;
      let val = grid[idx].value;
      if (j < GRID_SIZE - 1 && grid[idx + 1].value === val) canMove = true;
      if (i < GRID_SIZE - 1 && grid[idx + GRID_SIZE].value === val)
        canMove = true;
    }
  }

  // 3. Si aucune case vide ET aucun mouvement possible : Game Over
  if (!canMove) {
    stopTimer(); // On arrete le timer peut importe si on a gagné ou pas avant
    triggerGameOver();
  }
}

function triggerGameOver() {
  // Empêche de superposer plusieurs overlays si la fonction est appelée deux fois
  if (document.getElementById("game-over-overlay")) return;

  playSound("gameOver");
  stopTimer();
  stopChronoTime();

  const currentTimeStr = `${timeMin} min, ${timeSec} sec`;
  const totalSeconds = timeMin * 60 + timeSec;
  const goal = document.getElementById("value-goal").textContent;

  // Logique localStorage (inchangée)
  const recordKey = `bestTime_goal_${goal}`;
  let bestTime = localStorage.getItem(recordKey);
  let isNewRecord = false;
  if (!bestTime || totalSeconds < parseInt(bestTime)) {
    localStorage.setItem(recordKey, totalSeconds);
    bestTime = totalSeconds;
    isNewRecord = true;
  }

    // Calcul propre du temps tenu pour le mode Chrono
  // totalPlayTime est le compteur de secondes accumulées
  const heldMin = Math.floor(totalPlayTime / 60);
  const heldSec = totalPlayTime % 60;
  const bestTimeDisplay = `${Math.floor(bestTime / 60)} min, ${bestTime % 60} sec`;

  const overlay = document.createElement("div");
  overlay.id = "game-over-overlay";

  // Construction du contenu en respectant strictement votre style initial
  overlay.innerHTML = `
    <h2>Game Over</h2>
    <p>Score final : ${currentScore}</p>
    <p style="font-size: 15px; margin: -8px 0 20px; color: rgba(255,255,255,0.65);">${moveCount} mouvement${moveCount > 1 ? "s" : ""}</p>
    ${
      currentMode === "Chrono"
        ? `
    <p id="total-time-display" style="font-size: 14px; margin: -8px 0 20px; color: rgba(255,255,255,0.65);">
      Temps tenu : ${heldMin} min, ${heldSec} sec
    </p>`
        : ""
    }
    <button id="restart-btn" onclick="animateAndRestart(this)">Rejouer</button>
  `;

  wrapper.appendChild(overlay);
}
const totalTime = document.getElementById("total-time");

function continueGame() {
  const overlay = document.getElementById("win-overlay");
  if (overlay) overlay.remove();
  // On relance le timer SEULEMENT si la checkbox est cochée
  const timeCheckbox = document.getElementById("toggle-timer");
  if (timeCheckbox && timeCheckbox.checked) {
    startTimer();
  }
  if (currentMode === "Chrono") {
    startChronoTime();
  }
}

function animateAndRestart(btn) {
  // On ajoute la classe pour l'animation jelly et l'enfoncement
  btn.classList.add("is-pressing");

  // On attend un peu (400ms) pour laisser l'effet de gelée se stabiliser
  setTimeout(() => {
    restartGame(); // On relance la logique de réinitialisation
  }, 450);
}

function restartGame() {
  // 1. Nettoyage complet du plateau visuel
  // C'est indispensable pour que les anciennes tuiles disparaissent
  wrapper.innerHTML = "";

  // 2. Réinitialisation de la logique (le tableau de données)
  grid = Array(GRID_SIZE * GRID_SIZE).fill(null);

  // 3. Réinitialisation des compteurs
  currentScore = 0;
  moveCount = 0;
  goalReached = false;
  score.textContent = currentScore; // Mise à jour de l'affichage du score

  // 4. Réinitialisation du Timer
  stopTimer();
  timeMin = 0;
  timeSec = 0;
  updateTimerDisplay();

  // 5. Suppression de l'écran de Game Over s'il existe
  const overlay = document.getElementById("game-over-overlay");
  if (overlay) {
    overlay.remove();
  }

  // 6. Reinitialisation du Chrono
  stopChronoTime();
  chronoTime.textContent = "60";
  totalPlayTime = 0;
  last300Points = 0;
  if (chronoTime.classList.contains("chrono-warning")) {
    chronoTime.classList.remove("chrono-warning");
  }
  if (currentMode === "Chrono") {
    // Le chrono se lancera au premier mouvement via moveAndStartTimer
  }

  // 7. Reconstruction du jeu
  initBackground(); // Recrée les emplacements vides (le fond)
  spawnTile(); // Ajoute la première tuile
  spawnTile(); // Ajoute la deuxième tuile
}

score.textContent = currentScore;
bestScore.textContent = maxScore;

function toggleSettings() {
  document.body.classList.toggle("settings-open");
}

// Timer Logic
const timeCheckbox = document.getElementById("toggle-timer");
const timeText = document.getElementById("time-txt");
const timeMinEl = document.getElementById("time-min");
const timeSecEl = document.getElementById("time-sec");
let timerInterval = null;
let timeMin = 0;
let timeSec = 0;

function updateTimerDisplay() {
  timeMinEl.textContent = String(timeMin).padStart("0") + " min";
  timeSecEl.textContent = String(timeSec).padStart("0") + " sec";
}

function startTimer() {
  if (timerInterval !== null) return;
  timerInterval = setInterval(() => {
    timeSec += 1;
    if (timeSec >= 60) {
      timeSec = 0;
      timeMin += 1;
    }
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval === null) return;
  clearInterval(timerInterval);
  timerInterval = null;
}

function setTimerActive(active) {
  timeText.style.display = active ? "block" : "none";
  if (!active) {
    stopTimer();
    timeMin = 0;
    timeSec = 0;
    updateTimerDisplay();
  }
}

if (timeCheckbox) {
  timeCheckbox.addEventListener("change", (e) =>
    setTimerActive(e.target.checked),
  );
  updateTimerDisplay();
  setTimerActive(timeCheckbox.checked);
} else {
  timeText.style.display = "none";
}

// Sound logic
const soundCheckbox = document.getElementById("toggle-sound"); // Variable globale pour suivre l'état du son
let isSoundEnabled = document.getElementById("toggle-sound").checked;

function setSoundActive(active) {
  isSoundEnabled = active;
}

function playSound(soundName) {
  if (isSoundEnabled && sounds[soundName]) {
    // Reset du temps pour permettre des sons rapides successifs
    sounds[soundName].currentTime = 0;
    const playPromise = sounds[soundName].play();

    // Gérer les cas où la lecture peut échouer
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn(`Impossible de jouer le son "${soundName}":`, error);
      });
    }
  }
}

// Optionnel : arrêter tous les sons si nécessaire
function setSoundStop() {
  Object.values(sounds).forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}
function resetBestScore() {
  if (!confirm("Voulez-vous réinitialiser votre meilleur score ?")) return;
  localStorage.removeItem("bestScore");
  maxScore = 0;
  bestScore.textContent = 0;
}

let vPossiblesOpen = false;
function vPossiblesDisplay() {
  const el = document.getElementById("vPossibles");
  vPossiblesOpen = !vPossiblesOpen;
  if (vPossiblesOpen) {
    el.style.display = "flex";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.add("visible")),
    );
  } else {
    el.classList.remove("visible");
    setTimeout(() => {
      if (!vPossiblesOpen) el.style.display = "none";
    }, 400);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const devValueInput = document.getElementById("dev-value");
  const vPossiblesEl = document.getElementById("vPossibles");
  vPossiblesEl.innerHTML = "";

  TILE_DATA.forEach(({ value, bg, shadow, color }) => {
    const btn = document.createElement("button");
    btn.textContent = value;
    btn.className = "tile-value-btn";
    btn.style.setProperty("--tile-bg", bg);
    btn.style.setProperty("--tile-shadow", shadow);
    btn.style.setProperty("--tile-color", color);
    btn.addEventListener("click", () => {
      devValueInput.value = value;
      document
        .querySelectorAll(".tile-value-btn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
    vPossiblesEl.appendChild(btn);
  });
});

let visuelMode = false;
let visuelPanel = null;

function toggleVisuelMode() {
  visuelMode = !visuelMode;
  if (visuelMode) showVisuelPanel();
  else hideVisuelPanel();
}

function showVisuelPanel() {
  if (visuelPanel) visuelPanel.remove();
  visuelPanel = document.createElement("div");
  visuelPanel.id = "visuel-panel";

  const header = document.createElement("div");
  header.id = "visuel-header";
  header.innerHTML = `<span>🎨 Toutes les tuiles</span>`;
  const closeBtn = document.createElement("button");
  closeBtn.id = "visuel-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", toggleVisuelMode);
  header.appendChild(closeBtn);
  visuelPanel.appendChild(header);

  const gridEl = document.createElement("div");
  gridEl.id = "visuel-grid";
  visuelPanel.appendChild(gridEl);

  document.body.appendChild(visuelPanel);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => visuelPanel.classList.add("visible")),
  );

  TILE_DATA.forEach(({ value, bg, shadow, color }) => {
    const cell = document.createElement("div");
    cell.className = "visuel-cell";

    const tile = document.createElement("div");
    tile.className = "visuel-tile";
    tile.style.background = bg;
    tile.style.color = color;
    tile.style.boxShadow = `inset 0 -4px 0 ${shadow}, 0 8px 20px rgba(0,0,0,0.3)`;
    tile.textContent = value >= 1000 ? value.toLocaleString() : value;

    const info = document.createElement("div");
    info.className = "visuel-info";
    const log2 = Math.log2(value);
    info.innerHTML = `<span class="visuel-val">${value.toLocaleString()}</span><span class="visuel-sub">2<sup>${log2}</sup>${value === 65536 ? " ✨" : ""}</span>`;

    cell.appendChild(tile);
    cell.appendChild(info);
    gridEl.appendChild(cell);

    tile.addEventListener("mouseenter", () => highlightTilesOnBoard(value));
    tile.addEventListener("mouseleave", clearBoardHighlight);
  });
}

function hideVisuelPanel() {
  if (!visuelPanel) return;
  visuelPanel.classList.remove("visible");
  clearBoardHighlight();
  setTimeout(() => {
    visuelPanel?.remove();
    visuelPanel = null;
  }, 400);
}

function highlightTilesOnBoard(value) {
  grid.forEach((tile) => {
    if (!tile?.element) return;
    if (tile.value === value) tile.element.classList.add("visuel-match");
    else tile.element.classList.add("visuel-dim");
  });
}

function clearBoardHighlight() {
  grid.forEach((tile) => {
    if (!tile?.element) return;
    tile.element.classList.remove("visuel-match", "visuel-dim");
  });
}

function changeGridSize() {
  const leftValue = document.getElementById("value-grid-left");
  const rightValue = document.getElementById("value-grid-right");

  let currentSize = parseInt(leftValue.textContent);

  if (currentSize < 8) {
    currentSize += 2;
  } else {
    currentSize = 2;
  }

  leftValue.textContent = currentSize;
  rightValue.textContent = currentSize;

  GRID_SIZE = currentSize;

  wrapper.style.setProperty("--grid-size", GRID_SIZE);

  wrapper.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
  wrapper.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;

  restartGame();
}

function reduceHeaderTextSizeForTime(active) {
  const headerScores = document.getElementById("header-scores");
  if (active) {
    headerScores.classList.add("small-header");
  } else {
    headerScores.classList.remove("small-header");
  }
}

// Mise à jour de la logique existante pour appeler la fonction
if (timeCheckbox) {
  timeCheckbox.addEventListener("change", (e) => {
    const isActive = e.target.checked;
    setTimerActive(isActive);
    reduceHeaderTextSizeForTime(isActive); // Appel de la nouvelle fonction
  });

  // Initialisation au chargement
  reduceHeaderTextSizeForTime(timeCheckbox.checked);
}
// mode normal : jeu de base
// mode chrono : 60 sec pour faire le meilleur score possible
// mode négatifs : des tuiles "négatives" apparaissent (ex: -2, -4) qui font perdre des points si fusionnées ou en gagner si inf à -8
// mode gravité : les tuiles sont soumises à une gravité constante vers le bas, les mouvements horizontaux sont donc impossibles et chaque minute, la gravité change de direction (bas, gauche, haut, droite)
// mode invisible : les tuiles sont invisibles et apparaissent au hasard sur la grille pendant 1 seconde toutes les 10 secondes sauf si aucun mouv n'a été fait entretemps
// mode zen : bonus de séries, de fusions consécutives, de mouvements rapides, pas de game over : il enlève une ou plusieurs tuiles génantes à chaque fusion ou tous les 30 sec, le but est de faire le meilleur score possible sans stress
// mode hard : combinaison de plusieurs modes (ex: chrono + négatifs + gravité) pour les joueurs expérimentés qui veulent un défi ultime
const MODES = [
  "Normal",
  "Chrono",
  "Négatifs",
  "Gravité",
  "Invisible",
  "Zen",
  "Hard",
];
let currentMode = MODES[0];
function changeMode() {
  restartGame();
  let index = MODES.indexOf(currentMode);
  currentMode = MODES[(index + 1) % MODES.length];
  document.getElementById("value-mode").textContent = currentMode;
  toggleChronoTimeDisplay(); // Affiche ou masque le chrono selon le mode
}
const chronoTime = document.getElementById("time-chronoMode");
const chronoTimeTotalSec = 0;
const chronoTimeTotalMin = 0;

function toggleChronoTimeDisplay() {
  if (currentMode === "Chrono") {
    chronoTime.style.display = "inline-block";
  } else {
    chronoTime.style.display = "none";
  }
}

function startChronoTime() {
  // On évite de lancer plusieurs intervalles en même temps
  if (chronoInterval !== null) return;

  chronoInterval = setInterval(() => {
    let currentTime = parseInt(chronoTime.textContent);
    totalPlayTime++;

    if (
      currentTime > 0 &&
      !document.getElementById("game-over-overlay") &&
      !document.getElementById("win-overlay")
    ) {
      currentTime--;
      chronoTime.textContent = currentTime;
      redTextChronoTime();
      toggleTotaldisplay();
    } else {
      // Le temps est écoulé !
      stopChronoTime();
      triggerGameOver();
    }
  }, 1000);
}
function stopChronoTime() {
  if (chronoInterval !== null) {
    clearInterval(chronoInterval);
    chronoInterval = null;
  }
}

function redTextChronoTime() {
  // 1. Convertir en nombre pour une comparaison fiable
  const timeValue = parseInt(chronoTime.textContent);

  if (timeValue <= 10) {
    // 2. Pour que l'animation se relance à chaque seconde, on retire et remet la classe "chrono-warning"
    chronoTime.classList.remove("chrono-warning");

    // Force le "reflow" pour que le navigateur détecte le changement
    void chronoTime.offsetWidth;

    chronoTime.classList.add("chrono-warning");
  } else {
    chronoTime.classList.remove("chrono-warning");
  }
}

function toggleTotaldisplay() {
  setInterval(() => {
    chronoTimeTotalSec++;
    if (chronoTimeTotalSec >= 60) {
      chronoTimeTotalSec = 0;
      chronoTimeTotalMin++;
    }
  }, 1000);
}
function changeGoal() {
  const goalValue = document.getElementById("value-goal");
  let currentGoal = goalValue.textContent;
  let newGoal;

  if (currentGoal === "65536") {
    newGoal = "Infini"; // Si on est au max (65536), on passe à l'infini
  } else if (currentGoal === "Infini") {
    newGoal = 1024; // Si on est à l'infini, on revient à 1024
  } else {
    // Sinon, on multiplie par 2
    newGoal = parseInt(currentGoal) * 2;
  }

  goalValue.textContent = newGoal;
  restartGame();
}

function triggerWin() {
  if (document.getElementById("win-overlay")) return;
  playSound("win");
  stopTimer();

  const currentTimeStr = `${timeMin} min, ${timeSec} sec`;
  const totalSeconds = timeMin * 60 + timeSec;
  const goal = document.getElementById("value-goal").textContent;

  // Gestion du Record de temps via localStorage
  const recordKey = `bestTime_goal_${goal}`;
  let bestTime = localStorage.getItem(recordKey);
  let isNewRecord = false;

  if (!bestTime || totalSeconds < parseInt(bestTime)) {
    localStorage.setItem(recordKey, totalSeconds);
    bestTime = totalSeconds;
    isNewRecord = true;
  }

  const bestTimeDisplay = `${Math.floor(bestTime / 60)} min, ${bestTime % 60} sec`;

  const overlay = document.createElement("div");
  overlay.id = "win-overlay";
  overlay.className = "game-over-overlay win-style"; // On réutilise le style de base
  overlay.innerHTML = `
    <h2 style="color: #4caf50;">Objectif Atteint !</h2>
    <div class="stats-win">
      <p>🏆 Score final : <strong>${currentScore}</strong></p>
      <p>👣 Mouvements : <strong>${moveCount}</strong></p>
      <p>⏱️ Temps : <strong>${currentTimeStr}</strong></p>
      <p>🥇 Record (${goal}) : <strong>${bestTimeDisplay}</strong> ${isNewRecord ? "✨" : ""}</p>
    </div>
    <div class="win-buttons">
      <button class="win-btn continue" onclick="this.parentElement.parentElement.remove()">Continuer</button>
      <button class="win-btn restart" onclick="animateAndRestart(this)">Rejouer</button>
    </div>
  `;
  wrapper.appendChild(overlay);
}

// Event listener pour le toggle son
soundCheckbox.addEventListener("change", (e) => {
  setSoundActive(e.target.checked);
});

// Initialisation du jeu complet
initBackground();
spawnTile();
spawnTile();
