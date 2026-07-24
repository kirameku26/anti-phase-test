let audioCtx = null;
let masterOsc = null;
let normalGain = null;
let invertGain = null;
let delayNode = null;

let isNormalOn = false;
let isInvertOn = false;

let simulatedPhase = 0; // 位相追従変数
let lastDrawTime = 0;
let userSpeedScale = 1.000; // 0.000 〜 1.000 倍速

// UI Elements
const normalBtn = document.getElementById('normalBtn');
const invertBtn = document.getElementById('invertBtn');
const stopBtn = document.getElementById('stopBtn');
const statusTxt = document.getElementById('statusTxt');

const waveTypeSelect = document.getElementById('waveType');
const freqInput = document.getElementById('freqInput');
const freqNum = document.getElementById('freqNum');
const timeSpanInput = document.getElementById('timeSpanInput');
const timeSpanNum = document.getElementById('timeSpanNum');
const speedInput = document.getElementById('speedInput');
const speedNum = document.getElementById('speedNum');
const delayInput = document.getElementById('delayInput');
const delayNum = document.getElementById('delayNum');

// Canvas Elements
const canvas = document.getElementById('waveformCanvas');
const canvasCtx = canvas.getContext('2d');

let cssWidth = 600;
let cssHeight = 200;
let dpr = window.devicePixelRatio || 1;

function setupCanvasHD() {
  dpr = window.devicePixelRatio || 1;
  cssWidth = 600;
  cssHeight = 200;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
}

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();

    masterOsc = audioCtx.createOscillator();
    masterOsc.type = waveTypeSelect ? waveTypeSelect.value : 'sine';

    const initialFreq = parseFloat(freqNum.value) || 1000;
    masterOsc.frequency.setValueAtTime(initialFreq, audioCtx.currentTime);

    normalGain = audioCtx.createGain();
    normalGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterOsc.connect(normalGain);
    normalGain.connect(audioCtx.destination);

    delayNode = audioCtx.createDelay(20.0);
    const initialDelay = parseFloat(delayNum.value) || 0;
    delayNode.delayTime.setValueAtTime(initialDelay / 1000, audioCtx.currentTime);

    invertGain = audioCtx.createGain();
    invertGain.gain.setValueAtTime(0, audioCtx.currentTime);

    masterOsc.connect(delayNode);
    delayNode.connect(invertGain);
    invertGain.connect(audioCtx.destination);

    masterOsc.start();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

window.changeWaveType = function(type) {
  if (masterOsc) {
    masterOsc.type = type;
  }
};

window.syncFreq = function(source, value) {
  const val = parseFloat(value) || 1;

  if (source === 'range') {
    freqNum.value = val;
  } else {
    freqInput.value = val;
  }

  if (masterOsc && audioCtx) {
    masterOsc.frequency.setTargetAtTime(val, audioCtx.currentTime, 0.005);
  }
};

window.syncTimeSpan = function(source, value) {
  const val = parseFloat(value) || 1;

  if (source === 'range') {
    timeSpanNum.value = val;
  } else {
    timeSpanInput.value = val;
  }
};

window.syncSpeed = function(source, value) {
  const val = parseFloat(value);
  const numVal = isNaN(val) ? 1.0 : Math.max(0, Math.min(1.0, val));

  if (source === 'range') {
    speedNum.value = numVal.toFixed(3);
  } else {
    speedInput.value = numVal;
  }

  userSpeedScale = numVal;
};

window.syncDelay = function(source, value) {
  const val = parseFloat(value) || 0;

  if (source === 'range') {
    delayNum.value = val.toFixed(3);
  } else {
    delayInput.value = val;
  }

  if (delayNode && audioCtx) {
    delayNode.delayTime.setTargetAtTime(val / 1000, audioCtx.currentTime, 0.005);
  }
};

normalBtn.addEventListener('click', () => {
  initAudio();
  isNormalOn = !isNormalOn;
  if (normalGain) normalGain.gain.setValueAtTime(isNormalOn ? 0.2 : 0, audioCtx.currentTime);
  updateUI();
});

invertBtn.addEventListener('click', () => {
  initAudio();
  isInvertOn = !isInvertOn;
  if (invertGain) invertGain.gain.setValueAtTime(isInvertOn ? -0.2 : 0, audioCtx.currentTime);
  updateUI();
});

stopBtn.addEventListener('click', () => {
  isNormalOn = false;
  isInvertOn = false;

  if (normalGain) normalGain.gain.setValueAtTime(0, audioCtx.currentTime);
  if (invertGain) invertGain.gain.setValueAtTime(0, audioCtx.currentTime);
  updateUI();
});

