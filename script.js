// jeu
let GRID_SIZE = 6;
const wrapper = document.getElementById("game");
let grid = Array(GRID_SIZE * GRID_SIZE).fill(null);
// objectif
let goalReached = false;

// MODES

// chrono
let chronoInterval = null;
let totalPlayTime = 0;
let last300Points = 0; // Pour suivre les paliers de 300 points
// gravité
let gravityDirection = "down"; // Directions possibles : 'down', 'left', 'up', 'right'
let gravityInterval = null;
let gravityTimerSec = 60;
// zen
let zenMergeCount = 0; // Compteur de fusions consécutives
let zenCleanInterval = null; // Intervalle de nettoyage toutes les 30s
const ZEN_CLEAN_INTERVAL_SEC = 30;
let zenTimerSec = ZEN_CLEAN_INTERVAL_SEC;

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

    const isNegative = tile.value < 0;
    const absValue = Math.abs(tile.value);
    const tileClass = isNegative
      ? `tile-neg tile-neg-${absValue}`
      : `tile-${tile.value}`;

    if (!tile.element) {
      const newtile = document.createElement("div");
      newtile.className = `tile ${tileClass} tile-new`;
      const spanTexte = document.createElement("span");
      spanTexte.textContent = tile.value;
      newtile.appendChild(spanTexte);

      newtile.addEventListener("contextmenu", (e) => e.preventDefault());

      newtile.addEventListener("mousedown", (e) => {
        if (isDevMode && e.button === 2) {
          e.preventDefault();
          let currentIndex = grid.indexOf(tile);
          if (currentIndex !== -1) {
            newtile.remove();
            grid[currentIndex] = null;
          }
        }
      });

      newtile.style.setProperty("--x", x);
      newtile.style.setProperty("--y", y);
      wrapper.appendChild(newtile);
      tile.element = newtile;
    } else {
      tile.element.style.setProperty("--x", x);
      tile.element.style.setProperty("--y", y);
      tile.element.className = `tile ${tileClass}`;
      tile.element.querySelector("span").textContent = tile.value;
      if (tile.merged) {
        tile.element.classList.add("tile-merged");
        tile.merged = false;
      }
    }
  });
}

function getRandomNegativeValue() {
  // Liste des puissances de 2 négatives
  const negValues = [-2, -4, -8, -16, -32, -64, -128, -256, -512, -1024, -2048];

  // Poids de probabilité : les petites valeurs ont plus de chances d'apparaître
  const weights = [40, 25, 15, 8, 5, 3, 2, 1, 0.5, 0.3, 0.2];

  let totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let randomNum = Math.random() * totalWeight;

  for (let i = 0; i < negValues.length; i++) {
    if (randomNum < weights[i]) {
      return negValues[i];
    }
    randomNum -= weights[i];
  }
  return -2;
}

