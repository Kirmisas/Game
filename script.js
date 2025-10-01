document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gridElement = document.getElementById('game-grid');
    const piecesContainer = document.getElementById('pieces-container');
    const scoreElement = document.getElementById('score');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreElement = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');

    // --- Game Constants & State ---
    const GRID_SIZE = 9;
    const CLEAR_ANIMATION_DURATION = 400;
    const PIECE_DEFINITIONS = [ { shape: [[1]], color: '#FFADAD' }, { shape: [[1, 1]], color: '#FFD6A5' }, { shape: [[1], [1]], color: '#FFD6A5' }, { shape: [[1, 1, 1]], color: '#FDFFB6' }, { shape: [[1], [1], [1]], color: '#FDFFB6' }, { shape: [[1, 1], [1, 1]], color: '#CAFFBF' }, { shape: [[1, 1, 1], [1, 0, 0]], color: '#9BF6FF' }, { shape: [[1, 1], [0, 1], [0, 1]], color: '#9BF6FF' }, { shape: [[0, 1, 1], [1, 1, 0]], color: '#A0C4FF' }, { shape: [[1, 0], [1, 1], [0, 1]], color: '#A0C4FF' }, { shape: [[1, 1, 1, 1]], color: '#BDB2FF' }, { shape: [[1], [1], [1], [1]], color: '#BDB2FF' }, { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#FFC6FF' }, ];
    let gridState = [], currentScore = 0, currentPieces = [], isClearing = false;
    let draggedPiece = null, draggedPieceData = null;

    // --- Game Initialization ---
    function initGame() {
        currentScore = 0;
        scoreElement.textContent = '0';
        gridState = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        isClearing = false;
        gridElement.innerHTML = '';
        
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                // Add checkerboard classes
                const superRow = Math.floor(r / 3);
                const superCol = Math.floor(c / 3);
                if ((superRow + superCol) % 2 === 0) {
                    cell.classList.add('grid-group-a');
                } else {
                    cell.classList.add('grid-group-b');
                }
                gridElement.appendChild(cell);
            }
        }
        
        gameOverModal.classList.add('hidden');
        generateNewPieces();
        renderGrid();
        addGridEventListeners();
    }

    // --- Rendering ---
    function renderGrid() { for (let r = 0; r < GRID_SIZE; r++) { for (let c = 0; c < GRID_SIZE; c++) { const cell = gridElement.querySelector(`[data-row='${r}'][data-col='${c}']`); if (gridState[r][c]) { cell.style.backgroundColor = gridState[r][c]; cell.classList.add('filled'); } else { cell.style.backgroundColor = ''; cell.classList.remove('filled'); } } } }
    function generateNewPieces() { piecesContainer.innerHTML = ''; currentPieces = []; for (let i = 0; i < 3; i++) { const pieceData = PIECE_DEFINITIONS[Math.floor(Math.random() * PIECE_DEFINITIONS.length)]; currentPieces.push(pieceData); const pieceElement = createPieceElement(pieceData, i); piecesContainer.appendChild(pieceElement); } }
    function createPieceElement(pieceData, id) { const pieceElement = document.createElement('div'); pieceElement.classList.add('piece'); pieceElement.draggable = true; pieceElement.dataset.pieceId = id; const { shape, color } = pieceData; pieceElement.style.gridTemplateRows = `repeat(${shape.length}, 25px)`; pieceElement.style.gridTemplateColumns = `repeat(${shape[0].length}, 25px)`; shape.forEach(row => { row.forEach(cell => { const cellElement = document.createElement('div'); cellElement.classList.add('piece-cell'); if (cell) { cellElement.style.backgroundColor = color; cellElement.classList.add('filled'); } pieceElement.appendChild(cellElement); }); }); pieceElement.addEventListener('dragstart', handleDragStart); pieceElement.addEventListener('dragend', handleDragEnd); return pieceElement; }

    // --- Drag and Drop Logic ---
    function handleDragStart(e) { setTimeout(() => e.target.style.opacity = '0.5', 0); e.target.classList.add('grabbing'); const pieceId = e.target.dataset.pieceId; draggedPiece = e.target; draggedPieceData = currentPieces[pieceId]; }
    function handleDragEnd(e) { e.target.style.opacity = '1'; e.target.classList.remove('grabbing'); clearAllPreviews(); }
    
    function addGridEventListeners() {
        gridElement.addEventListener('dragover', handleDragOver);
        gridElement.addEventListener('dragleave', clearAllPreviews);
        gridElement.addEventListener('drop', handleDrop);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        if (!draggedPieceData || isClearing) return;
        
        const targetCell = e.target.closest('.cell');
        clearAllPreviews();
        
        if (!targetCell) return;
        const baseRow = parseInt(targetCell.dataset.row);
        const baseCol = parseInt(targetCell.dataset.col);
        
        if (canPlacePiece(baseRow, baseCol, draggedPieceData.shape)) {
            drawGhost(baseRow, baseCol, draggedPieceData.shape);
            const potentialClears = getPotentialClears(baseRow, baseCol, draggedPieceData.shape);
            if (potentialClears.size > 0) {
                highlightCells(potentialClears);
            }
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        if (!draggedPieceData || isClearing) return;
        clearAllPreviews();

        const targetCell = e.target.closest('.cell');
        if (!targetCell) return;
        
        const baseRow = parseInt(targetCell.dataset.row);
        const baseCol = parseInt(targetCell.dataset.col);

        if (canPlacePiece(baseRow, baseCol, draggedPieceData.shape)) {
            placePiece(baseRow, baseCol, draggedPieceData.shape, draggedPieceData.color);
            draggedPiece.remove();
            
            const pieceId = parseInt(draggedPiece.dataset.pieceId);
            currentPieces[pieceId] = null;
            draggedPieceData = null;

            if (currentPieces.every(p => p === null)) {
                generateNewPieces();
            }

            renderGrid();
            checkForClears();
        }
    }
    
    // --- Preview & Highlight Functions ---
    function drawGhost(baseRow, baseCol, shape) { shape.forEach((row, r) => { row.forEach((cellValue, c) => { if (cellValue) { const gridR = baseRow + r; const gridC = baseCol + c; const cell = gridElement.querySelector(`[data-row='${gridR}'][data-col='${gridC}']`); if (cell) cell.classList.add('ghost'); } }); }); }
    function highlightCells(coordsSet) { coordsSet.forEach(coord => { const [r, c] = coord.split('-'); const cell = gridElement.querySelector(`[data-row='${r}'][data-col='${c}']`); if (cell) cell.classList.add('highlight'); }); }
    function clearAllPreviews() { document.querySelectorAll('.ghost').forEach(c => c.classList.remove('ghost')); document.querySelectorAll('.highlight').forEach(c => c.classList.remove('highlight')); }

    // --- Core Game Logic ---
    function canPlacePiece(baseRow, baseCol, shape) { for (let r = 0; r < shape.length; r++) { for (let c = 0; c < shape[r].length; c++) { if (shape[r][c]) { const gridR = baseRow + r; const gridC = baseCol + c; if (gridR >= GRID_SIZE || gridC >= GRID_SIZE || gridState[gridR][gridC]) { return false; } } } } return true; }
    function placePiece(baseRow, baseCol, shape, color) { let cellsPlaced = 0; shape.forEach((row, r) => { row.forEach((cellValue, c) => { if (cellValue) { gridState[baseRow + r][baseCol + c] = color; cellsPlaced++; } }); }); updateScore(cellsPlaced); }

    function getPotentialClears(baseRow, baseCol, shape) {
        const tempGrid = gridState.map(row => [...row]);
        shape.forEach((row, r) => {
            row.forEach((cellValue, c) => {
                if (cellValue) {
                    tempGrid[baseRow + r][baseCol + c] = 'filled';
                }
            });
        });
        
        const cellsToHighlight = new Set();
        for (let i = 0; i < GRID_SIZE; i++) {
            if (tempGrid[i].every(cell => cell !== null)) {
                for (let c = 0; c < GRID_SIZE; c++) cellsToHighlight.add(`${i}-${c}`);
            }
            if (tempGrid.every(row => row[i] !== null)) {
                for (let r = 0; r < GRID_SIZE; r++) cellsToHighlight.add(`${r}-${i}`);
            }
        }
        for (let sqR = 0; sqR < 3; sqR++) {
            for (let sqC = 0; sqC < 3; sqC++) {
                let isFull = true;
                for (let r_off = 0; r_off < 3; r_off++) {
                    for (let c_off = 0; c_off < 3; c_off++) {
                        if (tempGrid[sqR * 3 + r_off][sqC * 3 + c_off] === null) isFull = false;
                    }
                }
                if (isFull) {
                    for (let r_off = 0; r_off < 3; r_off++) {
                        for (let c_off = 0; c_off < 3; c_off++) {
                            cellsToHighlight.add(`${sqR * 3 + r_off}-${sqC * 3 + c_off}`);
                        }
                    }
                }
            }
        }
        return cellsToHighlight;
    }

    function checkForClears() { let cellsToClear = new Set(); let linesCleared = 0; for (let r = 0; r < GRID_SIZE; r++) { if (gridState[r].every(cell => cell !== null)) { linesCleared++; for (let c = 0; c < GRID_SIZE; c++) cellsToClear.add(`${r}-${c}`); } } for (let c = 0; c < GRID_SIZE; c++) { if (gridState.every(row => row[c] !== null)) { linesCleared++; for (let r = 0; r < GRID_SIZE; r++) cellsToClear.add(`${r}-${c}`); } } for (let sqR = 0; sqR < 3; sqR++) { for (let sqC = 0; sqC < 3; sqC++) { let isFull = true; let squareCells = []; for (let r_off = 0; r_off < 3; r_off++) { for (let c_off = 0; c_off < 3; c_off++) { const r = sqR * 3 + r_off; const c = sqC * 3 + c_off; squareCells.push(`${r}-${c}`); if (gridState[r][c] === null) isFull = false; } } if (isFull) { linesCleared++; squareCells.forEach(cell => cellsToClear.add(cell)); } } } if (cellsToClear.size > 0) { isClearing = true; cellsToClear.forEach(coord => { const [r, c] = coord.split('-'); gridElement.querySelector(`[data-row='${r}'][data-col='${c}']`).classList.add('clearing'); }); updateScore(linesCleared * 18 * linesCleared); setTimeout(() => { cellsToClear.forEach(coord => { const [r, c] = coord.split('-'); gridState[r][c] = null; gridElement.querySelector(`[data-row='${r}'][data-col='${c}']`).classList.remove('clearing'); }); renderGrid(); isClearing = false; if (isGameOver()) { endGame(); } }, CLEAR_ANIMATION_DURATION); } else { if (isGameOver()) { endGame(); } } }
    function isGameOver() { const availablePieces = currentPieces.filter(p => p !== null); if (availablePieces.length === 0) return false; for (const piece of availablePieces) { for (let r = 0; r < GRID_SIZE; r++) { for (let c = 0; c < GRID_SIZE; c++) { if (canPlacePiece(r, c, piece.shape)) return false; } } } return true; }
    function updateScore(points) { currentScore += points; scoreElement.textContent = currentScore; }
    function endGame() { finalScoreElement.textContent = currentScore; gameOverModal.classList.remove('hidden'); }
    restartButton.addEventListener('click', initGame);

    // --- Start the game ---
    initGame();
});