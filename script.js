const gridContainer = document.getElementById('pixelGrid');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const paletteButtons = document.querySelectorAll('.color-swatch');
const customColorInput = document.getElementById('customColor');
const toolButtons = document.querySelectorAll('.tool-btn');
const templateButtons = document.querySelectorAll('.template-btn');
const clearCanvasBtn = document.getElementById('clearCanvasBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const downloadBtn = document.getElementById('downloadBtn');
const gridLinesToggle = document.getElementById('gridLines');
const statGridSize = document.getElementById('statGridSize');
const statGridSize2 = document.getElementById('statGridSize2');
const statTool = document.getElementById('statTool');
const statColorText = document.getElementById('statColorText');
const statColorChip = document.querySelector('.color-chip');
const statColored = document.getElementById('statColored');
const statColored2 = document.getElementById('statColored2');
const statUniqueColors = document.getElementById('statUniqueColors');
const statCompletion = document.getElementById('statCompletion');
const miniPreview = document.getElementById('miniPreview');
const heroPreviewCanvas = document.getElementById('heroPreviewCanvas');
const recognitionCard = document.getElementById('recognitionCard');
const recognitionStatus = document.getElementById('recognitionStatus');
const recognitionDetail = document.getElementById('recognitionDetail');
const recognitionScore = document.getElementById('recognitionScore');
const recognitionMatches = document.getElementById('recognitionMatches');
const confettiContainer = document.getElementById('confettiContainer');
const startButton = document.getElementById('startButton');
const currentYearSpan = document.getElementById('currentYear');

let currentSize = 16;
let currentColor = '#FFFFFF';
let activeTool = 'pencil';
let isMouseDown = false;
let pixelData = [];
let history = [];
let future = [];
let isPainting = false;

const defaultColors = {
  white: '#FFFFFF',
  black: '#333333',
  red: '#E53935',
  orange: '#FF9800',
  yellow: '#FDD835',
  green: '#4CAF50',
  blue: '#4169E1',
  purple: '#9C27B0',
};

const colorCategories = {
  red: [229, 57, 53],
  blue: [65, 105, 225],
  green: [76, 175, 80],
  yellow: [253, 216, 53],
  orange: [255, 152, 0],
  white: [255, 255, 255],
  black: [34, 34, 34],
  purple: [156, 39, 176],
};

function parseHexColor(color) {
  const hex = color.replace('#', '').trim();
  const normalized = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function categorizeColor(color) {
  const rgb = parseHexColor(color);
  let best = 'white';
  let bestDistance = Infinity;
  Object.entries(colorCategories).forEach(([category, ref]) => {
    const distance = (rgb.r - ref[0]) ** 2 + (rgb.g - ref[1]) ** 2 + (rgb.b - ref[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = category;
    }
  });
  return best;
}

function fillGrid(size, fill) {
  return Array(size * size).fill(fill);
}

function stripeHorizontal(size, bands) {
  const grid = [];
  const bandHeight = Math.floor(size / bands.length);
  for (let row = 0; row < size; row += 1) {
    const bandIndex = Math.min(Math.floor(row / bandHeight), bands.length - 1);
    for (let col = 0; col < size; col += 1) {
      grid.push(bands[bandIndex]);
    }
  }
  return grid;
}

function stripeVertical(size, bands) {
  const grid = [];
  const bandWidth = Math.floor(size / bands.length);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const bandIndex = Math.min(Math.floor(col / bandWidth), bands.length - 1);
      grid.push(bands[bandIndex]);
    }
  }
  return grid;
}

function centerCircle(size, circle, background) {
  const grid = [];
  const center = (size - 1) / 2;
  const radius = size / 5;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const dist = Math.hypot(row - center, col - center);
      grid.push(dist <= radius ? circle : background);
    }
  }
  return grid;
}

function diamondShape(size, diamond, background) {
  const grid = [];
  const center = Math.floor(size / 2);
  const limit = Math.floor(size / 3);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const dx = Math.abs(col - center);
      const dy = Math.abs(row - center);
      grid.push(dx + dy <= limit ? diamond : background);
    }
  }
  return grid;
}