function spawnTile() {
  let emptyTiles = grid
    .map((val, idx) => (val === null ? idx : null))
    .filter((val) => val !== null);
  if (emptyTiles.length === 0) return;
  let randomIndex = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];

  let val;

  if (currentMode === "Négatifs" || currentMode === "Hard") {
    if (Math.random() < 0.1) {
      val = getRandomNegativeValue(); // Génère une valeur négative (ex: -2, -4...)
    } else {
      val = Math.random() < 0.9 ? 2 : 4;
    }
  } else {
    val = Math.random() < 0.9 ? 2 : 4;
  }

  // Si c'est un négatif qui spawn, son impact est directement appliqué au score
  if (val < 0) {
    updateScore(val); // Soustrait la valeur du score actuel
  }

  grid[randomIndex] = {
    value: val,
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

    const currentTile = line[i];
    const prevTile = j > 0 ? newLine[j - 1] : null;

    if (prevTile !== null && !prevTile.merged) {
      // CAS 1 : ANNULATION (ex: -2 et 2, ou -16 et 16)
      if (prevTile.value === -currentTile.value) {
        // L'annulation libère le plateau : on rembourse le négatif et on crédite le bonus
        const pointsGagnes = Math.abs(currentTile.value) * 2;
        updateScore(pointsGagnes);
        playSound("merge");

        const targetIdx = indices[j - 1];
        const targetX = targetIdx % GRID_SIZE;
        const targetY = Math.floor(targetIdx / GRID_SIZE);

        const currentElem = currentTile.element;
        const prevElem = prevTile.element;

        if (currentElem) {
          currentElem.style.setProperty("--x", targetX);
          currentElem.style.setProperty("--y", targetY);
          currentElem.style.zIndex = "2";
          currentElem.classList.add("animate-cancel");
          setTimeout(() => currentElem.remove(), 300);
        }

        if (prevElem) {
          prevElem.classList.add("animate-cancel");
          setTimeout(() => prevElem.remove(), 300);
        }

        triggerBoardShake();
        triggerShockwave(targetX, targetY);

        newLine[j - 1] = null;
        j--;
        continue;
      }

      // CAS 2 : FUSION MÊME SIGNE (ex: -2 + -2 = -4, ou 4 + 4 = 8)
      if (prevTile.value === currentTile.value) {
        const mergeValue = prevTile.value * 2;
        prevTile.value = mergeValue;
        prevTile.merged = true;

        if (mergeValue < 0) {
          // Fusion de deux négatifs : le joueur élimine deux tuiles négatives pour en créer une plus grande
          // On crédite la valeur absolue de la tuile éliminée
          updateScore(Math.abs(prevTile.value));
        } else {
          // Fusion classique de deux positifs
          updateScore(mergeValue);
        }

        playSound("merge");

        const targetIdx = indices[j - 1];
        const targetX = targetIdx % GRID_SIZE;
        const targetY = Math.floor(targetIdx / GRID_SIZE);

        if (currentTile.element) {
          currentTile.element.style.setProperty("--x", targetX);
          currentTile.element.style.setProperty("--y", targetY);
          currentTile.element.style.zIndex = "1";
          setTimeout(() => currentTile.element.remove(), 200);
        }
        continue;
      }
    }

    newLine[j] = currentTile;
    j++;
  }

  return newLine;
}

// Nouvelle fonction : Secousse de la grille
function triggerBoardShake() {
  const board =
    document.querySelector(".grid-container") ||
    document.querySelector("#board") ||
    wrapper;
  if (!board) return;
  board.classList.remove("shake-effect");
  void board.offsetWidth; // Reclic d'animation
  board.classList.add("shake-effect");
}

// Nouvelle fonction : Onde de choc qui modifie les voisins
function triggerShockwave(centerX, centerY) {
  const neighbors = [
    { x: centerX + 1, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX, y: centerY + 1 },
    { x: centerX, y: centerY - 1 },
  ];

  neighbors.forEach((pos) => {
    if (pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE) {
      const idx = pos.y * GRID_SIZE + pos.x;
      const neighborTile = grid[idx];

      if (neighborTile) {
        // Multiplie la valeur du voisin par 2 grâce à l'énergie de l'onde !
        neighborTile.value = neighborTile.value * 2;

        if (neighborTile.element) {
          neighborTile.element.classList.remove("animate-shock");
          void neighborTile.element.offsetWidth;
          neighborTile.element.classList.add("animate-shock");
        }
      }
    }
  });

  // Mise à jour visuelle après l'onde
  setTimeout(() => {
    updateView();
  }, 150);
}

let movingTimeout = null;
let moveCount = 0;

let toastTimeout = null;
let toastCooldownTimeout = null;
let isToastCoolingDown = false; // Bloque le re-déclenchement du toast pendant 1 seconde après disparition

function showLiquidGlassToast(message) {
  // Si le toast est en période de rechargement (1s), on ignore la demande
  if (isToastCoolingDown) return;

  let toast = document.getElementById("liquid-glass-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "liquid-glass-toast";
    toast.className = "liquid-glass-toast";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fa-solid fa-ban" style="color: #ff5252;"></i> <span>${message}</span>`;

  // Réinitialise l'animation si la notif est déjà affichée
  toast.classList.remove("show", "shake");
  void toast.offsetWidth; // Force reflow
  toast.classList.add("show", "shake");

  clearTimeout(toastTimeout);
  clearTimeout(toastCooldownTimeout);

  // Masque la notif au bout de 1.8s
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show", "shake");
    isToastCoolingDown = true; // Début de la pause de 1 seconde

    // Attend 1s complète après le retrait visuel avant d'autoriser à réafficher
    toastCooldownTimeout = setTimeout(() => {
      isToastCoolingDown = false;
    }, 1000);
  }, 1800);
}

