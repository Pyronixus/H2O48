const GRID_SIZE = 6;
const wrapper = document.getElementById("game");
let grid = Array(GRID_SIZE * GRID_SIZE).fill(null);

function initBackground() {
  wrapper.innerHTML = "";
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const empty = document.createElement("div");
    empty.classList.add("tile-empty");
    empty.addEventListener("click", () => {
      if (isDevMode && grid[i] === null) {
        const val = parseInt(document.getElementById("dev-value").value) || 2;
        injectTile(i, val);
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

      newtile.addEventListener("contextmenu", (e) => {
        if (isDevMode) {
          e.preventDefault();
          newtile.remove();
          grid[index] = null;
        }
      });

      newtile.addEventListener("click", () => {
        newtile.classList.add("animate-flip");
        setTimeout(() => newtile.classList.remove("animate-flip"), 1000);
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
      if (tile?.element) {
        tile.element.classList.add("tile-moving");
      }
    });
    setTimeout(() => {
      grid.forEach((tile) => {
        if (tile?.element) {
          tile.element.classList.remove("tile-moving");
        }
      });
    }, 260);
    setTimeout(spawnTile, 100);
  }
}

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    const timeCheckbox = document.getElementById("toggle-reset-score");
    if (timeCheckbox && timeCheckbox.checked && timerInterval === null) {
      startTimer();
    }
    move(e.key.replace("Arrow", "").toLowerCase());
  }
});

let isDevMode = false;
let inputBuffer = "";
const SECRET_CODE = "h2o";

window.addEventListener("keydown", (e) => {
  inputBuffer += e.key.toLowerCase();
  inputBuffer = inputBuffer.slice(-SECRET_CODE.length);
  if (inputBuffer === SECRET_CODE) {
    document.body.classList.toggle("show-debug");
    inputBuffer = "";
  }
});

function toggleDevMode() {
  isDevMode = !isDevMode;
  const btn = document.querySelector("#dev-mode button");
  btn.textContent = isDevMode ? "Mode Dev : ON" : "Mode Dev : OFF";
  btn.style.background = isDevMode ? "#4caf50" : "#fbc02d";
  document.body.classList.toggle("dev-active", isDevMode);
}

function injectTile(index, value) {
  grid[index] = {
    value: value,
    element: null,
    merged: false,
  };
  updateView();
}

function moveAndStartTimer(direction) {
  const timeCheckbox = document.getElementById("toggle-reset-score");
  if (timeCheckbox && timeCheckbox.checked && timerInterval === null) {
    startTimer();
  }
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
  setTimeout(() => {
    score.classList.remove("score-pop");
  }, 150);

  if (currentScore > maxScore) {
    maxScore = currentScore;
    bestScore.textContent = maxScore;
    score.classList.add("score-yellow");
    score.classList.add("score-big");
    setTimeout(() => {
      score.classList.remove("score-big");
    }, 200);
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
  timeCheckbox.addEventListener("change", (event) => {
    setTimerActive(event.target.checked);
  });
  updateTimerDisplay();
  setTimerActive(timeCheckbox.checked);
} else {
  timeText.style.display = "none";
}

initBackground();
spawnTile();
spawnTile();

function reinitBestScore() {
  if (!confirm("Voulez-vous réinitialiser votre meilleur score ?")) {
    return;
  }
  localStorage.removeItem("bestScore");
  bestScore.textContent = 0;
}