function crossShape(size, cross, background, thickness = 2) {
  const grid = [];
  const center = Math.floor(size / 2);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inCross = Math.abs(col - center) < thickness || Math.abs(row - center) < thickness;
      grid.push(inCross ? cross : background);
    }
  }
  return grid;
}

function scandiCross(size, cross, background, thickness = 2, offset = 0) {
  const grid = [];
  const center = Math.floor(size / 2) + offset;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inCross = Math.abs(col - center) < thickness || Math.abs(row - center) < thickness;
      grid.push(inCross ? cross : background);
    }
  }
  return grid;
}

const templates = {
  germany: {
    label: 'Germany 🇩🇪',
    generator(size) {
      return stripeHorizontal(size, ['black', 'red', 'yellow']);
    },
  },
  france: {
    label: 'France 🇫🇷',
    generator(size) {
      return stripeVertical(size, ['blue', 'white', 'red']);
    },
  },
  italy: {
    label: 'Italy 🇮🇹',
    generator(size) {
      return stripeVertical(size, ['green', 'white', 'red']);
    },
  },
  ireland: {
    label: 'Ireland 🇮🇪',
    generator(size) {
      return stripeVertical(size, ['green', 'white', 'orange']);
    },
  },
  belgium: {
    label: 'Belgium 🇧🇪',
    generator(size) {
      return stripeVertical(size, ['black', 'yellow', 'red']);
    },
  },
  netherlands: {
    label: 'Netherlands 🇳🇱',
    generator(size) {
      return stripeHorizontal(size, ['red', 'white', 'blue']);
    },
  },
  russia: {
    label: 'Russia 🇷🇺',
    generator(size) {
      return stripeHorizontal(size, ['white', 'blue', 'red']);
    },
  },
  poland: {
    label: 'Poland 🇵🇱',
    generator(size) {
      return stripeHorizontal(size, ['white', 'red']);
    },
  },
  ukraine: {
    label: 'Ukraine 🇺🇦',
    generator(size) {
      return stripeHorizontal(size, ['blue', 'yellow']);
    },
  },
  japan: {
    label: 'Japan 🇯🇵',
    generator(size) {
      return centerCircle(size, 'red', 'white');
    },
  },
  india: {
    label: 'India 🇮🇳',
    generator(size) {
      const stripes = stripeHorizontal(size, ['orange', 'white', 'green']);
      const centerCirclePattern = centerCircle(size, 'blue', 'white');
      return stripes.map((cell, index) => (centerCirclePattern[index] === 'blue' ? 'blue' : cell));
    },
  },
  brazil: {
    label: 'Brazil 🇧🇷',
    generator(size) {
      const greenGrid = fillGrid(size, 'green');
      const diamond = diamondShape(size, 'yellow', 'green');
      const circle = centerCircle(size, 'blue', 'green');
      return diamond.map((cell, index) => (cell === 'yellow' ? 'yellow' : circle[index] === 'blue' ? 'blue' : 'green'));
    },
  },
  argentina: {
    label: 'Argentina 🇦🇷',
    generator(size) {
      const stripes = stripeHorizontal(size, ['blue', 'white', 'blue']);
      const circle = centerCircle(size, 'yellow', 'white');
      return stripes.map((cell, index) => (circle[index] === 'yellow' ? 'yellow' : cell));
    },
  },
  mexico: {
    label: 'Mexico 🇲🇽',
    generator(size) {
      return stripeVertical(size, ['green', 'white', 'red']);
    },
  },
  canada: {
    label: 'Canada 🇨🇦',
    generator(size) {
      return stripeVertical(size, ['red', 'white', 'red']);
    },
  },
  unitedstates: {
    label: 'United States 🇺🇸',
    generator(size) {
      const grid = [];
      const stripe = Math.floor(size / 13) || 1;
      const cantonHeight = Math.floor(size * 0.45);
      const cantonWidth = Math.floor(size * 0.45);
      for (let row = 0; row < size; row += 1) {
        const rowColor = (Math.floor(row / stripe) % 2 === 0 ? 'red' : 'white');
        for (let col = 0; col < size; col += 1) {
          if (row < cantonHeight && col < cantonWidth) grid.push('blue');
          else grid.push(rowColor);
        }
      }
      return grid;
    },
  },
  unitedkingdom: {
    label: 'United Kingdom 🇬🇧',
    generator(size) {
      const grid = fillGrid(size, 'blue');
      const cross = crossShape(size, 'white', 'blue', Math.max(1, Math.floor(size / 10)));
      const redCross = crossShape(size, 'red', 'white', Math.max(1, Math.floor(size / 14)));
      return grid.map((cell, index) => (redCross[index] === 'red' ? 'red' : cross[index] === 'white' ? 'white' : 'blue'));
    },
  },
  china: {
    label: 'China 🇨🇳',
    generator(size) {
      const grid = fillGrid(size, 'red');
      const cantonSize = Math.floor(size / 3);
      for (let row = 0; row < cantonSize; row += 1) {
        for (let col = 0; col < cantonSize; col += 1) {
          if ((row < cantonSize - 1 && col < cantonSize - 3) || (row === 1 && col === 1)) {
            grid[row * size + col] = 'yellow';
          }
        }
      }
      return grid;
    },
  },
  southkorea: {
    label: 'South Korea 🇰🇷',
    generator(size) {
      const grid = fillGrid(size, 'white');
      const center = centerCircle(size, 'red', 'white');
      const bottom = centerCircle(size, 'blue', 'white');
      const combined = grid.map((cell, index) => (center[index] === 'red' ? 'red' : bottom[index] === 'blue' ? 'blue' : 'white'));
      return combined;
    },
  },
  australia: {
    label: 'Australia 🇦🇺',
    generator(size) {
      const grid = fillGrid(size, 'blue');
      const union = crossShape(Math.floor(size * 0.45), 'white', 'blue', Math.max(1, Math.floor(size / 18)));
      const rip = union; // simplified union jack-style
      for (let row = 0; row < Math.floor(size * 0.45); row += 1) {
        for (let col = 0; col < Math.floor(size * 0.45); col += 1) {
          grid[row * size + col] = rip[row * Math.floor(size * 0.45) + col] === 'white' ? 'white' : 'blue';
        }
      }
      return grid;
    },
  },
  newzealand: {
    label: 'New Zealand 🇳🇿',
    generator(size) {
      const grid = fillGrid(size, 'blue');
      const unionSize = Math.floor(size * 0.45);
      for (let row = 0; row < unionSize; row += 1) {
        for (let col = 0; col < unionSize; col += 1) {
          grid[row * size + col] = (Math.abs(row - Math.floor(unionSize / 2)) < 2 || Math.abs(col - Math.floor(unionSize / 2)) < 2) ? 'white' : 'blue';
        }
      }
      return grid;
    },
  },
  spain: {
    label: 'Spain 🇪🇸',
    generator(size) {
      return stripeHorizontal(size, ['red', 'yellow', 'red']);
    },
  },
  portugal: {
    label: 'Portugal 🇵🇹',
    generator(size) {
      const grid = [];
      const split = Math.floor(size / 3);
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          grid.push(col < split ? 'green' : 'red');
        }
      }
      const circle = centerCircle(size, 'yellow', 'red');
      return grid.map((cell, index) => (circle[index] === 'yellow' && index % size > split ? 'yellow' : cell));
    },
  },
  sweden: {
    label: 'Sweden 🇸🇪',
    generator(size) {
      return scandiCross(size, 'yellow', 'blue', Math.max(1, Math.floor(size / 10)), -Math.floor(size / 12));
    },
  },
  norway: {
    label: 'Norway 🇳🇴',
    generator(size) {
      const blueCross = scandiCross(size, 'blue', 'red', Math.max(1, Math.floor(size / 16)), -Math.floor(size / 12));
      const whiteCross = scandiCross(size, 'white', 'red', Math.max(2, Math.floor(size / 10)), -Math.floor(size / 12));
      return blueCross.map((cell, index) => (cell === 'blue' ? 'blue' : whiteCross[index] === 'white' ? 'white' : 'red'));
    },
  },
  finland: {
    label: 'Finland 🇫🇮',
    generator(size) {
      return scandiCross(size, 'blue', 'white', Math.max(1, Math.floor(size / 10)), -Math.floor(size / 12));
    },
  },
  denmark: {
    label: 'Denmark 🇩🇰',
    generator(size) {
      return scandiCross(size, 'white', 'red', Math.max(1, Math.floor(size / 10)), -Math.floor(size / 12));
    },
  },
  switzerland: {
    label: 'Switzerland 🇨🇭',
    generator(size) {
      return crossShape(size, 'white', 'red', Math.max(2, Math.floor(size / 8)));
    },
  },
  turkey: {
    label: 'Turkey 🇹🇷',
    generator(size) {
      const grid = fillGrid(size, 'red');
      const circle = centerCircle(size, 'white', 'red');
      return circle.map((cell, index) => (cell === 'white' && index % size > size / 2 ? 'white' : grid[index]));
    },
  },
  southafrica: {
    label: 'South Africa 🇿🇦',
    generator(size) {
      const grid = fillGrid(size, 'green');
      const center = Math.floor(size / 2);
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          const index = row * size + col;
          if (col < Math.floor(size / 3) && row > col * 2 && row < size - col * 2) {
            grid[index] = 'black';
          } else if (col < Math.floor(size / 3)) {
            grid[index] = 'yellow';
          } else if (row < Math.floor(size / 4)) {
            grid[index] = 'red';
          } else if (row > Math.floor((size * 3) / 4)) {
            grid[index] = 'blue';
          } else {
            grid[index] = 'white';
          }
        }
      }
      return grid;
    },
  },
};