// Stocke les directions actuellement bloquées/grisées
const blockedDirections = new Set();

function highlightBlockedArrow(direction) {
  const arrowBtn = document.querySelector(`.btn-arrow.arrow-${direction}`);
  if (!arrowBtn) return;

  // 1. On retire immédiatement la classe grisée pour jouer l'animation rouge
  arrowBtn.classList.remove("arrow-disabled", "arrow-blocked");
  void arrowBtn.offsetWidth; // Force reflow pour relancer l'animation CSS
  arrowBtn.classList.add("arrow-blocked");

  // 2. À la fin de l'animation rouge (450ms), on repasse le bouton en grisé
  setTimeout(() => {
    arrowBtn.classList.remove("arrow-blocked");
    arrowBtn.classList.add("arrow-disabled");
    blockedDirections.add(direction);
  }, 450);
}

// Fonction pour réinitialiser et débloquer les flèches après un mouvement réussi
function resetBlockedArrows() {
  blockedDirections.forEach((dir) => {
    const arrowBtn = document.querySelector(`.btn-arrow.arrow-${dir}`);
    if (arrowBtn) {
      arrowBtn.classList.remove("arrow-disabled", "arrow-blocked");
    }
  });
  blockedDirections.clear();
}

let isMoving = false; // Verrou pour éviter les spams de touches

function move(direction) {
  // 1. Si un mouvement est déjà en cours d'animation ou qu'un overlay est présent, on ignore
  if (
    isMoving ||
    isFlashing ||
    document.getElementById("win-overlay") ||
    document.getElementById("game-over-overlay")
  ) {
    return;
  }

  // Active le verrou
  isMoving = true;

  // Sauvegarde de l'état actuel de la grille
  let oldGrid = JSON.stringify(grid.map((t) => (t ? t.value : null)));

  // Simulation du mouvement sur les lignes/colonnes
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
      indices.reverse();
    }

    indices.forEach((globalIdx, k) => {
      grid[globalIdx] = result[k];
    });
  }

  // Vérification si la grille a réellement bougé
  const hasMoved =
    oldGrid !== JSON.stringify(grid.map((t) => (t ? t.value : null)));

  if (hasMoved) {
    // MOUVEMENT VALIDE
    moveCount++;
    hasMovedSinceLastFlash = true; // Pour le mode invisible
    playSound("move");
    updateView();
    // Déclenche le flash au mouvement si on est en mode Invisible ou Hard
    if (currentMode === "Invisible" || currentMode === "Hard") {
      flashTilesOnMove();
    }

    // Débloque les flèches qui étaient grisées
    resetBlockedArrows();

    grid.forEach((tile) => {
      if (tile?.element) tile.element.classList.add("tile-moving");
    });

    clearTimeout(movingTimeout);
    movingTimeout = setTimeout(() => {
      grid.forEach((tile) => {
        if (tile?.element) tile.element.classList.remove("tile-moving");
      });
    }, 260);

    // Une fois la tuile générée et les vérifications faites, on libère le verrou
    setTimeout(() => {
      spawnTile();
      checkGameOver();
      isMoving = false;

      // Si la gravité doit faire tomber les pièces après le coup du joueur :
      if (
        (currentMode === "Gravité" || currentMode === "Hard") &&
        direction !== gravityDirection
      ) {
        setTimeout(() => applyGravity(), 120);
      }
    }, 150);
  } else {
    // MOUVEMENT IMPOSSIBLE
    const directionNames = {
      up: "haut",
      down: "bas",
      left: "gauche",
      right: "droite",
    };

    highlightBlockedArrow(direction);
    showLiquidGlassToast(
      `Mouvement vers le ${directionNames[direction] || direction} impossible !`,
    );

    // Libération immédiate du verrou pour ne pas bloquer les commandes
    isMoving = false;
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

// support et switch entre flèches + WASD, ZQSD, WASD/ZQSD/flèches uniquement

const KEY_MAPPINGS = {
  "flèches + WASD": {
    up: ["ArrowUp", "w", "W"],
    down: ["ArrowDown", "s", "S"],
    left: ["ArrowLeft", "a", "A"],
    right: ["ArrowRight", "d", "D"],
  },
  "flèches + ZQSD": {
    up: ["ArrowUp", "z", "Z"],
    down: ["ArrowDown", "s", "S"],
    left: ["ArrowLeft", "q", "Q"],
    right: ["ArrowRight", "d", "D"],
  },
  "flèches uniquement": {
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
  },
  "WASD uniquement": {
    up: ["w", "W"],
    down: ["s", "S"],
    left: ["a", "A"],
    right: ["d", "D"],
  },
  "ZQSD uniquement": {
    up: ["z", "Z"],
    down: ["s", "S"],
    left: ["q", "Q"],
    right: ["d", "D"],
  },
  "Boutons uniquement": {
    up: [],
    down: [],
    left: [],
    right: [],
  },
};

window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;

  // Empêche le défillement de la page si c'est une flèche
  if (e.key.startsWith("Arrow")) e.preventDefault();

  // On récupère le mapping correspondant au mode actuel (avec fallback sur 'flèches + WASD')
  const currentMapping =
    KEY_MAPPINGS[KvalueTxt] || KEY_MAPPINGS["flèches + WASD"];

  // Recherche de la direction associée à la touche pressée
  for (const [dir, keys] of Object.entries(currentMapping)) {
    if (keys.includes(e.key)) {
      moveAndStartTimer(dir);
      break; // On arrête la recherche dès qu'on a trouvé la direction
    }
  }
});

