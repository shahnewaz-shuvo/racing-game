const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const speedEl = document.getElementById("speed");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const restartBtn = document.getElementById("restart");

const ROAD_WIDTH = canvas.width;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

const keys = {
  ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
  a: false, d: false, w: false, s: false,
};

const state = {
  player: { x: ROAD_WIDTH / 2 - 24, y: canvas.height - 130, width: 48, height: 92 },
  traffic: [],
  roadOffset: 0,
  streakOffset: 0,
  speed: 6,
  maxSpeed: 15,
  minSpeed: 3,
  score: 0,
  best: Number(localStorage.getItem("neonSprintBest") || 0),
  gameOver: false,
  spawnTimer: 0,
  particles: [],
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
    color: `hsl(${Math.floor(Math.random() * 360)} 80% 55%)`,
  });
}

function fillRRect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
}

function addExhaust() {
  const px = state.player.x + state.player.width / 2;
  const py = state.player.y + state.player.height;
  for (let i = 0; i < 3; i++) {
    state.particles.push({
      x: px + (Math.random() - 0.5) * 18,
      y: py + Math.random() * 4,
      vx: (Math.random() - 0.5) * 1.2,
      vy: state.speed * 0.35 + Math.random() * 1.5,
      life: 0.7 + Math.random() * 0.4,
      size: 3 + Math.random() * 3,
    });
  }
}

function updateParticles() {
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = p.life * 0.45;
    const lightness = 55 + p.life * 20;
    ctx.fillStyle = `hsl(200 20% ${lightness}%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRoad() {
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, "#0f1520");
  grad.addColorStop(0.5, "#141e30");
  grad.addColorStop(1, "#0f1520");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Speed streaks on road edges — intensity scales with speed
  const speedRatio = Math.max(0, (state.speed - 5) / (state.maxSpeed - 5));
  if (speedRatio > 0.05) {
    const alpha = speedRatio * 0.4;
    const dashH = 50;
    const dashGap = 30;
    const period = dashH + dashGap;
    ctx.fillStyle = `rgba(0, 210, 255, ${alpha})`;
    for (let y = -dashH; y < canvas.height + dashH; y += period) {
      ctx.fillRect(3, y + state.streakOffset, 3, dashH);
      ctx.fillRect(canvas.width - 6, y + state.streakOffset, 3, dashH);
    }
  }

  // Glowing edge lines
  ctx.save();
  ctx.shadowColor = "#0099cc";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#007aaa";
  ctx.fillRect(0, 0, 3, canvas.height);
  ctx.fillRect(canvas.width - 3, 0, 3, canvas.height);
  ctx.restore();

  // Road shoulder
  ctx.fillStyle = "#1e2d42";
  ctx.fillRect(3, 0, 9, canvas.height);
  ctx.fillRect(canvas.width - 12, 0, 9, canvas.height);

  // Lane dividers with subtle glow
  const laneH = 38;
  const laneGap = 28;
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.25)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "rgba(245,246,250,0.72)";
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = lane * LANE_WIDTH - 4;
    for (let y = -laneH; y < canvas.height + laneH; y += laneH + laneGap) {
      ctx.fillRect(x, y + state.roadOffset, 8, laneH);
    }
  }
  ctx.restore();
}

function drawCar(car, isPlayer = false) {
  const { x, y, width, height } = car;
  const carColor = isPlayer ? "#00d5ff" : car.color;

  ctx.save();

  // Body with glow
  ctx.shadowColor = carColor;
  ctx.shadowBlur = isPlayer ? 20 : 10;
  ctx.fillStyle = carColor;
  fillRRect(x, y, width, height, 6);

  // Body glare strip
  ctx.shadowBlur = 0;
  const glare = ctx.createLinearGradient(x, 0, x + width, 0);
  glare.addColorStop(0, "rgba(0,0,0,0.28)");
  glare.addColorStop(0.3, "rgba(255,255,255,0.16)");
  glare.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = glare;
  ctx.fillRect(x, y, width, height);

  // Windshield
  ctx.fillStyle = "#07131e";
  ctx.fillRect(x + 8, y + 12, width - 16, 18);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(x + 9, y + 13, Math.floor((width - 18) * 0.42), 16);

  // Rear window
  ctx.fillStyle = "#07131e";
  ctx.fillRect(x + 8, y + height - 30, width - 16, 14);

  // Headlights
  ctx.shadowColor = "#fff5c0";
  ctx.shadowBlur = isPlayer ? 16 : 10;
  ctx.fillStyle = "#fff5c0";
  ctx.fillRect(x + 4, y + 4, 10, 8);
  ctx.fillRect(x + width - 14, y + 4, 10, 8);

  // Tail lights
  ctx.shadowColor = "#ff2040";
  ctx.shadowBlur = isPlayer ? 14 : 8;
  ctx.fillStyle = "#ff3050";
  ctx.fillRect(x + 4, y + height - 14, 10, 8);
  ctx.fillRect(x + width - 14, y + height - 14, 10, 8);

  ctx.restore();
}

function checkCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function update() {
  if (state.gameOver) return;

  if (keys.ArrowLeft || keys.a) state.player.x -= 7;
  if (keys.ArrowRight || keys.d) state.player.x += 7;
  if (keys.ArrowUp || keys.w) state.speed = Math.min(state.maxSpeed, state.speed + 0.08);
  if (keys.ArrowDown || keys.s) state.speed = Math.max(state.minSpeed, state.speed - 0.12);

  state.player.x = Math.max(12, Math.min(canvas.width - state.player.width - 12, state.player.x));

  state.roadOffset += state.speed;
  if (state.roadOffset > 66) state.roadOffset = 0;

  state.streakOffset += state.speed * 1.5;
  if (state.streakOffset > 80) state.streakOffset -= 80;

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

  addExhaust();
  updateParticles();

  speedEl.textContent = state.speed.toFixed(1);
  scoreEl.textContent = Math.floor(state.score);
  bestEl.textContent = state.best;
}

function render() {
  drawRoad();
  drawParticles();
  for (const trafficCar of state.traffic) {
    drawCar(trafficCar);
  }
  drawCar(state.player, true);

  if (state.gameOver) {
    ctx.fillStyle = "rgba(4, 8, 18, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.shadowColor = "#ff4d6d";
    ctx.shadowBlur = 42;
    ctx.fillStyle = "#ff4d6d";
    ctx.font = "700 52px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("CRASHED", canvas.width / 2, canvas.height / 2 - 24);
    ctx.restore();

    ctx.fillStyle = "#eef3ff";
    ctx.font = "600 20px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Press Restart Race", canvas.width / 2, canvas.height / 2 + 24);

    ctx.save();
    ctx.shadowColor = "#00d5ff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#00d5ff";
    ctx.font = "500 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`Score: ${Math.floor(state.score)}`, canvas.width / 2, canvas.height / 2 + 56);
    ctx.restore();
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
  state.particles = [];
  state.streakOffset = 0;
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
