const GRID_SIZE = 6;
const wrapper = document.getElementById("game");
let grid = Array(GRID_SIZE * GRID_SIZE).fill(null);

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
    const xPos = (x * 100) / GRID_SIZE;
    const yPos = (y * 100) / GRID_SIZE;

    if (!tile.element) {
      const newtile = document.createElement("div");
      newtile.classList.add("tile", "tile-" + tile.value, "tile-new");
      const spanTexte = document.createElement("span");
      spanTexte.textContent = tile.value;
      newtile.appendChild(spanTexte);

      newtile.addEventListener("contextmenu", (e) => e.preventDefault());

      newtile.addEventListener("mousedown", (e) => {
        if (isDevMode && e.button === 2) {
          e.preventDefault();
          newtile.remove();
          grid[index] = null;
          startHoldAction(() => {
            if (grid[index] !== null) {
              grid[index].element?.remove();
              grid[index] = null;
            }
          });
        } else if (!isDevMode && e.button === 0) {
          newtile.classList.add("animate-flip");
          setTimeout(() => newtile.classList.remove("animate-flip"), 1000);
        }
      });

      newtile.style.left = `${xPos}%`;
      newtile.style.top = `${yPos}%`;
      wrapper.appendChild(newtile);
      tile.element = newtile;
    } else {
      tile.element.style.left = `${xPos}%`;
      tile.element.style.top = `${yPos}%`;
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

function slide(line) {
  let newLine = Array(GRID_SIZE).fill(null);
  let j = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === null) continue;
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
      setTimeout(() => oldTile.element?.remove(), 100);
    } else {
      newLine[j] = line[i];
      j++;
    }
  }
  return newLine;
}

function move(direction) {
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
    if (direction === "right" || direction === "down") line.reverse();
    let result = slide(line);
    if (direction === "right" || direction === "down") result.reverse();
    indices.forEach((globalIdx, k) => {
      grid[globalIdx] = result[k];
    });
  }
  if (oldGrid !== JSON.stringify(grid.map((t) => (t ? t.value : null)))) {
    updateView();
    grid.forEach((tile) => {
      if (tile?.element) tile.element.classList.add("tile-moving");
    });
    setTimeout(() => {
      grid.forEach((tile) => {
        if (tile?.element) tile.element.classList.remove("tile-moving");
      });
    }, 260);
    setTimeout(spawnTile, 100);
  }
}

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    const timeCheckbox = document.getElementById("toggle-reset-score");
    if (timeCheckbox && timeCheckbox.checked && timerInterval === null)
      startTimer();
    move(e.key.replace("Arrow", "").toLowerCase());
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
  const timeCheckbox = document.getElementById("toggle-reset-score");
  if (timeCheckbox && timeCheckbox.checked && timerInterval === null)
    startTimer();
  move(direction);
}

const score = document.getElementById("score-value");
const bestScore = document.getElementById("best-score-value");
let currentScore = 0;
let maxScore = parseInt(localStorage.getItem("bestScore")) || 0;

function updateScore(points) {
  currentScore += points;
  score.textContent = currentScore;
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

score.textContent = currentScore;
bestScore.textContent = maxScore;

function toggleSettings() {
  document.body.classList.toggle("settings-open");
}

const timeCheckbox = document.getElementById("toggle-reset-score");
const timeText = document.getElementById("time-txt");
const timeMinEl = document.getElementById("time-min");
const timeSecEl = document.getElementById("time-sec");
let timerInterval = null;
let timeMin = 0;
let timeSec = 0;

function updateTimerDisplay() {
  timeMinEl.textContent = String(timeMin).padStart(2, "0");
  timeSecEl.textContent = String(timeSec).padStart(2, "0");
}

function startTimer() {
  if (timerInterval !== null) return;
  timerInterval = setInterval(() => {
    timeSec += 1;
    if (timeSec === 60) {
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
  timeText.style.display = active ? "flex" : "none";
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

initBackground();
spawnTile();
spawnTile();

function reinitBestScore() {
  if (!confirm("Voulez-vous réinitialiser votre meilleur score ?")) return;
  localStorage.removeItem("bestScore");
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

    tile.addEventListener("mouseenter", () => {
      highlightTilesOnBoard(value);
    });
    tile.addEventListener("mouseleave", () => {
      clearBoardHighlight();
    });
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
    if (tile.value === value) {
      tile.element.classList.add("visuel-match");
    } else {
      tile.element.classList.add("visuel-dim");
    }
  });
}

function clearBoardHighlight() {
  grid.forEach((tile) => {
    if (!tile?.element) return;
    tile.element.classList.remove("visuel-match", "visuel-dim");
  });
}