let KvalueTxt = document.getElementById("value-keyboard").textContent;

function changeKeyboard() {
  if (KvalueTxt === "flèches + WASD") {
    KvalueTxt = "flèches + ZQSD";
  } else if (KvalueTxt === "flèches + ZQSD") {
    KvalueTxt = "flèches uniquement";
  } else if (KvalueTxt === "flèches uniquement") {
    KvalueTxt = "WASD uniquement";
  } else if (KvalueTxt === "WASD uniquement") {
    KvalueTxt = "ZQSD uniquement";
  } else if (KvalueTxt === "ZQSD uniquement") {
    KvalueTxt = "Boutons uniquement";
  } else if (KvalueTxt === "Boutons uniquement") {
    KvalueTxt = "flèches + WASD";
  }

  document.getElementById("value-keyboard").textContent = KvalueTxt;
  localStorage.setItem("keyboardMode", KvalueTxt);
}

function loadKeyboardMode() {
  KvalueTxt = localStorage.getItem("keyboardMode") || "flèches + WASD";
  document.getElementById("value-keyboard").textContent = KvalueTxt;
}

loadKeyboardMode();

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
      if (currentScore > 0 && moveCount > 0) {
        restartGame();
      }
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
    if (currentMode === "Zen") {
      // MODE ZEN : Pas de Game Over ! Libération d'urgence de 2 tuiles gênantes
      performZenClean(2);
    } else {
      stopTimer(); // On arrete le timer peut importe si on a gagné ou pas avant
      triggerGameOver();
    }
  }
}