function updateUI() {
  stopBtn.disabled = !isNormalOn && !isInvertOn;

  if (isNormalOn) {
    normalBtn.classList.add('active');
    normalBtn.innerHTML = '<i class="glyphicon glyphicon-stop"></i> 正位相を止める';
  } else {
    normalBtn.classList.remove('active');
    normalBtn.innerHTML = '<i class="glyphicon glyphicon-play"></i> 正位相を鳴らす';
  }

  if (isInvertOn) {
    invertBtn.classList.add('active');
    invertBtn.innerHTML = '<i class="glyphicon glyphicon-stop"></i> 逆位相を止める';
  } else {
    invertBtn.classList.remove('active');
    invertBtn.innerHTML = '<i class="glyphicon glyphicon-play"></i> 逆位相を鳴らす';
  }

  if (isNormalOn && isInvertOn) {
    statusTxt.textContent = "正位相 ＋ 逆位相（干渉再生中）";
    statusTxt.style.color = "purple";
  } else if (isNormalOn) {
    statusTxt.textContent = "正位相のみ再生中";
    statusTxt.style.color = "#2196f3";
  } else if (isInvertOn) {
    statusTxt.textContent = "逆位相のみ再生中";
    statusTxt.style.color = "#ff5722";
  } else {
    statusTxt.textContent = "停止中";
    statusTxt.style.color = "#555";
  }
}

function getWaveValue(type, phase) {
  const p = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  switch (type) {
    case 'sine':
      return Math.sin(p);
    case 'square':
      return p < Math.PI ? 1.0 : -1.0;
    case 'sawtooth':
      return 1.0 - (p / Math.PI);
    case 'triangle':
      return p < Math.PI ? -1.0 + (2.0 * p / Math.PI) : 3.0 - (2.0 * p / Math.PI);
    default:
      return Math.sin(p);
  }
}

function drawAxes() {
  const width = cssWidth;
  const height = cssHeight;
  const centerY = height / 2;
  const currentFreq = parseFloat(freqNum.value) || 1000;
  const currentSpanMs = parseFloat(timeSpanNum.value) || 10;

  canvasCtx.save();

  // 1. グリッド線
  canvasCtx.strokeStyle = '#333333';
  canvasCtx.lineWidth = 1;
  canvasCtx.setLineDash([4, 4]);

  const scaleMax = height * 0.4;

  canvasCtx.beginPath();
  canvasCtx.moveTo(0, centerY - scaleMax);
  canvasCtx.lineTo(width, centerY - scaleMax);
  canvasCtx.moveTo(0, centerY + scaleMax);
  canvasCtx.lineTo(width, centerY + scaleMax);

  canvasCtx.moveTo(0, centerY - scaleMax * 0.5);
  canvasCtx.lineTo(width, centerY - scaleMax * 0.5);
  canvasCtx.moveTo(0, centerY + scaleMax * 0.5);
  canvasCtx.lineTo(width, centerY + scaleMax * 0.5);

  const plotLeft = 60;
  const plotWidth = width - plotLeft;

  for (let i = 1; i < 4; i++) {
    const x = plotLeft + (plotWidth / 4) * i;
    canvasCtx.moveTo(x, 0);
    canvasCtx.lineTo(x, height);
  }
  canvasCtx.stroke();

  // 2. メイン軸線
  canvasCtx.setLineDash([]);
  canvasCtx.strokeStyle = '#666666';
  canvasCtx.lineWidth = 1.5;

  canvasCtx.beginPath();
  canvasCtx.moveTo(0, centerY);
  canvasCtx.lineTo(width, centerY);

  canvasCtx.moveTo(plotLeft, 0);
  canvasCtx.lineTo(plotLeft, height);
  canvasCtx.stroke();

  // 3. 目盛りラベル
  canvasCtx.fillStyle = '#aaaaaa';
  canvasCtx.font = '10px monospace';

  // 縦軸 dB
  canvasCtx.fillText('+6 dB', 2, centerY - scaleMax + 4);
  canvasCtx.fillText(' 0 dB', 2, centerY - scaleMax * 0.5 + 4);
  canvasCtx.fillText('-∞ dB', 2, centerY + 4);
  canvasCtx.fillText(' 0 dB', 2, centerY + scaleMax * 0.5 + 4);
  canvasCtx.fillText('+6 dB', 2, centerY + scaleMax + 4);

  // ★ 横軸：描画速度(倍数)に応じた実質時間(ms)の計算 ★
  // 速度が0の時は∞(無限)にならないよう、安全に計算
  const effectiveSpanMs = userSpeedScale > 0 ? (currentSpanMs / userSpeedScale) : currentSpanMs;

  const halfMsStr = (effectiveSpanMs / 2).toFixed(1) + 'ms';
  const fullMsStr = (userSpeedScale > 0) ? (effectiveSpanMs.toFixed(1) + 'ms') : '静止';

  canvasCtx.fillText('0ms', plotLeft - 10, centerY + 15);
  canvasCtx.fillText(halfMsStr, plotLeft + plotWidth / 2 - 20, centerY + 15);
  canvasCtx.fillText(fullMsStr, width - 45, centerY + 15);

  // ヘッダー情報
  canvasCtx.fillStyle = '#ffca28';
  canvasCtx.font = 'bold 12px sans-serif';
  canvasCtx.fillText(`現在の周波数: ${currentFreq} Hz (縦軸: dBFS)`, plotLeft + 10, 18);

  canvasCtx.restore();
}

