const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = 500;
const HEIGHT = 700;
const FPS = 60;
const ROAD_WIDTH = 540;
const ROAD_LEFT = (WIDTH - ROAD_WIDTH) / 2;
const ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
const LANE_COUNT = 5;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const CAR_WIDTH = 56;
const CAR_HEIGHT = 90;
const JUMP_UNLOCK_SCORE = 2000;
const SPEED_BOOST_SCORE = 1000;
const SPEED_BOOST_AMOUNT = 4;
const SPEED_BOOST_NOTICE_DURATION = 180;

const colors = {
  gray: "#3c3c3c",
  white: "#ffffff",
  yellow: "#f0dc3c",
  red: "#dc2828",
  blue: "#2878dc",
  green: "#28c864",
  black: "#0a0a0a",
  window: "#96d2f5",
  headlight: "#fff5aa",
  tail: "#b91923",
};

const keys = new Set();
const touch = { left: false, right: false };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function laneCenterX(lane) {
  return ROAD_LEFT + LANE_WIDTH * lane + LANE_WIDTH / 2;
}

function shade(hex, amount) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = clamp((value >> 16) + amount, 0, 255);
  const g = clamp(((value >> 8) & 255) + amount, 0, 255);
  const b = clamp((value & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function roundedRect(x, y, w, h, radius, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

class Car {
  constructor() {
    this.width = CAR_WIDTH;
    this.height = CAR_HEIGHT;
    this.x = WIDTH / 2 - this.width / 2;
    this.y = HEIGHT - this.height - 30;
    this.maxSpeedX = 7;
    this.jumpTimer = 0;
    this.jumpDuration = 60;
    this.jumpCooldown = 0;
    this.jumpCooldownDuration = 45;
  }

  rect() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  startJump(canJump) {
    if (canJump && this.jumpTimer === 0 && this.jumpCooldown === 0) {
      this.jumpTimer = this.jumpDuration;
      this.jumpCooldown = this.jumpDuration + this.jumpCooldownDuration;
    }
  }

  isAirborne() {
    return this.jumpTimer > 0;
  }

  jumpProgress() {
    if (this.jumpTimer === 0) return 0;
    const elapsed = this.jumpDuration - this.jumpTimer;
    const midpoint = this.jumpDuration / 2;
    return Math.max(0, 1 - Math.abs(elapsed - midpoint) / midpoint);
  }

  update() {
    let speedX = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || touch.left) speedX = -this.maxSpeedX;
    if (keys.has("ArrowRight") || keys.has("d") || touch.right) speedX = this.maxSpeedX;
    this.x = clamp(this.x + speedX, ROAD_LEFT + 5, ROAD_RIGHT - this.width - 5);
    if (this.jumpTimer > 0) this.jumpTimer -= 1;
    if (this.jumpCooldown > 0) this.jumpCooldown -= 1;
  }

  draw() {
    const jump = this.jumpProgress();
    if (jump) {
      ctx.fillStyle = "#050505";
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(this.x + this.width / 2, this.y + this.height + 11, this.width * (0.68 - jump * 0.27), 7 - jump * 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const scale = 1 + jump * 0.55;
    const drawW = this.width * scale;
    const drawH = this.height * scale;
    const drawX = this.x + this.width / 2 - drawW / 2;
    const drawY = this.y - jump * 95 + this.height / 2 - drawH / 2;
    drawCar(drawX, drawY, drawW, drawH, colors.blue);
  }
}

class Enemy {
  constructor(speed) {
    this.width = CAR_WIDTH;
    this.height = CAR_HEIGHT;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    this.x = laneCenterX(lane) - this.width / 2;
    this.y = -this.height - Math.random() * 200;
    this.speed = speed;
    this.color = [colors.red, colors.green, colors.yellow, "#c864dc"][Math.floor(Math.random() * 4)];
  }

  rect() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  update() {
    this.y += this.speed;
  }

  draw() {
    drawCar(this.x, this.y, this.width, this.height, this.color);
  }
}

class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.player = new Car();
    this.enemies = [];
    this.roadScroll = 0;
    this.baseSpeed = 6;
    this.spawnTimer = 0;
    this.spawnInterval = 70;
    this.score = 0;
    this.gameOver = false;
    this.paused = false;
    this.speedBoostNoticeTimer = 0;
    this.speedBoostTriggered = false;
  }

  difficultySpeed() {
    let speed = this.baseSpeed + Math.floor(this.score / 300);
    if (this.score >= SPEED_BOOST_SCORE) speed += SPEED_BOOST_AMOUNT;
    return speed;
  }

  spawnEnemy() {
    this.spawnTimer += 1;
    let interval = Math.max(28, this.spawnInterval - Math.floor(this.score / 40));
    if (this.score >= SPEED_BOOST_SCORE) interval = Math.max(18, interval - 10);
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this.enemies.push(new Enemy(this.difficultySpeed()));
    }
  }

  update() {
    if (this.gameOver || this.paused) return;
    this.player.update();
    this.roadScroll = (this.roadScroll + this.difficultySpeed()) % 40;
    this.spawnEnemy();
    this.enemies.forEach((enemy) => enemy.update());
    this.enemies = this.enemies.filter((enemy) => enemy.y < HEIGHT + 100);
    this.score += 1;
    if (this.score >= SPEED_BOOST_SCORE && !this.speedBoostTriggered) {
      this.speedBoostTriggered = true;
      this.speedBoostNoticeTimer = SPEED_BOOST_NOTICE_DURATION;
    }
    if (this.speedBoostNoticeTimer > 0) this.speedBoostNoticeTimer -= 1;

    if (!this.player.isAirborne()) {
      const playerRect = this.player.rect();
      if (this.enemies.some((enemy) => collides(playerRect, enemy.rect()))) {
        this.gameOver = true;
      }
    }
  }

  draw() {
    drawRoad(this.roadScroll);
    this.player.draw();
    this.enemies.forEach((enemy) => enemy.draw());
    drawHud(this);
    if (this.speedBoostNoticeTimer > 0) drawBoostNotice(this.speedBoostNoticeTimer);
    if (this.paused) drawCenterText("PAUSED", "Press P to resume");
    if (this.gameOver) drawCenterText("GAME OVER", "Press R or tap Jump");
  }
}

function collides(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawCar(x, y, w, h, color) {
  const tireW = 9;
  const tireH = 18;
  [[x - 5, y + 13], [x + w - 4, y + 13], [x - 5, y + h - tireH - 13], [x + w - 4, y + h - tireH - 13]].forEach(([tx, ty]) => {
    roundedRect(tx, ty, tireW, tireH, 4, colors.black);
    roundedRect(tx + 2, ty + 3, tireW - 4, tireH - 6, 3, "#2d2d2d");
  });

  roundedRect(x + 3, y + 4, w, h, 13, "#141414");
  roundedRect(x, y, w, h, 13, color, colors.black, 2);
  roundedRect(x + 6, y + 5, w - 12, 18, 8, shade(color, 30));
  roundedRect(x + 9, y + 28, w - 18, 16, 5, colors.window);
  roundedRect(x + 7, y + 39, w - 14, 23, 6, shade(color, -18));
  roundedRect(x + 10, y + 58, w - 20, 13, 4, colors.window);
  roundedRect(x + 8, y + 45, 8, 12, 3, colors.window);
  roundedRect(x + w - 16, y + 45, 8, 12, 3, colors.window);
  roundedRect(x + 14, y + 3, w - 28, 5, 2, "#232323");
  roundedRect(x + 6, y + h - 9, 9, 5, 2, colors.tail);
  roundedRect(x + w - 15, y + h - 9, 9, 5, 2, colors.tail);

  ctx.strokeStyle = shade(color, -35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 25);
  ctx.lineTo(x + w - 9, y + 25);
  ctx.stroke();

  ctx.fillStyle = colors.headlight;
  ctx.beginPath();
  ctx.arc(x + 9, y + 9, 4, 0, Math.PI * 2);
  ctx.arc(x + w - 9, y + 9, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoad(scroll) {
  ctx.fillStyle = "#1e8240";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = colors.gray;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, HEIGHT);
  ctx.fillStyle = colors.white;
  ctx.fillRect(ROAD_LEFT - 6, 0, 6, HEIGHT);
  ctx.fillRect(ROAD_RIGHT, 0, 6, HEIGHT);
  ctx.fillStyle = colors.yellow;
  for (let lane = 1; lane < LANE_COUNT; lane += 1) {
    const x = ROAD_LEFT + lane * LANE_WIDTH;
    for (let y = -40 + scroll; y < HEIGHT; y += 40) {
      ctx.fillRect(x - 3, y, 6, 24);
    }
  }
}

function drawHud(game) {
  ctx.fillStyle = colors.white;
  ctx.font = "700 28px Arial";
  ctx.fillText(`Score: ${game.score}`, 14, 38);
  ctx.font = "20px Arial";
  ctx.fillText(`Speed: ${game.difficultySpeed()}`, 14, 66);
  let jumpY = 92;
  if (game.score >= SPEED_BOOST_SCORE) {
    ctx.fillStyle = colors.green;
    ctx.fillText("Boost Mode: ON", 14, 92);
    jumpY = 118;
  }
  const jumpLabel = game.score < JUMP_UNLOCK_SCORE ? `Jump unlocks at ${JUMP_UNLOCK_SCORE}` : game.player.jumpCooldown === 0 ? "Jump: READY" : "Jump: WAIT";
  ctx.fillStyle = game.score >= JUMP_UNLOCK_SCORE && game.player.jumpCooldown === 0 ? colors.green : colors.yellow;
  ctx.fillText(jumpLabel, 14, jumpY);
}

function drawBoostNotice(timer) {
  ctx.textAlign = "center";
  ctx.fillStyle = timer % 30 < 15 ? colors.green : colors.yellow;
  ctx.font = "700 48px Arial";
  ctx.fillText("SPEED BOOST!", WIDTH / 2, 145);
  ctx.fillStyle = colors.white;
  ctx.font = "20px Arial";
  ctx.fillText("Traffic is faster after 1000", WIDTH / 2, 185);
  ctx.textAlign = "left";
}

function drawCenterText(title, subtitle) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center";
  ctx.fillStyle = colors.white;
  ctx.font = "700 48px Arial";
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 18);
  ctx.font = "20px Arial";
  ctx.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 24);
  ctx.textAlign = "left";
}