function getCellColor(index) {
  return pixelData[index] || defaultColors.white;
}

function pushHistory() {
  history.push([...pixelData]);
  if (history.length > 50) history.shift();
  redoBtn.disabled = true;
}

function applyHistory(state) {
  if (!state) return;
  pixelData = [...state];
  updateGridColors();
  updateUI();
}

function updateGridColors() {
  gridContainer.querySelectorAll('.pixel-cell').forEach((cell) => {
    const index = Number(cell.dataset.index);
    cell.style.backgroundColor = getCellColor(index);
  });
}

function createGrid(size) {
  currentSize = size;
  const gridCount = size * size;
  gridContainer.innerHTML = '';
  gridContainer.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
  const cellFragment = document.createDocumentFragment();
  for (let index = 0; index < gridCount; index += 1) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'pixel-cell';
    cell.dataset.index = index;
    cell.title = `Pixel ${index + 1}`;
    cell.addEventListener('mousedown', handlePaint);
    cell.addEventListener('mouseover', handlePaint);
    cell.addEventListener('touchstart', handleTouchPaint, { passive: false });
    cell.addEventListener('touchmove', handleTouchPaint, { passive: false });
    cellFragment.appendChild(cell);
  }
  gridContainer.appendChild(cellFragment);
  pixelData = Array(gridCount).fill(defaultColors.white);
  history = [];
  future = [];
  pushHistory();
  updateUI();
  renderPreview();
}

