let questions = [
  { question: "教育科技的教室在哪一棟樓？", options: ["文學館", "教育館"], answer: 0 },
  { question: "程式設計的老師是誰？", options: ["陳慶帆", "顧大維"], answer: 0 },
  { question: "程式設計在哪裡上課？", options: ["L110", "L105"], answer: 0 },
  { question: "程式設計老師教的程式是？", options: ["Vscode", "C++"], answer: 0 },
  { question: "教育科技所屬哪一間學校？", options: ["淡江大學", "輔仁大學"], answer: 0 },
];

let currentQuestion = 0;
let correctCount = 0;
let wrongCount = 0;
let noseCircle = false; // 答錯時顯示紅圈
let video;
let handpose;
let predictions = [];
let canSelect = true; // 防止多次觸發

// FaceMesh 相關
let facemesh;
let facePredictions = [];
let restartButton;

// confetti
let confettiArray = [];
let confettiLaunched = false;

// Confetti 類
class Confetti {
  constructor() {
    this.x = random(width);
    this.y = random(-100, -10);
    this.size = random(8, 18);
    this.speed = random(2, 5);
    this.angle = random(TWO_PI);
    this.spin = random(-0.1, 0.1);
    this.baseColor = color(random(255), random(255), random(255));
  }
  update() {
    // 只在滑鼠靠近時彈開
    let d = dist(this.x, this.y, mouseX, mouseY);
    if (d < 60) {
      let angleFromMouse = atan2(this.y - mouseY, this.x - mouseX);
      this.x += cos(angleFromMouse) * 4;
      this.y += sin(angleFromMouse) * 4;
    }
    this.y += this.speed;
    this.angle += this.spin;
    if (this.y > height + 20) {
      this.y = random(-100, -10);
      this.x = random(width);
    }
  }
  display() {
    let r = map(mouseX, 0, width, red(this.baseColor), 255);
    let g = map(mouseY, 0, height, green(this.baseColor), 255);
    let b = map(mouseX + mouseY, 0, width + height, blue(this.baseColor), 255);
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    fill(r, g, b);
    noStroke();
    rect(0, 0, this.size, this.size / 2);
    pop();
  }
}

function setup() {
  createCanvas(800, 600);
  video = createCapture(VIDEO);
  video.size(800, 600);
  video.hide();

  handpose = ml5.handpose(video, modelReadyHand);
  handpose.on("predict", (results) => {
    predictions = results;
  });

  facemesh = ml5.facemesh(video, modelReadyFace);
  facemesh.on("predict", (results) => {
    facePredictions = results;
  });
}

function modelReadyHand() {
  console.log("Handpose 已加載");
}
function modelReadyFace() {
  console.log("FaceMesh 已加載");
}

let gameState = "start"; // 新增遊戲狀態：start, playing, end
let startButton;         // 開始按鈕

// 放在全域變數區
let optW = 220;
let rx = 0; // 先宣告

