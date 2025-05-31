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
    // 鼠標互動：靠近鼠標時彈開
    let d = dist(this.x, this.y, mouseX, mouseY);
    if (d < 100) {
      let angleFromMouse = atan2(this.y - mouseY, this.x - mouseX);
      this.x += cos(angleFromMouse) * 5;
      this.y += sin(angleFromMouse) * 5;
    }
    this.y += this.speed;
    this.angle += this.spin;
    if (this.y > height + 20) {
      this.y = random(-100, -10);
      this.x = random(width);
    }
  }
  display() {
    // 彩花顏色隨鼠標變化
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

function draw() {
  background(220);

  // 鼠標位置生成漸變色
  let r = map(mouseX, 0, width, 0, 255);
  let g = map(mouseY, 0, height, 0, 255);
  let b = map(mouseX + mouseY, 0, width + height, 255, 0);

  // 遊戲結束畫面
  if (currentQuestion >= questions.length) {
    // 彩花特效
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
  textSize(24);
  textAlign(CENTER, CENTER);
  fill(0);
  text(questions[currentQuestion].question, width / 2, height / 2 - 100);

  // 顯示選項
  textSize(32); // 字体变大
  textAlign(LEFT, CENTER);
  text(questions[currentQuestion].options[0], 50, 50);

  textAlign(RIGHT, CENTER);
  text(questions[currentQuestion].options[1], width - 150, 50);

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
    // 先做比例換算，再做鏡像修正
    let nx = width - (nose[0] * width / videoW);
    let ny = nose[1] * height / videoH;
    // 你可以在这里微调
    nx = nx + -75; // 这里可以加负数往左，正数往右
    ny = ny + 70; // 这里可以加正数往下，负数往上
    // 输出调试信息
    console.log('nose:', nose, 'nx:', nx, 'ny:', ny);
    fill(255, 0, 0);
    noStroke();
    ellipse(nx, ny, 60); // 圓圈半徑變大
  }
}

function drawFingerDots() {
  if (predictions.length > 0) {
    let hand = predictions[0];
    let tipIndices = [4, 8, 12, 16, 20];
    let videoW = video.width || 800;
    let videoH = video.height || 600;
    for (let i = 0; i < tipIndices.length; i++) {
      let tip = hand.landmarks[tipIndices[i]];
      // 只做比例換算和鏡像修正
      let x = width - (tip[0] * width / videoW);
      let y = tip[1] * height / videoH;
      fill(255, 0, 0);
      noStroke();
      ellipse(x, y, 20);
      // 檢查是否碰到左側選項
      if (
        canSelect &&
        x > 50 && x < 250 &&
        y > 35 && y < 65
      ) {
        checkAnswer(0);
        canSelect = false;
        setTimeout(() => { canSelect = true; }, 1000);
      }
      // 檢查是否碰到右側選項
      if (
        canSelect &&
        x > width - 250 && x < width - 50 &&
        y > 35 && y < 65
      ) {
        checkAnswer(1);
        canSelect = false;
        setTimeout(() => { canSelect = true; }, 1000);
      }
    }
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

  // 進入下一題
  currentQuestion++;
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
  loop();
}