function setActiveTool(tool) {
  activeTool = tool;
  toolButtons.forEach((button) => button.classList.toggle('active', button.dataset.tool === tool));
  statTool.textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
}

function setActiveColor(color) {
  currentColor = color;
  paletteButtons.forEach((button) => button.classList.toggle('active', button.dataset.color === color));
  statColorText.textContent = color.toUpperCase();
  statColorChip.style.background = color;
}

function handlePaint(event) {
  if (event.type === 'mouseover' && !isMouseDown) return;
  const target = event.currentTarget;
  const index = Number(target.dataset.index);
  event.preventDefault();
  isPainting = true;
  applyTool(index);
}

function handleTouchPaint(event) {
  event.preventDefault();
  const touch = event.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!element || !element.classList.contains('pixel-cell')) return;
  const index = Number(element.dataset.index);
  applyTool(index);
}

function applyTool(index) {
  const currentCellColor = getCellColor(index);
  let nextColor = currentColor;
  if (activeTool === 'eraser') {
    nextColor = defaultColors.white;
  }
  if (activeTool === 'fill') {
    if (currentCellColor === currentColor) return;
    fillArea(index, currentCellColor, currentColor);
  } else {
    if (currentCellColor === nextColor) return;
    pixelData[index] = nextColor;
    updateCell(index);
  }
  pushHistory();
  future = [];
  updateUI();
  renderPreview();
}

function updateCell(index) {
  const cell = gridContainer.querySelector(`.pixel-cell[data-index="${index}"]`);
  if (cell) cell.style.backgroundColor = getCellColor(index);
}

