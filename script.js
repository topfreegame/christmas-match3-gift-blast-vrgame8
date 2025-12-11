const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('message');
const restartBtn = document.getElementById('restartBtn');

// Game state
let grid = Array(5).fill().map(() => Array(5).fill(0));
let score = 0;
let best = localStorage.getItem('match3Best') || 0;
bestEl.textContent = best;

// Game parameters
const TILE_SIZE = 80;
const COLORS = ['#ff4757', '#feca57', '#27ae60', '#2ecc71', '#3498db'];
const EMOJIS = ['🎁', '🍭', '🌟', '🔔', '🎄'];

// Animation state
let particles = [];
let animations = [];
let isSwapping = false;
let isProcessing = false;
let gameActive = true;

// Initialize game
function init() {
  // Reset state
  grid = Array(5).fill().map(() => Array(5).fill(0));
  particles = [];
  animations = [];
  score = 0;
  scoreEl.textContent = score;
  isSwapping = false;
  isProcessing = false;
  gameActive = true;
  
  // Generate random grid
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      grid[r][c] = Math.floor(Math.random() * 5) + 1;
    }
  }
  
  // Ensure no initial matches
  ensureNoMatches();
  
  msgEl.textContent = 'Tap/Swipe to swap gifts!';
  restartBtn.style.display = 'none';
  
  // Draw initial grid
  drawGrid();
}

// Ensure initial grid has no matches
function ensureNoMatches() {
  let hasMatches = true;
  let attempts = 0;
  
  while (hasMatches && attempts < 100) {
    hasMatches = false;
    
    // Check all possible matches
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (checkMatchAt(r, c)) {
          hasMatches = true;
          // Change this cell's value
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

// Check if there's a match at specific position
function checkMatchAt(r, c) {
  const value = grid[r][c];
  if (value === 0) return false;
  
  // Horizontal check
  let horizontal = 1;
  // Left
  for (let i = c - 1; i >= 0 && grid[r][i] === value; i--) horizontal++;
  // Right
  for (let i = c + 1; i < 5 && grid[r][i] === value; i++) horizontal++;
  
  // Vertical check
  let vertical = 1;
  // Up
  for (let i = r - 1; i >= 0 && grid[i][c] === value; i--) vertical++;
  // Down
  for (let i = r + 1; i < 5 && grid[i][c] === value; i++) vertical++;
  
  return horizontal >= 3 || vertical >= 3;
}

// Check if new value would create a match
function createsMatchWith(r, c, newValue) {
  const oldValue = grid[r][c];
  grid[r][c] = newValue;
  const result = checkMatchAt(r, c);
  grid[r][c] = oldValue;
  return result;
}

// Draw grid
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw all tiles
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      drawTile(r, c);
    }
  }
  
  // Draw particles
  drawParticles();
  
  // Continue drawing if there are animations
  if (animations.length > 0) {
    requestAnimationFrame(drawGrid);
  }
}

// Draw single tile
function drawTile(r, c) {
  // Check if there's an animation
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
    // Handle animation
    const progress = Math.min(1, (Date.now() - anim.startTime) / anim.duration);
    
    if (anim.type === 'swap') {
      const startX = anim.startC * TILE_SIZE;
      const startY = anim.startR * TILE_SIZE;
      const targetX = anim.targetC * TILE_SIZE;
      const targetY = anim.targetR * TILE_SIZE;
      
      // If this is the starting position tile
      if (anim.r === r && anim.c === c) {
        const x = startX + (targetX - startX) * progress;
        const y = startY + (targetY - startY) * progress;
        drawTileAtPosition(x, y, anim.value);
        
        // Update state when animation completes
        if (progress >= 1) {
          const index = animations.indexOf(anim);
          if (index > -1) {
            animations.splice(index, 1);
            // Execute callback
            if (anim.onComplete) {
              anim.onComplete();
            }
          }
        }
      }
      return;
    } else if (anim.type === 'fall') {
      const startY = anim.startY; // Use starting Y coordinate from animation
      const targetY = anim.targetR * TILE_SIZE;
      
      const y = startY + (targetY - startY) * progress;
      
      // Draw falling tile
      drawTileAtPosition(c * TILE_SIZE, y, anim.value);
      
      if (progress >= 1) {
        const index = animations.indexOf(anim);
        if (index > -1) {
          animations.splice(index, 1);
          // Update grid when animation completes
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
          // Clear cell when disappear animation completes
          grid[r][c] = 0;
        }
      }
      return;
    }
  }
  
  // No animation, draw normal tile
  if (grid[r][c] !== 0) {
    drawTileAtPosition(c * TILE_SIZE, r * TILE_SIZE, grid[r][c]);
  }
}

