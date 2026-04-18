const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const speedEl = document.getElementById("speed");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const restartBtn = document.getElementById("restart");

const ROAD_WIDTH = canvas.width;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };

const state = {
  player: { x: ROAD_WIDTH / 2 - 24, y: canvas.height - 130, width: 48, height: 92, lane: 1 },
  traffic: [],
  roadOffset: 0,
  speed: 6,
  maxSpeed: 15,
  minSpeed: 3,
  score: 0,
  best: Number(localStorage.getItem("neonSprintBest") || 0),
  gameOver: false,
  spawnTimer: 0,
};

bestEl.textContent = state.best;

function laneCenterX(lane) {
  return lane * LANE_WIDTH + LANE_WIDTH / 2;
}

function spawnTraffic() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const width = 44;
  const height = 84;
  state.traffic.push({
    x: laneCenterX(lane) - width / 2,
    y: -height - 30,
    width,
    height,
    speed: state.speed * (0.8 + Math.random() * 0.5),
    color: `hsl(${Math.random() * 360} 80% 55%)`,
  });
}

function drawRoad() {
  ctx.fillStyle = "#151a25";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#2c364d";
  ctx.fillRect(0, 0, 6, canvas.height);
  ctx.fillRect(canvas.width - 6, 0, 6, canvas.height);

  ctx.fillStyle = "#f5f6fa";
  const dashHeight = 38;
  const gap = 28;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = lane * LANE_WIDTH - 4;
    for (let y = -dashHeight; y < canvas.height + dashHeight; y += dashHeight + gap) {
      ctx.fillRect(x, y + state.roadOffset, 8, dashHeight);
    }
  }
}

function drawCar(car, color = "#00d5ff") {
  ctx.fillStyle = color;
  ctx.fillRect(car.x, car.y, car.width, car.height);

  ctx.fillStyle = "#09121c";
  ctx.fillRect(car.x + 8, car.y + 12, car.width - 16, 18);
  ctx.fillRect(car.x + 8, car.y + car.height - 30, car.width - 16, 14);

  ctx.fillStyle = "#e8f4ff";
  ctx.fillRect(car.x + 5, car.y + 4, 10, 8);
  ctx.fillRect(car.x + car.width - 15, car.y + 4, 10, 8);
  ctx.fillRect(car.x + 5, car.y + car.height - 12, 10, 8);
  ctx.fillRect(car.x + car.width - 15, car.y + car.height - 12, 10, 8);
}

function checkCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function update() {
  if (state.gameOver) return;

  if (keys.ArrowLeft) state.player.x -= 7;
  if (keys.ArrowRight) state.player.x += 7;
  if (keys.ArrowUp) state.speed = Math.min(state.maxSpeed, state.speed + 0.08);
  if (keys.ArrowDown) state.speed = Math.max(state.minSpeed, state.speed - 0.12);

  state.player.x = Math.max(8, Math.min(canvas.width - state.player.width - 8, state.player.x));

  state.roadOffset += state.speed;
  if (state.roadOffset > 66) state.roadOffset = 0;

  state.spawnTimer += 1;
  const spawnInterval = Math.max(28, 90 - state.speed * 4);
  if (state.spawnTimer >= spawnInterval) {
    spawnTraffic();
    state.spawnTimer = 0;
  }

  for (const car of state.traffic) {
    car.y += car.speed + state.speed * 0.35;
    if (checkCollision(state.player, car)) {
      state.gameOver = true;
    }
  }

  state.traffic = state.traffic.filter((car) => car.y < canvas.height + 120);

  state.score += state.speed * 0.12;
  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem("neonSprintBest", String(state.best));
  }

  speedEl.textContent = state.speed.toFixed(1);
  scoreEl.textContent = Math.floor(state.score);
  bestEl.textContent = state.best;
}

function render() {
  drawRoad();
  for (const trafficCar of state.traffic) {
    drawCar(trafficCar, trafficCar.color);
  }
  drawCar(state.player);

  if (state.gameOver) {
    ctx.fillStyle = "rgb(0 0 0 / 66%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff4d6d";
    ctx.font = "700 48px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("CRASHED", canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = "#f6f7fb";
    ctx.font = "600 22px system-ui";
    ctx.fillText("Press Restart Race", canvas.width / 2, canvas.height / 2 + 26);
  }
}

function tick() {
  update();
  render();
  requestAnimationFrame(tick);
}

function resetGame() {
  state.player.x = ROAD_WIDTH / 2 - 24;
  state.traffic = [];
  state.speed = 6;
  state.score = 0;
  state.spawnTimer = 0;
  state.gameOver = false;
}

window.addEventListener("keydown", (event) => {
  if (event.key in keys) {
    event.preventDefault();
    keys[event.key] = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key in keys) {
    event.preventDefault();
    keys[event.key] = false;
  }
});

restartBtn.addEventListener("click", resetGame);

tick();