function drawCalculatedLine(type, color, lineWidth = 2) {
  const freq = parseFloat(freqNum.value) || 1000;
  const delayMs = parseFloat(delayNum.value) || 0;
  const spanMs = parseFloat(timeSpanNum.value) || 10;
  const currentWaveType = waveTypeSelect ? waveTypeSelect.value : 'sine';
  
  const width = cssWidth;
  const height = cssHeight;
  const centerY = height / 2;
  const scaleMax = height * 0.4; 

  canvasCtx.lineWidth = lineWidth;
  canvasCtx.strokeStyle = color;
  canvasCtx.beginPath();

  const plotLeft = 60;
  const plotWidth = width - plotLeft;

  // 描画速度（倍率）に応じて描画する実質的な時間幅(秒)を調整
  const effectiveSpanMs = userSpeedScale > 0 ? (spanMs / userSpeedScale) : spanMs;
  const timeSpanSec = effectiveSpanMs / 1000.0;

  const requiredSamples = Math.max(plotWidth * dpr, freq * 12 * timeSpanSec);
  const stepSize = plotWidth / requiredSamples;

  for (let i = 0; i <= requiredSamples; i++) {
    const xPixel = plotLeft + (i * stepSize);
    if (xPixel > width) break;

    const xRatio = (xPixel - plotLeft) / plotWidth;
    const t = xRatio * timeSpanSec;
    
    const normalPhase = 2 * Math.PI * freq * t - simulatedPhase;
    const delaySec = delayMs / 1000.0;
    const invertPhase = 2 * Math.PI * freq * (t - delaySec) - simulatedPhase;

    const normalVal = getWaveValue(currentWaveType, normalPhase);
    const invertVal = -getWaveValue(currentWaveType, invertPhase);

    let yVal = 0;
    if (type === 'normal') {
      yVal = normalVal * 0.2; 
    } else if (type === 'invert') {
      yVal = invertVal * 0.2; 
    } else if (type === 'combined') {
      const normGainVal = isNormalOn ? 0.2 : 0;
      const invGainVal = isInvertOn ? 0.2 : 0;
      yVal = (normalVal * normGainVal) + (invertVal * invGainVal);
    }

    const y = centerY - (yVal * (scaleMax / 2.0));

    if (i === 0) {
      canvasCtx.moveTo(xPixel, y);
    } else {
      canvasCtx.lineTo(xPixel, y);
    }
  }

  canvasCtx.stroke();
}

// リアルタイム描画ループ
function drawWaveform(timestamp) {
  requestAnimationFrame(drawWaveform);

  if (!lastDrawTime) lastDrawTime = timestamp;
  const deltaTime = (timestamp - lastDrawTime) / 1000;
  lastDrawTime = timestamp;

  const freq = parseFloat(freqNum.value) || 1000;
  const spanMs = parseFloat(timeSpanNum.value) || 10;
  
  const speedFactor = Math.max(0.2, Math.min(2.0, 50 / spanMs));
  simulatedPhase += 2 * Math.PI * freq * deltaTime * 0.05 * speedFactor * userSpeedScale;

  canvasCtx.save();
  canvasCtx.scale(dpr, dpr);

  canvasCtx.fillStyle = '#1a1a1a';
  canvasCtx.fillRect(0, 0, cssWidth, cssHeight);

  drawAxes();

  if (isNormalOn) drawCalculatedLine('normal', '#2196f3', 2);
  if (isInvertOn) drawCalculatedLine('invert', '#ff5722', 2);
  
  // 常時表示
  drawCalculatedLine('combined', '#00e676', 2.5);

  canvasCtx.restore();
}

window.addEventListener('DOMContentLoaded', () => {
  setupCanvasHD();
  requestAnimationFrame(drawWaveform);
});

window.addEventListener('resize', setupCanvasHD);