function triggerGameOver() {
  // Empêche de superposer plusieurs overlays si la fonction est appelée deux fois
  if (document.getElementById("game-over-overlay")) return;

  playSound("gameOver");
  stopTimer();
  // Modes gravité et invisible
  stopGravityTimer();
  stopInvisibleMode();
  stopChronoTime();

  // 1. Clignotement rouge sur toutes les flèches
  const allArrows = document.querySelectorAll(".btn-arrow");
  allArrows.forEach((btn) => {
    btn.classList.remove("arrow-blocked", "arrow-disabled");
    void btn.offsetWidth; // Force reflow pour relancer l'animation
    btn.classList.add("arrow-gameover-blink");
  });

  // 2. Après le double clignotement (0.8s), passer toutes les flèches en grisé
  setTimeout(() => {
    allArrows.forEach((btn) => {
      btn.classList.remove("arrow-gameover-blink");
      btn.classList.add("arrow-disabled");
    });
  }, 800);

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
      Temps tenu : ${heldMin} min, ${Math.floor(heldSec - 1)} sec
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
  isMoving = false; // Verrou pour éviter les spams de touches
  score.textContent = currentScore; // Mise à jour de l'affichage du score

  // 4. Réinitialisation du Timer
  stopTimer();
  timeMin = 0;
  timeSec = 0;
  // Modes gravité, invisible et zen
  stopGravityTimer();
  if (currentMode === "Gravité" || currentMode === "Hard") {
    startGravityTimer();
  }
  if (currentMode === "Invisible" || currentMode === "Hard") {
    startInvisibleMode();
  }
  stopZenTimer();
  if (currentMode === "Zen") {
    startZenTimer();
  }
  updateTimerDisplay();

  // 5. Suppression de l'écran de Game Over s'il existe
  const overlay = document.getElementById("game-over-overlay");
  if (overlay) {
    overlay.remove();
  }

  // 6. Réinitialisation du Chrono
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

  // 7. Réinitialisation de l'état visuel de toutes les flèches
  const allArrows = document.querySelectorAll(".btn-arrow");
  allArrows.forEach((btn) => {
    btn.classList.remove(
      "arrow-disabled",
      "arrow-blocked",
      "arrow-gameover-blink",
    );
  });

  // Vider le Set des directions bloquées
  blockedDirections.clear();

  // 8. Reconstruction du jeu
  initBackground(); // Recrée les emplacements vides (le fond)
  spawnTile(); // Ajoute la première tuile
  spawnTile(); // Ajoute la deuxième tuile
}

score.textContent = currentScore;
bestScore.textContent = maxScore;

function updateSettingsPanelButtons() {
  const settingsPanel = document.getElementById("settings-play");
  if (!settingsPanel) return;

  const isOpen = document.body.classList.contains("settings-open");
  const buttons = settingsPanel.querySelectorAll("button");

  buttons.forEach((button) => {
    button.disabled = !isOpen;
  });
}

function toggleSettings() {
  document.body.classList.toggle("settings-open");
  updateSettingsPanelButtons();
}

updateSettingsPanelButtons();

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
  closeBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
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

  toggleChronoTimeDisplay();

  // Mode Gravité
  if (currentMode === "Gravité" || currentMode === "Hard") {
    gravityDirection = "down";
    startGravityTimer();
  } else {
    stopGravityTimer();
    const wrapper = document.getElementById("game");
    if (wrapper) {
      wrapper.classList.remove(
        "gravity-down",
        "gravity-left",
        "gravity-up",
        "gravity-right",
      );
    }
  }

  // Mode Invisible
  if (currentMode === "Invisible" || currentMode === "Hard") {
    startInvisibleMode();
  } else {
    stopInvisibleMode();
  }

  // MODE ZEN : Gestion des timers et événements
  if (currentMode === "Zen") {
    startZenTimer();
  } else {
    stopZenTimer();
  }
}

const chronoTime = document.getElementById("time-chronoMode");
let chronoTimeTotalSec = 0;
let chronoTimeTotalMin = 0;

function toggleChronoTimeDisplay() {
  if (currentMode === "Chrono") {
    chronoTime.style.display = "inline-block";
  } else {
    chronoTime.style.display = "none";
  }
}

// --- Chrono ---
function startChronoTime() {
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

      // Appel propre : incrémente le total à chaque seconde
      toggleTotaldisplay();
    } else {
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
  chronoTimeTotalSec++;
  if (chronoTimeTotalSec >= 60) {
    chronoTimeTotalSec = 0;
    chronoTimeTotalMin++;
  }
}

// --- Négatifs ---

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
  localStorage.setItem("goalValue", newGoal); // Sauvegarde dans le localStorage
  restartGame();
}

// --- Gravité ---

