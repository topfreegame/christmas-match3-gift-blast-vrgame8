const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('message');
const restartBtn = document.getElementById('restartBtn');

// 游戏状态
let grid = Array(5).fill().map(() => Array(5).fill(0));
let score = 0;
let best = localStorage.getItem('match3Best') || 0;
bestEl.textContent = best;

// 游戏参数
const TILE_SIZE = 80;
const COLORS = ['#ff4757', '#feca57', '#27ae60', '#2ecc71', '#3498db'];
const EMOJIS = ['🎁', '🍭', '🌟', '🔔', '🎄'];

// 动画状态
let particles = [];
let animations = [];
let isSwapping = false;
let isProcessing = false;
let gameActive = true;

// 初始化游戏
function init() {
  // 重置状态
  grid = Array(5).fill().map(() => Array(5).fill(0));
  particles = [];
  animations = [];
  score = 0;
  scoreEl.textContent = score;
  isSwapping = false;
  isProcessing = false;
  gameActive = true;
  
  // 生成随机网格
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      grid[r][c] = Math.floor(Math.random() * 5) + 1;
    }
  }
  
  // 确保初始没有匹配
  ensureNoMatches();
  
  msgEl.textContent = 'Tap/Swipe to swap gifts!';
  restartBtn.style.display = 'none';
  
  // 绘制初始网格
  drawGrid();
}

// 确保初始网格没有匹配
function ensureNoMatches() {
  let hasMatches = true;
  let attempts = 0;
  
  while (hasMatches && attempts < 100) {
    hasMatches = false;
    
    // 检查所有可能的匹配
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (checkMatchAt(r, c)) {
          hasMatches = true;
          // 改变这个格子的值
          let newValue;
          do {
            newValue = Math.floor(Math.random() * 5) + 1;
          } while (newValue === grid[r][c] || createsMatchWith(r, c, newValue));
          grid[r][c] = newValue;
        }
      }
    }
    attempts++;
  }
}

// 检查在指定位置是否有匹配
function checkMatchAt(r, c) {
  const value = grid[r][c];
  if (value === 0) return false;
  
  // 水平检查
  let horizontal = 1;
  // 向左
  for (let i = c - 1; i >= 0 && grid[r][i] === value; i--) horizontal++;
  // 向右
  for (let i = c + 1; i < 5 && grid[r][i] === value; i++) horizontal++;
  
  // 垂直检查
  let vertical = 1;
  // 向上
  for (let i = r - 1; i >= 0 && grid[i][c] === value; i--) vertical++;
  // 向下
  for (let i = r + 1; i < 5 && grid[i][c] === value; i++) vertical++;
  
  return horizontal >= 3 || vertical >= 3;
}

// 检查新值是否会创建匹配
function createsMatchWith(r, c, newValue) {
  const oldValue = grid[r][c];
  grid[r][c] = newValue;
  const result = checkMatchAt(r, c);
  grid[r][c] = oldValue;
  return result;
}

// 绘制网格
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制所有方块
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      drawTile(r, c);
    }
  }
  
  // 绘制粒子效果
  drawParticles();
  
  // 如果有动画，继续绘制
  if (animations.length > 0) {
    requestAnimationFrame(drawGrid);
  }
}