function draw() {
  // 1. 動態科技感背景
  drawTechBackground();

  // 開始畫面
  if (gameState === "start") {
    // 玻璃質感深色面板
    push();
    rectMode(CENTER);
    noStroke();
    // 玻璃質感底色
    fill(10, 18, 32, 220);
    rect(width / 2, height / 2, 440, 240, 32);
    // 內部藍紫發光
    for (let i = 0; i < 10; i++) {
      stroke(60, 120, 255, 18 - i * 1.5);
      strokeWeight(36 - i * 3);
      noFill();
      rect(width / 2, height / 2, 440 - i * 10, 240 - i * 6, 32 + i * 2);
    }
    // 外圍冷光
    for (let i = 0; i < 6; i++) {
      stroke(0, 255, 255, 18 - i * 3);
      strokeWeight(24 - i * 4);
      noFill();
      rect(width / 2, height / 2, 440 + i * 16, 240 + i * 16, 32 + i * 4);
    }
    pop();

    // 動態粒子（更冷色、更多層次）
    for (let i = 0; i < 22; i++) {
      let angle = (TWO_PI / 22) * i + frameCount * 0.012;
      let px = width / 2 + cos(angle) * (170 + sin(frameCount * 0.02 + i) * 12);
      let py = height / 2 + sin(angle) * (85 + cos(frameCount * 0.018 + i) * 8);
      let c = lerpColor(color(0, 180, 255, 90), color(120, 0, 255, 90), i / 22);
      fill(c);
      noStroke();
      ellipse(px, py, 10 + sin(frameCount * 0.13 + i) * 3);
    }

    // 發光標題（縮小字體）
    textSize(26);
    drawGlowText("✦ 淡江大學教育科技學系 ✦", width / 2, height / 2 - 44, color(0, 200, 255), 8);
    textSize(15);
    drawGlowText("歡迎來到互動問答遊戲", width / 2, height / 2 - 10, color(120, 0, 255), 5);
    textSize(12);
    drawGlowText("請將你的手放到鏡頭前開始遊戲", width / 2, height / 2 + 18, color(0, 180, 255), 3);

    // 底部細線與小提示
    stroke(0, 255, 255, 60);
    strokeWeight(1.2);
    line(width / 2 - 120, height / 2 + 38, width / 2 + 120, height / 2 + 38);
    noStroke();
    textSize(10);
    fill(120, 180, 255, 100);
    text("Powered by ml5.js + p5.js", width / 2, height / 2 + 54);

    if (predictions.length > 0) {
      gameState = "playing";
    }
    return;
  } else {
    if (startButton) {
      startButton.remove();
      startButton = null;
    }
  }

  // 鼠標位置生成漸變色
  let r = map(mouseX, 0, width, 0, 255);
  let g = map(mouseY, 0, height, 0, 255);
  let b = map(mouseX + mouseY, 0, width + height, 255, 0);

  // 遊戲結束畫面
  if (gameState === "end" || currentQuestion >= questions.length) {
    gameState = "end";
    // 淺一點的藍色背景
    background(30, 50, 100);

    // 彩帶
    if (!confettiLaunched) {
      confettiArray = [];
      for (let i = 0; i < 200; i++) {
        confettiArray.push(new Confetti());
      }
      confettiLaunched = true;
    }
    for (let c of confettiArray) {
      c.update();
      c.display();
    }

    // 歡迎字
    push();
    textSize(40);
    textAlign(CENTER, TOP);
    fill(r, g, b);
    stroke(255, 215, 0);
    strokeWeight(4);
    textStyle(BOLDITALIC);
    text("✦ 淡江大學教育科技學系歡迎您 ✦", width / 2, 20);
    pop();

    textSize(32);
    textAlign(CENTER, CENTER);
    fill(r, g, b);
    noStroke();
    text(`遊戲結束！`, width / 2, height / 2 - 50);
    text(`答對：${correctCount} 題`, width / 2, height / 2);
    text(`答錯：${wrongCount} 題`, width / 2, height / 2 + 50);

    // 再來一次按鈕
    if (!restartButton) {
      restartButton = createButton('再來一次');
      restartButton.position(width / 2 - 50, height / 2 + 120);
      restartButton.size(100, 40);
      restartButton.style('font-size', '20px');
      restartButton.style('border-radius', '10px');
      restartButton.mousePressed(restartGame);
    }
    // 動態更新按鈕顏色
    let btnBg = `linear-gradient(90deg, rgb(${r},${g},${b}), rgb(${b},${r},${g}))`;
    let btnColor = (r + g + b > 380) ? '#222' : '#fff';
    restartButton.style('background', btnBg);
    restartButton.style('color', btnColor);

    return;
  } else {
    // 非結束時隱藏按鈕和重置彩花
    if (restartButton) {
      restartButton.remove();
      restartButton = null;
    }
    confettiLaunched = false;
  }

  // 只对摄像头画面做镜像
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  // 顯示題目
  // 顯示題目（放在 draw() 內原本 text(questions[currentQuestion].question, ...) 的地方）
  let qPanelW = 520, qPanelH = 70;
  push();
  // 半透明底色面板
  fill(20, 40, 80, 210);
  noStroke();
  rect(width / 2 - qPanelW/2, height / 2 - 140, qPanelW, qPanelH, 18);
  // 發光外框
  for (let i = 8; i > 0; i -= 2) {
    stroke(0, 200, 255, 12 + i * 2);
    strokeWeight(i);
    noFill();
    rect(width / 2 - qPanelW/2, height / 2 - 140, qPanelW, qPanelH, 18);
  }
  pop();

  // 發光大字題目
  textSize(22);
  drawGlowText(questions[currentQuestion].question, width / 2, height / 2 - 105, color(0, 255, 255), 5);

  // 顯示選項
  textSize(32);
  let optH = 50, optR = 18;

  // 左選項
  let lx = 50, ly = 50;
  drawNeonRect(lx - 20, ly - 25, optW, optH, optR, color(0,255,255));
  drawGlowText(questions[currentQuestion].options[0], lx + optW/2 - 20, ly, color(0,255,255), 6);

  // 右選項
  rx = width - 150; // 每次 draw 更新 rx
  let ry = 50;
  drawNeonRect(rx - optW + 20, ry - 25, optW, optH, optR, color(0,255,255));
  drawGlowText(questions[currentQuestion].options[1], rx - optW/2 + 20, ry, color(0,255,255), 6);

  drawFingerDots();

  // 答錯時在鼻子上畫紅色圓圈（FaceMesh 鼻尖，鏡像+比例修正）
  if (
    noseCircle &&
    facePredictions.length > 0 &&
    facePredictions[0].scaledMesh &&
    facePredictions[0].scaledMesh.length > 4
  ) {
    let nose = facePredictions[0].scaledMesh[4];
    let videoW = video.width || 800;
    let videoH = video.height || 600;
    let nx = width - (nose[0] * width / videoW);
    let ny = nose[1] * height / videoH;
    nx = nx + -65;
    ny = ny + 70;
    fill(255, 0, 0);
    noStroke();
    ellipse(nx, ny, 60);
  }

  // ====== 雙手都在畫面時頭頂畫皇冠 ======
  if (
    predictions.length >= 2 &&
    facePredictions.length > 0 &&
    facePredictions[0].scaledMesh &&
    facePredictions[0].scaledMesh.length > 10
  ) {
    // 取臉頂點（以臉頂中心點為基準，這裡用第10點，或可用第168點更靠上）
    let top = facePredictions[0].scaledMesh[10];
    let videoW = video.width || 800;
    let videoH = video.height || 600;
    let tx = width - (top[0] * width / videoW);
    let ty = top[1] * height / videoH;
    tx = tx + -65;
    ty = ty + 40; // 比鼻子高一點

    push();
    // 畫皇冠底座
    fill(255, 215, 0);
    stroke(180, 140, 0);
    strokeWeight(2);
    ellipse(tx, ty, 48, 18);
    // 三個三角形
    for (let i = -1; i <= 1; i++) {
      triangle(
        tx + i * 16, ty - 10,
        tx + i * 8, ty - 38,
        tx + i * 24, ty - 10
      );
      // 小圓珠
      fill(255, 255, 0);
      noStroke();
      ellipse(tx + i * 8, ty - 38, 10, 10);
      fill(255, 215, 0);
      stroke(180, 140, 0);
      strokeWeight(2);
    }
    pop();
  }
}