function startGravityTimer() {
  stopGravityTimer();
  gravityTimerSec = 60;
  updateGravityUI();

  gravityInterval = setInterval(() => {
    if (
      document.getElementById("game-over-overlay") ||
      document.getElementById("win-overlay")
    ) {
      return;
    }

    gravityTimerSec--;
    updateGravityUI();

    if (gravityTimerSec <= 0) {
      rotateGravityDirection();
      gravityTimerSec = 60;
    }
  }, 1000);
}

function stopGravityTimer() {
  if (gravityInterval !== null) {
    clearInterval(gravityInterval);
    gravityInterval = null;
  }
}

function rotateGravityDirection() {
  const directions = ["down", "left", "up", "right"];
  const currentIndex = directions.indexOf(gravityDirection);
  gravityDirection = directions[(currentIndex + 1) % directions.length];

  // Animation visuelle de la grille
  const wrapper = document.getElementById("game");
  if (wrapper) {
    wrapper.classList.remove(
      "gravity-down",
      "gravity-left",
      "gravity-up",
      "gravity-right",
    );
    wrapper.classList.add(`gravity-${gravityDirection}`);
  }

  // Applique immédiatement la nouvelle gravité
  applyGravity();
}

function applyGravity() {
  if (currentMode !== "Gravité" && currentMode !== "Hard") return;

  // Utilise la fonction move() existante dans la direction de la gravité
  move(gravityDirection);
}

function updateGravityUI() {
  const modeDisplay = document.getElementById("value-mode");
  if (currentMode === "Gravité" && modeDisplay) {
    const arrows = { down: "🠇", left: "🠄", up: "🠅", right: "🠆" };
    modeDisplay.textContent = `Gravité (${arrows[gravityDirection]} ${gravityTimerSec}s)`;
  }
}
// --- Invisible ---
let invisibleTimeout = null;
let isFlashing = false; // Bloque les actions pendant le flash

function startInvisibleMode() {
  stopInvisibleMode();
  const gameWrapper = document.getElementById("game");
  if (gameWrapper) {
    gameWrapper.classList.add("mode-invisible");
  }
}

function stopInvisibleMode() {
  isFlashing = false; // Réinitialise le blocage
  if (invisibleTimeout !== null) {
    clearTimeout(invisibleTimeout);
    invisibleTimeout = null;
  }
  const gameWrapper = document.getElementById("game");
  if (gameWrapper) {
    gameWrapper.classList.remove("mode-invisible", "reveal");
  }
}

function flashTilesOnMove() {
  const gameWrapper = document.getElementById("game");
  if (!gameWrapper) return;

  if (invisibleTimeout !== null) {
    clearTimeout(invisibleTimeout);
  }

  isFlashing = true; // Empêche de jouer
  gameWrapper.classList.add("reveal");

  invisibleTimeout = setTimeout(() => {
    gameWrapper.classList.remove("reveal");
    isFlashing = false; // Débloque le jeu une fois l'animation finie
  }, 700);
}