// 绘制单个方块
function drawTile(r, c) {
  // 检查是否有动画
  let anim = animations.find(a => {
    if (a.type === 'swap') {
      return (a.r === r && a.c === c) || (a.targetR === r && a.targetC === c);
    } else if (a.type === 'fall') {
      return a.targetR === r && a.targetC === c;
    } else if (a.type === 'disappear') {
      return a.r === r && a.c === c;
    }
    return false;
  });
  
  if (anim) {
    // 处理动画
    const progress = Math.min(1, (Date.now() - anim.startTime) / anim.duration);
    
    if (anim.type === 'swap') {
      const startX = anim.startC * TILE_SIZE;
      const startY = anim.startR * TILE_SIZE;
      const targetX = anim.targetC * TILE_SIZE;
      const targetY = anim.targetR * TILE_SIZE;
      
      // 如果是起始位置的方块
      if (anim.r === r && anim.c === c) {
        const x = startX + (targetX - startX) * progress;
        const y = startY + (targetY - startY) * progress;
        drawTileAtPosition(x, y, anim.value);
        
        // 动画完成后更新状态
        if (progress >= 1) {
          const index = animations.indexOf(anim);
          if (index > -1) {
            animations.splice(index, 1);
            // 执行回调
            if (anim.onComplete) {
              anim.onComplete();
            }
          }
        }
      }
      return;
    } else if (anim.type === 'fall') {
      const startY = anim.startY; // 使用动画中的起始Y坐标
      const targetY = anim.targetR * TILE_SIZE;
      
      const y = startY + (targetY - startY) * progress;
      
      // 绘制下落中的方块
      drawTileAtPosition(c * TILE_SIZE, y, anim.value);
      
      if (progress >= 1) {
        const index = animations.indexOf(anim);
        if (index > -1) {
          animations.splice(index, 1);
          // 动画完成后更新网格
          grid[r][c] = anim.value;
        }
      }
      return;
    } else if (anim.type === 'disappear') {
      const scale = 1 - progress;
      drawTileWithEffect(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2, anim.value, scale);
      
      if (progress >= 1) {
        const index = animations.indexOf(anim);
        if (index > -1) {
          animations.splice(index, 1);
          // 消失动画完成后清空格子
          grid[r][c] = 0;
        }
      }
      return;
    }
  }
  
  // 没有动画，绘制正常方块
  if (grid[r][c] !== 0) {
    drawTileAtPosition(c * TILE_SIZE, r * TILE_SIZE, grid[r][c]);
  }
}

// 在指定位置绘制方块
function drawTileAtPosition(x, y, value) {
  if (value === 0) return;
  
  // 背景
  ctx.fillStyle = COLORS[value - 1];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  
  // 边框
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  
  // 绘制emoji
  ctx.font = '40px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(EMOJIS[value - 1], x + TILE_SIZE/2, y + TILE_SIZE/2 + 15);
}

// 绘制带效果的方块（用于消失动画）
function drawTileWithEffect(x, y, value, scale) {
  if (value === 0) return;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  
  // 背景
  ctx.fillStyle = COLORS[value - 1];
  ctx.fillRect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE);
  
  // 边框
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE);
  
  // 绘制emoji
  ctx.font = '40px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(EMOJIS[value - 1], 0, 15);
  
  ctx.restore();
}

// 绘制粒子效果
function drawParticles() {
  particles = particles.filter(p => p.life > 0);
  
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 100;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });
  
  ctx.globalAlpha = 1;
}

// 交换两个方块
function swapTiles(r1, c1, r2, c2) {
  if (!gameActive || isSwapping || isProcessing) return;
  
  // 检查是否相邻
  const isAdjacent = (Math.abs(r1 - r2) === 1 && c1 === c2) || 
                     (Math.abs(c1 - c2) === 1 && r1 === r2);
  if (!isAdjacent) return;
  
  isSwapping = true;
  
  // 创建交换动画
  createSwapAnimation(r1, c1, r2, c2, () => {
    // 实际交换网格值
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    
    // 检查是否有匹配
    const matches = findMatches();
    
    if (matches.length > 0) {
      // 有匹配，消除它们
      setTimeout(() => {
        removeMatches(matches);
        isSwapping = false;
      }, 300);
    } else {
      // 没有匹配，交换回来
      setTimeout(() => {
        createSwapAnimation(r1, c1, r2, c2, () => {
          [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
          isSwapping = false;
          drawGrid();
        });
      }, 300);
    }
  });
}

// 创建交换动画
function createSwapAnimation(r1, c1, r2, c2, onComplete) {
  animations.push({
    type: 'swap',
    r: r1,
    c: c1,
    startR: r1,
    startC: c1,
    targetR: r2,
    targetC: c2,
    value: grid[r1][c1],
    startTime: Date.now(),
    duration: 300,
    onComplete
  });
  
  animations.push({
    type: 'swap',
    r: r2,
    c: c2,
    startR: r2,
    startC: c2,
    targetR: r1,
    targetC: c1,
    value: grid[r2][c2],
    startTime: Date.now(),
    duration: 300
  });
  
  drawGrid();
}

// 查找所有匹配
function findMatches() {
  const matches = new Set();
  
  // 检查水平匹配
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const value = grid[r][c];
      if (value === 0) continue;
      
      if (grid[r][c] === value && 
          grid[r][c + 1] === value && 
          grid[r][c + 2] === value) {
        // 检查是否有更长的匹配
        let count = 3;
        while (c + count < 5 && grid[r][c + count] === value) {
          count++;
        }
        
        // 添加所有匹配的方块
        for (let i = 0; i < count; i++) {
          matches.add(`${r},${c + i}`);
        }
      }
    }
  }
  
  // 检查垂直匹配
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 3; r++) {
      const value = grid[r][c];
      if (value === 0) continue;
      
      if (grid[r][c] === value && 
          grid[r + 1][c] === value && 
          grid[r + 2][c] === value) {
        // 检查是否有更长的匹配
        let count = 3;
        while (r + count < 5 && grid[r + count][c] === value) {
          count++;
        }
        
        // 添加所有匹配的方块
        for (let i = 0; i < count; i++) {
          matches.add(`${r + i},${c}`);
        }
      }
    }
  }
  
  // 转换为数组
  return Array.from(matches).map(str => {
    const [r, c] = str.split(',').map(Number);
    return {r, c};
  });
}