// Draw tile at specific position
function drawTileAtPosition(x, y, value) {
  if (value === 0) return;
  
  // Background
  ctx.fillStyle = COLORS[value - 1];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  
  // Border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  
  // Draw emoji
  ctx.font = '40px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(EMOJIS[value - 1], x + TILE_SIZE/2, y + TILE_SIZE/2 + 15);
}

// Draw tile with effect (for disappear animation)
function drawTileWithEffect(x, y, value, scale) {
  if (value === 0) return;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  
  // Background
  ctx.fillStyle = COLORS[value - 1];
  ctx.fillRect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE);
  
  // Border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE);
  
  // Draw emoji
  ctx.font = '40px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(EMOJIS[value - 1], 0, 15);
  
  ctx.restore();
}

// Draw particles
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

// Swap two tiles
function swapTiles(r1, c1, r2, c2) {
  if (!gameActive || isSwapping || isProcessing) return;
  
  // Check if adjacent
  const isAdjacent = (Math.abs(r1 - r2) === 1 && c1 === c2) || 
                     (Math.abs(c1 - c2) === 1 && r1 === r2);
  if (!isAdjacent) return;
  
  isSwapping = true;
  
  // Create swap animation
  createSwapAnimation(r1, c1, r2, c2, () => {
    // Actually swap grid values
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    
    // Check for matches
    const matches = findMatches();
    
    if (matches.length > 0) {
      // Has matches, remove them
      setTimeout(() => {
        removeMatches(matches);
        isSwapping = false;
      }, 300);
    } else {
      // No matches, swap back
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

// Create swap animation
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

// Find all matches
function findMatches() {
  const matches = new Set();
  
  // Check horizontal matches
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const value = grid[r][c];
      if (value === 0) continue;
      
      if (grid[r][c] === value && 
          grid[r][c + 1] === value && 
          grid[r][c + 2] === value) {
        // Check for longer matches
        let count = 3;
        while (c + count < 5 && grid[r][c + count] === value) {
          count++;
        }
        
        // Add all matching tiles
        for (let i = 0; i < count; i++) {
          matches.add(`${r},${c + i}`);
        }
      }
    }
  }
  
  // Check vertical matches
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 3; r++) {
      const value = grid[r][c];
      if (value === 0) continue;
      
      if (grid[r][c] === value && 
          grid[r + 1][c] === value && 
          grid[r + 2][c] === value) {
        // Check for longer matches
        let count = 3;
        while (r + count < 5 && grid[r + count][c] === value) {
          count++;
        }
        
        // Add all matching tiles
        for (let i = 0; i < count; i++) {
          matches.add(`${r + i},${c}`);
        }
      }
    }
  }
  
  // Convert to array
  return Array.from(matches).map(str => {
    const [r, c] = str.split(',').map(Number);
    return {r, c};
  });
}

// Remove matched tiles
function removeMatches(matches) {
  if (matches.length === 0) return;
  
  isProcessing = true;
  
  // Create disappear animations
  matches.forEach(({r, c}) => {
    animations.push({
      type: 'disappear',
      r, c,
      value: grid[r][c],
      startTime: Date.now(),
      duration: 300
    });
    
    // Create particle effects
    createParticles(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2);
  });
  
  // Update score
  score += matches.length * 10;
  scoreEl.textContent = score;
  
  // Update best score
  if (score > best) {
    best = score;
    localStorage.setItem('match3Best', best);
    bestEl.textContent = best;
  }
  
  // Delay before dropping tiles
  setTimeout(() => {
    // Note: We don't clear grid here, it's cleared when disappear animation completes
    dropTiles();
  }, 400);
}