// --- Zen ---
function performZenClean(count = 1) {
  let tilesWithScores = [];

  // 1. Calcul du score de gêne/nuisance pour chaque tuile présente
  grid.forEach((tile, index) => {
    if (!tile) return;

    // Protection : Ne jamais supprimer les tuiles de haute valeur (ex: >= 256)
    if (Math.abs(tile.value) >= 256) return;

    const x = index % GRID_SIZE;
    const y = Math.floor(index / GRID_SIZE);

    let isolateScore = 0;
    let hasMatchingNeighbor = false;

    // Inspection des 4 voisins (Haut, Bas, Gauche, Droite)
    const neighbors = [
      { x: x + 1, y: y },
      { x: x - 1, y: y },
      { x: x, y: y + 1 },
      { x: x, y: y - 1 },
    ];

    neighbors.forEach((pos) => {
      if (pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE) {
        const nIdx = pos.y * GRID_SIZE + pos.x;
        const neighbor = grid[nIdx];
        if (neighbor) {
          if (neighbor.value === tile.value) {
            hasMatchingNeighbor = true; // Voisin identique = fusion possible
          } else if (Math.abs(neighbor.value) > Math.abs(tile.value) * 4) {
            // Écart important de valeur : la petite tuile gêne la grande
            isolateScore += 15;
          }
        }
      }
    });

    // Plus la valeur est petite, plus la tuile est candidate au nettoyage
    let valuePenalty = 100 / Math.abs(tile.value);

    // Si la tuile n'a aucun voisin fusionnable, sa priorité d'élimination augmente
    let totalNuisance =
      valuePenalty + isolateScore + (hasMatchingNeighbor ? 0 : 25);

    tilesWithScores.push({ index, tile, score: totalNuisance });
  });

  // Si aucune tuile n'est éligible au nettoyage
  if (tilesWithScores.length === 0) return;

  // 2. Tri des tuiles par score de nuisance décroissant
  tilesWithScores.sort((a, b) => b.score - a.score);

  // 3. Suppression visuelle et logique de la/des tuiles ciblées
  for (let i = 0; i < Math.min(count, tilesWithScores.length); i++) {
    const target = tilesWithScores[i];
    const targetTile = target.tile;
    const targetIndex = target.index;

    if (targetTile.element) {
      targetTile.element.classList.add("animate-zen-clean");
      setTimeout(() => {
        if (targetTile.element) targetTile.element.remove();
      }, 500); // 500ms : synchronisé avec l'animation CSS
    }

    grid[targetIndex] = null;
  }

  // Feedback sonore et notification compacte en bas à droite
  playSound("merge");
  showZenToast("Purification Zen : Tuile parasite dissoute !");

  // Effet visuel discret sur la grille
  triggerBoardShake();

  // Mise à jour de la grille après la fin de l'animation
  setTimeout(() => {
    updateView();
  }, 500);
}

function startZenTimer() {
  stopZenTimer();
  zenTimerSec = ZEN_CLEAN_INTERVAL_SEC;
  updateZenUI();

  zenCleanInterval = setInterval(() => {
    if (
      document.getElementById("game-over-overlay") ||
      document.getElementById("win-overlay")
    )
      return;

    zenTimerSec--;
    updateZenUI();

    if (zenTimerSec <= 0) {
      performZenClean(1); // Nettoie 1 tuile gênante toutes les 30s
      zenTimerSec = ZEN_CLEAN_INTERVAL_SEC;
    }
  }, 1000);
}

function stopZenTimer() {
  if (zenCleanInterval !== null) {
    clearInterval(zenCleanInterval);
    zenCleanInterval = null;
  }
}

function updateZenUI() {
  const modeDisplay = document.getElementById("value-mode");
  if (currentMode === "Zen" && modeDisplay) {
    modeDisplay.textContent = `Zen (✨ ${zenTimerSec}s)`;
  }
}