// 移除匹配的方块
function removeMatches(matches) {
  if (matches.length === 0) return;
  
  isProcessing = true;
  
  // 创建消失动画
  matches.forEach(({r, c}) => {
    animations.push({
      type: 'disappear',
      r, c,
      value: grid[r][c],
      startTime: Date.now(),
      duration: 300
    });
    
    // 创建粒子效果
    createParticles(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2);
  });
  
  // 更新分数
  score += matches.length * 10;
  scoreEl.textContent = score;
  
  // 更新最高分
  if (score > best) {
    best = score;
    localStorage.setItem('match3Best', best);
    bestEl.textContent = best;
  }
  
  // 延迟执行下落
  setTimeout(() => {
    // 注意：不再在这里清除grid，而是在消失动画完成后清除
    dropTiles();
  }, 400);
}

// 方块下落
function dropTiles() {
  // 为每个下落方块创建动画
  for (let c = 0; c < 5; c++) {
    let writeRow = 4;
    
    // 从底部向上移动方块
    for (let r = 4; r >= 0; r--) {
      if (grid[r][c] !== 0) {
        if (writeRow !== r) {
          // 创建下落动画
          animations.push({
            type: 'fall',
            startR: r,
            startC: c,
            startY: r * TILE_SIZE, // 起始Y坐标
            targetR: writeRow,
            targetC: c,
            value: grid[r][c],
            startTime: Date.now(),
            duration: 300
          });
          
          // 立即清空原位置
          grid[r][c] = 0;
        }
        writeRow--;
      }
    }
  }
  
  drawGrid();
  
  // 延迟填充空位
  setTimeout(() => {
    fillEmptyTiles();
  }, 500);
}

// 填充空位
function fillEmptyTiles() {
  let emptyTiles = [];
  
  // 找出所有空位
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c] === 0) {
        emptyTiles.push({r, c});
      }
    }
  }
  
  // 如果没有空位，直接检查游戏状态
  if (emptyTiles.length === 0) {
    checkNewMatches();
    return;
  }
  
  // 为每个空位生成新方块并创建下落动画
  emptyTiles.forEach(({r, c}, index) => {
    const newValue = Math.floor(Math.random() * 5) + 1;
    
    // 创建新方块从上方下落的动画
    animations.push({
      type: 'fall',
      startR: -1,
      startC: c,
      startY: -TILE_SIZE, // 从画布上方开始
      targetR: r,
      targetC: c,
      value: newValue, // 新方块的值
      startTime: Date.now() + index * 50, // 错开开始时间
      duration: 400
    });
    
    // 注意：这里不立即更新grid，动画完成后会更新
  });
  
  drawGrid();
  
  // 延迟检查新匹配
  setTimeout(() => {
    checkNewMatches();
  }, 600);
}

// 检查新匹配
function checkNewMatches() {
  const newMatches = findMatches();
  
  if (newMatches.length > 0) {
    // 有新的匹配，继续消除
    setTimeout(() => {
      removeMatches(newMatches);
    }, 300);
  } else {
    // 没有新匹配，检查游戏状态
    isProcessing = false;
    checkGameStatus();
  }
}

// 创建粒子效果
function createParticles(x, y) {
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 30 + Math.random() * 20
    });
  }
}