// Drop tiles down
function dropTiles() {
  // Create animation for each falling tile
  for (let c = 0; c < 5; c++) {
    let writeRow = 4;
    
    // Move tiles from bottom up
    for (let r = 4; r >= 0; r--) {
      if (grid[r][c] !== 0) {
        if (writeRow !== r) {
          // Create fall animation
          animations.push({
            type: 'fall',
            startR: r,
            startC: c,
            startY: r * TILE_SIZE, // Starting Y coordinate
            targetR: writeRow,
            targetC: c,
            value: grid[r][c],
            startTime: Date.now(),
            duration: 300
          });
          
          // Immediately clear original position
          grid[r][c] = 0;
        }
        writeRow--;
      }
    }
  }
  
  drawGrid();
  
  // Delay before filling empty tiles
  setTimeout(() => {
    fillEmptyTiles();
  }, 500);
}

// Fill empty tiles
function fillEmptyTiles() {
  let emptyTiles = [];
  
  // Find all empty tiles
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c] === 0) {
        emptyTiles.push({r, c});
      }
    }
  }
  
  // If no empty tiles, check game status
  if (emptyTiles.length === 0) {
    checkNewMatches();
    return;
  }
  
  // Create fall animation for each new tile
  emptyTiles.forEach(({r, c}, index) => {
    const newValue = Math.floor(Math.random() * 5) + 1;
    
    // Create animation for new tile falling from above
    animations.push({
      type: 'fall',
      startR: -1,
      startC: c,
      startY: -TILE_SIZE, // Start above the canvas
      targetR: r,
      targetC: c,
      value: newValue, // Value for the new tile
      startTime: Date.now() + index * 50, // Stagger start times
      duration: 400
    });
    
    // Note: We don't update grid immediately, it's updated when animation completes
  });
  
  drawGrid();
  
  // Delay before checking for new matches
  setTimeout(() => {
    checkNewMatches();
  }, 600);
}

// Check for new matches
function checkNewMatches() {
  const newMatches = findMatches();
  
  if (newMatches.length > 0) {
    // New matches found, continue removing
    setTimeout(() => {
      removeMatches(newMatches);
    }, 300);
  } else {
    // No new matches, check game status
    isProcessing = false;
    checkGameStatus();
  }
}

// Create particle effects
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

// Check game status
function checkGameStatus() {
  if (!gameActive) return;
  
  // Check if there are possible moves
  const hasMoves = checkPossibleMoves();
  
  if (!hasMoves) {
    gameActive = false;
    msgEl.innerHTML = 'Game Over! 🎄 Merry Christmas!';
    restartBtn.style.display = 'block';
    
    // Create celebration particle effects
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

// Check if there are possible moves
function checkPossibleMoves() {
  // Copy current grid for testing
  const testGrid = grid.map(row => [...row]);
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      // Check right swap
      if (c < 4) {
        // Temporary swap
        [testGrid[r][c], testGrid[r][c+1]] = [testGrid[r][c+1], testGrid[r][c]];
        
        // Check for matches
        if (checkForMatchesInGrid(testGrid)) {
          return true;
        }
        
        // Swap back
        [testGrid[r][c], testGrid[r][c+1]] = [testGrid[r][c+1], testGrid[r][c]];
      }
      
      // Check down swap
      if (r < 4) {
        // Temporary swap
        [testGrid[r][c], testGrid[r+1][c]] = [testGrid[r+1][c], testGrid[r][c]];
        
        // Check for matches
        if (checkForMatchesInGrid(testGrid)) {
          return true;
        }
        
        // Swap back
        [testGrid[r][c], testGrid[r+1][c]] = [testGrid[r+1][c], testGrid[r][c]];
      }
    }
  }
  
  return false;
}

// Check for matches in grid
function checkForMatchesInGrid(gridToCheck) {
  // Check horizontal matches
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
  
  // Check vertical matches
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

// Restart game
function restart() {
  init();
}

// Event handling
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
  
  // Ensure within grid bounds
  if (startR >= 0 && startR < 5 && startC >= 0 && startC < 5 &&
      endR >= 0 && endR < 5 && endC >= 0 && endC < 5) {
    
    // Check if adjacent tiles
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
  
  // Ensure within grid bounds
  if (startR >= 0 && startR < 5 && startC >= 0 && startC < 5 &&
      endR >= 0 && endR < 5 && endC >= 0 && endC < 5) {
    
    // Check if adjacent tiles
    if ((Math.abs(startR - endR) === 1 && startC === endC) ||
        (Math.abs(startC - endC) === 1 && startR === endR)) {
      swapTiles(startR, startC, endR, endC);
    }
  }
}

// Start game
init();