// ====== 新增科技感背景函數 ======
function drawTechBackground() {
  // 深藍漸層
  for (let y = 0; y < height; y += 2) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(color(8, 14, 28), color(0, 40, 80), inter);
    stroke(c);
    line(0, y, width, y);
  }

  // 動態網格
  stroke(0, 255, 255, 30);
  strokeWeight(1);
  for (let i = 0; i < 16; i++) {
    let y = map(i, 0, 15, 0, height);
    line(0, y + (frameCount % 40), width, y + (frameCount % 40));
  }
  for (let i = 0; i < 12; i++) {
    let x = map(i, 0, 11, 0, width);
    line(x, 0, x, height);
  }

  // 斜線
  stroke(0, 180, 255, 18);
  for (let i = -width; i < width; i += 60) {
    line(i + (frameCount % 60), 0, i + 200 + (frameCount % 60), height);
  }

  // 閃爍粒子
  noStroke();
  for (let i = 0; i < 18; i++) {
    let px = noise(i, frameCount * 0.015) * width;
    let py = noise(i + 100, frameCount * 0.015) * height;
    fill(0, 255, 255, 60 + 60 * noise(i, frameCount * 0.03));
    ellipse(px, py, 7 + sin(frameCount * 0.09 + i) * 3);
  }
}