// 检查游戏状态
function checkGameStatus() {
  if (!gameActive) return;
  
  // 检查是否还有可能的移动
  const hasMoves = checkPossibleMoves();
  
  if (!hasMoves) {
    gameActive = false;
    msgEl.innerHTML = 'Game Over! 🎄 Merry Christmas!';
    restartBtn.style.display = 'block';
    
    // 创建庆祝粒子效果
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        createParticles(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        );
      }, i * 50);
    }
  }
}

// 检查是否还有可能的移动
function checkPossibleMoves() {
  // 复制当前网格进行测试
  const testGrid = grid.map(row => [...row]);
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      // 检查右侧交换
      if (c < 4) {
        // 临时交换
        [testGrid[r][c], testGrid[r][c+1]] = [testGrid[r][c+1], testGrid[r][c]];
        
        // 检查是否有匹配
        if (checkForMatchesInGrid(testGrid)) {
          return true;
        }
        
        // 交换回来
        [testGrid[r][c], testGrid[r][c+1]] = [testGrid[r][c+1], testGrid[r][c]];
      }
      
      // 检查下方交换
      if (r < 4) {
        // 临时交换
        [testGrid[r][c], testGrid[r+1][c]] = [testGrid[r+1][c], testGrid[r][c]];
        
        // 检查是否有匹配
        if (checkForMatchesInGrid(testGrid)) {
          return true;
        }
        
        // 交换回来
        [testGrid[r][c], testGrid[r+1][c]] = [testGrid[r+1][c], testGrid[r][c]];
      }
    }
  }
  
  return false;
}

// 检查网格中是否有匹配
function checkForMatchesInGrid(gridToCheck) {
  // 检查水平匹配
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const value = gridToCheck[r][c];
      if (value === 0) continue;
      
      if (gridToCheck[r][c] === value && 
          gridToCheck[r][c + 1] === value && 
          gridToCheck[r][c + 2] === value) {
        return true;
      }
    }
  }
  
  // 检查垂直匹配
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 3; r++) {
      const value = gridToCheck[r][c];
      if (value === 0) continue;
      
      if (gridToCheck[r][c] === value && 
          gridToCheck[r + 1][c] === value && 
          gridToCheck[r + 2][c] === value) {
        return true;
      }
    }
  }
  
  return false;
}

// 重新开始游戏
function restart() {
  init();
}

// 事件处理
let startX, startY, startR, startC;

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchend', handleTouchEnd);

function handleMouseDown(e) {
  if (!gameActive || isSwapping || isProcessing) return;
  
  const rect = canvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  startR = Math.floor(startY / TILE_SIZE);
  startC = Math.floor(startX / TILE_SIZE);
}

function handleMouseUp(e) {
  if (!gameActive || isSwapping || isProcessing) return;
  
  const rect = canvas.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;
  const endR = Math.floor(endY / TILE_SIZE);
  const endC = Math.floor(endX / TILE_SIZE);
  
  // 确保在网格范围内
  if (startR >= 0 && startR < 5 && startC >= 0 && startC < 5 &&
      endR >= 0 && endR < 5 && endC >= 0 && endC < 5) {
    
    // 检查是否是相邻方块
    if ((Math.abs(startR - endR) === 1 && startC === endC) ||
        (Math.abs(startC - endC) === 1 && startR === endR)) {
      swapTiles(startR, startC, endR, endC);
    }
  }
}

function handleTouchStart(e) {
  e.preventDefault();
  if (!gameActive || isSwapping || isProcessing) return;
  
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  startX = touch.clientX - rect.left;
  startY = touch.clientY - rect.top;
  startR = Math.floor(startY / TILE_SIZE);
  startC = Math.floor(startX / TILE_SIZE);
}

function handleTouchEnd(e) {
  e.preventDefault();
  if (!gameActive || isSwapping || isProcessing) return;
  
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const endX = touch.clientX - rect.left;
  const endY = touch.clientY - rect.top;
  const endR = Math.floor(endY / TILE_SIZE);
  const endC = Math.floor(endX / TILE_SIZE);
  
  // 确保在网格范围内
  if (startR >= 0 && startR < 5 && startC >= 0 && startC < 5 &&
      endR >= 0 && endR < 5 && endC >= 0 && endC < 5) {
    
    // 检查是否是相邻方块
    if ((Math.abs(startR - endR) === 1 && startC === endC) ||
        (Math.abs(startC - endC) === 1 && startR === endR)) {
      swapTiles(startR, startC, endR, endC);
    }
  }
}

// 启动游戏
init();