function fillArea(startIndex, baseColor, fillColor) {
  const size = currentSize;
  const queue = [startIndex];
  const visited = new Set();
  while (queue.length) {
    const index = queue.shift();
    if (visited.has(index)) continue;
    visited.add(index);
    if (getCellColor(index) !== baseColor) continue;
    pixelData[index] = fillColor;
    updateCell(index);
    const row = Math.floor(index / size);
    const col = index % size;
    const neighbors = [];
    if (row > 0) neighbors.push(index - size);
    if (row < size - 1) neighbors.push(index + size);
    if (col > 0) neighbors.push(index - 1);
    if (col < size - 1) neighbors.push(index + 1);
    queue.push(...neighbors);
  }
}

function updateUI() {
  const total = pixelData.length;
  const coloredCount = pixelData.filter((color) => color.toUpperCase() !== defaultColors.white).length;
  const uniqueColors = new Set(pixelData.filter((color) => color.toUpperCase() !== defaultColors.white));
  const percentage = Math.round((coloredCount / total) * 100);
  statGridSize.textContent = `${currentSize} × ${currentSize}`;
  statGridSize2.textContent = `${currentSize} × ${currentSize}`;
  statColored.textContent = coloredCount;
  statColored2.textContent = coloredCount;
  statUniqueColors.textContent = uniqueColors.size || 1;
  statCompletion.textContent = `${percentage}%`;
  undoBtn.disabled = history.length <= 1;
  redoBtn.disabled = future.length === 0;
}

function createCanvasImage() {
  const exportSize = currentSize * 16;
  const canvas = document.createElement('canvas');
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const scale = exportSize / currentSize;
  pixelData.forEach((color, index) => {
    const x = index % currentSize;
    const y = Math.floor(index / currentSize);
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  });
  return canvas;
}

function downloadPNG() {
  const canvas = createCanvasImage();
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `pixel-flag-${currentSize}x${currentSize}.png`;
  link.click();
}

function clearCanvas() {
  const confirmClear = confirm('Clear the canvas? This will reset your design.');
  if (!confirmClear) return;
  pixelData = Array(currentSize * currentSize).fill(defaultColors.white);
  updateGridColors();
  pushHistory();
  future = [];
  updateUI();
  renderPreview();
}

function undo() {
  if (history.length <= 1) return;
  future.push(history.pop());
  const previous = history[history.length - 1];
  applyHistory(previous);
}

function redo() {
  if (!future.length) return;
  const next = future.pop();
  history.push(next);
  applyHistory(next);
}

function renderPreview() {
  renderCanvasPreview(miniPreview, 160);
  renderCanvasPreview(heroPreviewCanvas, 160, true);
  evaluateFlagRecognition();
}

function renderCanvasPreview(canvas, size, subtle = false) {
  const ctx = canvas.getContext('2d');
  const scale = size / currentSize;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = subtle ? 'rgba(255,255,255,0.9)' : '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  pixelData.forEach((color, index) => {
    const x = index % currentSize;
    const y = Math.floor(index / currentSize);
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  });
}

function evaluateTemplateMatch() {
  const actualCategories = pixelData.map((color) => categorizeColor(color));
  const scores = Object.entries(templates).map(([key, template]) => {
    const pattern = template.generator(currentSize);
    let matching = 0;
    for (let i = 0; i < actualCategories.length; i += 1) {
      if (actualCategories[i] === pattern[i]) matching += 1;
    }
    return {
      key,
      label: template.label,
      score: Math.round((matching / actualCategories.length) * 100),
    };
  });
  return scores.sort((a, b) => b.score - a.score);
}

let lastRecognition = null;

function updateMatchList(matches) {
  recognitionMatches.innerHTML = '';
  matches.slice(0, 3).forEach((match, index) => {
    const item = document.createElement('li');
    item.className = 'match-item';
    item.textContent = `${index + 1}. ${match.label} — ${match.score}%`;
    recognitionMatches.appendChild(item);
  });
}