// ====== 新增發光文字函數 ======
function drawGlowText(txt, x, y, glowColor, glowSize) {
  push();
  textAlign(CENTER, CENTER);
  for (let i = glowSize; i > 0; i -= 2) {
    fill(red(glowColor), green(glowColor), blue(glowColor), 5 + i); // 更淡
    textSize(textSize() + i);
    text(txt, x, y);
  }
  fill(240);
  textSize(textSize() - glowSize);
  text(txt, x, y);
  pop();
}

let leftHoverStart = null;
let rightHoverStart = null;

function drawFingerDots() {
  let leftHovering = false;
  let rightHovering = false;

  for (let h = 0; h < predictions.length; h++) {
    let hand = predictions[h];
    if (!hand.landmarks) continue;
    let tipIndices = [4, 8, 12, 16, 20];
    let videoW = video.width || 800;
    let videoH = video.height || 600;
    for (let i = 0; i < tipIndices.length; i++) {
      let tip = hand.landmarks[tipIndices[i]];
      if (!tip) continue;
      let x = width - (tip[0] * width / videoW);
      let y = tip[1] * height / videoH;
      fill(255, 0, 0);
      noStroke();
      ellipse(x, y, 20);

      // 檢查是否碰到左側選項
      if (x > 50 && x < 250 && y > 35 && y < 65) {
        leftHovering = true;
      }
      // 檢查是否碰到右側選項
      if (x > width - 250 && x < width - 50 && y > 35 && y < 65) {
        rightHovering = true;
      }
    }
  }

  // 左選項計時
  if (leftHovering) {
    if (!leftHoverStart) leftHoverStart = millis();
    // 顯示進度條
    let progress = constrain((millis() - leftHoverStart) / 3000, 0, 1);
    fill(0, 255, 0, 120);
    rect(60, 70, 180 * progress, 8, 4);
    if (progress >= 1 && canSelect) {
      checkAnswer(0);
      canSelect = false;
      setTimeout(() => { canSelect = true; }, 1000);
      leftHoverStart = null;
      rightHoverStart = null;
    }
  } else {
    leftHoverStart = null;
  }

  // 右選項計時
  if (rightHovering) {
    if (!rightHoverStart) rightHoverStart = millis();
    let progress = constrain((millis() - rightHoverStart) / 3000, 0, 1);
    fill(0, 255, 0, 120);
    rect(rx - optW + 20, 70, 180 * progress, 8, 4); // 這裡就能正確顯示
    if (progress >= 1 && canSelect) {
      checkAnswer(1);
      canSelect = false;
      setTimeout(() => { canSelect = true; }, 1000);
      leftHoverStart = null;
      rightHoverStart = null;
    }
  } else {
    rightHoverStart = null;
  }
}

function checkAnswer(selected) {
  if (selected === questions[currentQuestion].answer) {
    correctCount++;
    noseCircle = false;
  } else {
    wrongCount++;
    noseCircle = true;
  }
  currentQuestion++;
  if (currentQuestion >= questions.length) {
    gameState = "end";
  }
}

function mouseMoved() {
  // 讓結束畫面顏色隨滑鼠動態刷新
  redraw();
}

function restartGame() {
  currentQuestion = 0;
  correctCount = 0;
  wrongCount = 0;
  noseCircle = false;
  if (restartButton) {
    restartButton.remove();
    restartButton = null;
  }
  confettiLaunched = false;
  gameState = "playing";
  loop();
}

function drawNeonRect(x, y, w, h, r, glowColor) {
  push();
  noFill();
  for (let i = 8; i > 0; i -= 2) {
    stroke(red(glowColor), green(glowColor), blue(glowColor), 18);
    strokeWeight(i);
    rect(x, y, w, h, r);
  }
  fill(20, 40, 60, 180);
  noStroke();
  rect(x, y, w, h, r);
  pop();
}

console.log('目前偵測到手數:', predictions.length);