function showZenToast(message) {
  // On attache la notif au conteneur du jeu s'il existe, sinon au body
  const gameContainer =
    document.getElementById("game-container") ||
    document.getElementById("game") ||
    document.body;

  let container = document.getElementById("zen-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "zen-toast-container";
    container.className = "zen-toast-container";

    // Assure un positionnement relatif au conteneur du jeu s'il n'est pas statique
    if (
      gameContainer !== document.body &&
      getComputedStyle(gameContainer).position === "static"
    ) {
      gameContainer.style.position = "relative";
    }

    gameContainer.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "zen-toast";
  toast.innerHTML = `
    <span class="zen-toast-icon">✨</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }, 2200);
}

// Fonction utilitaire si le conteneur n'existe pas encore
function createToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

//  Reste...

function loadGoalValue() {
  const savedGoal = localStorage.getItem("goalValue");
  if (savedGoal) {
    document.getElementById("value-goal").textContent = savedGoal;
  }
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

/* ========================================= */
/* LOGIQUE MODALE "COMMENT JOUER"            */
/* ========================================= */

function showHowToPlay() {
  const modal = document.getElementById("how-to-play-modal");
  if (modal) {
    modal.classList.add("visible");
  }
}

function closeHowToPlay() {
  const modal = document.getElementById("how-to-play-modal");
  if (modal) {
    modal.classList.remove("visible");

    // Sauvegarde de l'état de la checkbox
    const disableCheckbox = document.getElementById("disable-startup-modal");
    if (disableCheckbox) {
      localStorage.setItem("hideHowToPlayStartup", disableCheckbox.checked);
    }
  }
}

// Initialisation et animation de la nouvelle checkbox
document.addEventListener("DOMContentLoaded", () => {
  const hideAtStartup = localStorage.getItem("hideHowToPlayStartup") === "true";
  const disableCheckbox = document.getElementById("disable-startup-modal");
  const checkAudio = new Audio("Assets/Sounds/check.mp3");

  if (disableCheckbox) {
    disableCheckbox.checked = hideAtStartup;

    // Applique directement l'état visuel au chargement si coché
    if (hideAtStartup) {
      const taskItem = disableCheckbox.closest(".task-item");
      if (taskItem) {
        taskItem.classList.add("done");
        taskItem.style.setProperty("--text-line-scale", "1");
      }
    }

    // Animation au clic / changement d'état
    disableCheckbox.addEventListener("change", (e) => {
      const task = e.target.closest(".task-item");
      const checkbox = task.querySelector(".checkbox");

      if (e.target.checked) {
        // Joue le son s'il existe
        checkAudio.play().catch(() => {});

        checkbox.animate(
          [
            { offsetPath: "none", "--checkbox-lines-offset": "13.5px" },
            { "--checkbox-lines-offset": "4.5px" },
          ],
          {
            duration: 200,
            delay: 200,
            fill: "forwards",
          },
        );

        const textAnimation = task.animate(
          [
            { "--text-line-scale": 0, "--text-x": "0px", offset: 0 },
            { "--text-line-scale": 1, "--text-x": "2px", offset: 0.5 },
            { "--text-line-scale": 1, "--text-x": "0px", offset: 1 },
          ],
          {
            duration: 300,
            fill: "forwards",
          },
        );

        textAnimation.onfinish = () => {
          task.style.setProperty("--text-line-scale", "1");
          task.style.setProperty("--text-x", "0px");
          task.classList.add("done");
        };

        return;
      }

      // Décocher
      const reverseAnimation = task.animate(
        [{ "--text-line-scale": 1 }, { "--text-line-scale": 0 }],
        {
          duration: 250,
          fill: "forwards",
        },
      );

      reverseAnimation.onfinish = () => {
        task.style.setProperty("--text-line-scale", "0");
        task.classList.remove("done");
      };
    });
  }

  if (!hideAtStartup) {
    setTimeout(() => {
      showHowToPlay();
    }, 400);
  }
});

// rejouer

function triggerRestartAnimation() {
  const iconRestart = document.getElementById("icon-restart");
  if (!iconRestart) return;

  // Retire la classe pour stopper l'état précédent si elle y est encore
  iconRestart.classList.remove("is-spinning");

  // Force un reflow du navigateur (astuce pour réinitialiser l'animation CSS)
  void iconRestart.offsetWidth;

  // Ajoute la classe qui déclenche l'animation de rotation complète
  iconRestart.classList.add("is-spinning");

  // Lance la logique de redémarrage du jeu

  // Retire la classe une fois l'animation terminée (ex: après 1 seconde)
  setTimeout(() => {
    iconRestart.classList.remove("is-spinning");
    restartGame();
  }, 1000);
}

// modals footer

const modalTriggers = document.querySelectorAll("[data-open-modal]");
const modalOverlays = document.querySelectorAll(".glass-modal-overlay");

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const targetId = trigger.getAttribute("data-open-modal");
    const targetModal = document.getElementById(targetId);
    if (targetModal) {
      targetModal.classList.add("active");
    }
  });
});

document.querySelectorAll(".glass-modal-close").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest(".glass-modal-overlay")?.classList.remove("active");
  });
});

modalOverlays.forEach((overlay) => {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.classList.remove("active");
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    modalOverlays.forEach((overlay) => overlay.classList.remove("active"));
  }
});

// Initialisation du jeu complet
initBackground();
spawnTile();
spawnTile();
loadGoalValue();