const game = new Game();
let lastTime = 0;
let accumulator = 0;
const step = 1000 / FPS;

function loop(now) {
  accumulator += now - lastTime;
  lastTime = now;
  while (accumulator >= step) {
    game.update();
    accumulator -= step;
  }
  game.draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key);
  if (event.key === " " && !game.gameOver && !game.paused) game.player.startJump(game.score >= JUMP_UNLOCK_SCORE);
  if (event.key === "p" && !game.gameOver) game.paused = !game.paused;
  if (event.key === "r" && game.gameOver) game.reset();
  if (["ArrowLeft", "ArrowRight", " ", "a", "d"].includes(event.key)) event.preventDefault();
});

window.addEventListener("keyup", (event) => keys.delete(event.key));

function bindHold(id, prop) {
  const button = document.getElementById(id);
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touch[prop] = true;
  });
  for (const name of ["pointerup", "pointercancel", "pointerleave"]) {
    button.addEventListener(name, () => {
      touch[prop] = false;
    });
  }
}

bindHold("leftBtn", "left");
bindHold("rightBtn", "right");
document.getElementById("jumpBtn").addEventListener("click", () => {
  if (game.gameOver) game.reset();
  else if (!game.paused) game.player.startJump(game.score >= JUMP_UNLOCK_SCORE);
});

requestAnimationFrame(loop);