function evaluateFlagRecognition() {
  const matches = evaluateTemplateMatch();
  const best = matches[0];
  const threshold = 75;
  const hasPainted = pixelData.some((color) => categorizeColor(color) !== 'white');

  updateMatchList(matches);

  if (!hasPainted) {
    recognitionCard.classList.remove('success');
    recognitionStatus.innerHTML = '🤔 Unknown Flag';
    recognitionDetail.innerHTML = '<p>Keep creating! Your artwork doesn\'t currently match a known template.</p>';
    recognitionScore.innerHTML = 'Match Score: <strong>0%</strong>';
    lastRecognition = null;
    return;
  }

  if (best.score >= threshold) {
    recognitionCard.classList.add('success');
    recognitionStatus.innerHTML = `🎉 Flag Identified! <strong>${best.label}</strong>`;
    recognitionDetail.innerHTML = `<p>Excellent work! Your design closely matches the flag of ${best.label.split(' ')[0]}.</p>`;
    animateMatchScore(best.score);
    if (!lastRecognition || lastRecognition.name !== best.key) {
      launchConfetti();
    }
    lastRecognition = { name: best.key, score: best.score };
  } else {
    recognitionCard.classList.remove('success');
    recognitionStatus.innerHTML = '🤔 Unknown Flag';
    recognitionDetail.innerHTML = '<p>Keep creating! Your artwork doesn\'t currently match a known template.</p>';
    recognitionScore.innerHTML = 'Match Score: <strong>0%</strong>';
    lastRecognition = null;
  }
}

function animateMatchScore(targetScore) {
  const startScore = Number(recognitionScore.textContent.replace(/[^0-9]/g, '')) || 0;
  const duration = 500;
  const startTime = performance.now();

  function step(time) {
    const progress = Math.min((time - startTime) / duration, 1);
    const current = Math.round(startScore + (targetScore - startScore) * progress);
    recognitionScore.innerHTML = `Match Score: <strong>${current}%</strong>`;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function launchConfetti() {
  confettiContainer.innerHTML = '';
  const colors = ['#FFEB3B', '#4CAF50', '#4169E1', '#FF5722', '#9C27B0'];
  for (let i = 0; i < 18; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const size = Math.random() * 10 + 6;
    piece.style.width = `${size}px`;
    piece.style.height = `${size}px`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = `${Math.random() * 80 + 10}%`;
    piece.style.top = `${Math.random() * 20 + 10}%`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.animationDelay = `${Math.random() * 250}ms`;
    piece.style.animationDuration = `${1200 + Math.random() * 600}ms`;
    confettiContainer.appendChild(piece);
  }
  setTimeout(() => {
    confettiContainer.innerHTML = '';
  }, 1800);
}

function handleMouseUp() {
  isMouseDown = false;
  isPainting = false;
}

function handleMouseDown() {
  isMouseDown = true;
}

function applyTemplate(name) {
  const template = templates[name];
  if (!template) return;
  pixelData = template(currentSize);
  updateGridColors();
  pushHistory();
  future = [];
  updateUI();
  renderPreview();
}

gridSizeSelect.addEventListener('change', (event) => {
  const newSize = Number(event.target.value);
  createGrid(newSize);
});

paletteButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveColor(button.dataset.color);
    customColorInput.value = button.dataset.color;
  });
});

customColorInput.addEventListener('input', () => {
  const color = customColorInput.value;
  setActiveColor(color);
  paletteButtons.forEach((button) => button.classList.remove('active'));
});

toolButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTool(button.dataset.tool));
});

templateButtons.forEach((button) => {
  button.addEventListener('click', () => applyTemplate(button.dataset.template));
});

clearCanvasBtn.addEventListener('click', clearCanvas);
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
downloadBtn.addEventListener('click', downloadPNG);
gridLinesToggle.addEventListener('change', () => {
  gridContainer.classList.toggle('grid-hidden', !gridLinesToggle.checked);
});

document.body.addEventListener('mouseup', handleMouseUp);
document.body.addEventListener('mousedown', handleMouseDown);
document.body.addEventListener('mouseleave', handleMouseUp);

startButton.addEventListener('click', () => {
  document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
});

currentYearSpan.textContent = new Date().getFullYear();
setActiveColor(defaultColors.white);
setActiveTool('pencil');
createGrid(currentSize);
renderPreview();

window.addEventListener('beforeunload', (event) => {
  const changed = pixelData.some((color) => color.toUpperCase() !== defaultColors.white);
  if (changed) {
    event.preventDefault();
    event.returnValue = '';
  }
});
