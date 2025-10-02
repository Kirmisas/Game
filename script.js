document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gridElement = document.getElementById('game-grid');
    const piecesContainer = document.getElementById('pieces-container');
    const scoreElement = document.getElementById('score');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreElement = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');
    const themeToggleButton = document.getElementById('theme-toggle'); // NEW

    // --- Game Constants & State ---
    const GRID_SIZE = 9;
    const CLEAR_ANIMATION_DURATION = 400;
    // Removed the 3x3 square block
    const PIECE_DEFINITIONS = [ { shape: [[1]], color: '#FFADAD' }, { shape: [[1, 1]], color: '#FFD6A5' }, { shape: [[1], [1]], color: '#FFD6A5' }, { shape: [[1, 1, 1]], color: '#FDFFB6' }, { shape: [[1], [1], [1]], color: '#FDFFB6' }, { shape: [[1, 1], [1, 1]], color: '#CAFFBF' }, { shape: [[1, 1, 1], [1, 0, 0]], color: '#9BF6FF' }, { shape: [[1, 1], [0, 1], [0, 1]], color: '#9BF6FF' }, { shape: [[0, 1, 1], [1, 1, 0]], color: '#A0C4FF' }, { shape: [[1, 0], [1, 1], [0, 1]], color: '#A0C4FF' }, { shape: [[1, 1, 1, 1]], color: '#BDB2FF' }, { shape: [[1], [1], [1], [1]], color: '#BDB2FF' }, ];
    let gridState = [], currentScore = 0, currentPieces = [], isClearing = false, isDragging = false;

    // --- Drag & Touch State ---
    let draggedPieceData = null;
    let originalPieceElement = null;
    let draggingClone = null;
    let touchOffset = { x: 0, y: 0, row: 0, col: 0 };
    // NEW: Offset for lifted piece
    const LIFTED_OFFSET_X = -15; // pixels right of touch
    const LIFTED_OFFSET_Y = -15; // pixels below touch

    // --- Game Initialization ---
    function initGame() {
        currentScore = 0; scoreElement.textContent = '0';
        gridState = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        isClearing = false; gridElement.innerHTML = '';
        
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r; cell.dataset.col = c;
                const superRow = Math.floor(r / 3); const superCol = Math.floor(c / 3);
                cell.classList.add((superRow + superCol) % 2 === 0 ? 'grid-group-a' : 'grid-group-b');
                gridElement.appendChild(cell);
            }
        }
        gameOverModal.classList.add('hidden');
        generateNewPieces();
        renderGrid();
        applySavedTheme(); // NEW: Apply theme on init
    }

    // --- Theme Logic ---
    function applySavedTheme() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });

    // --- Rendering ---
    function renderGrid() { for (let r = 0; r < GRID_SIZE; r++) { for (let c = 0; c < GRID_SIZE; c++) { const cell = gridElement.querySelector(`[data-row='${r}'][data-col='${c}']`); if (gridState[r][c]) { cell.style.backgroundColor = gridState[r][c]; cell.classList.add('filled'); } else { cell.style.backgroundColor = ''; cell.classList.remove('filled'); } } } }
    function generateNewPieces() { piecesContainer.innerHTML = ''; currentPieces = []; for (let i = 0; i < 3; i++) { const pieceData = PIECE_DEFINITIONS[Math.floor(Math.random() * PIECE_DEFINITIONS.length)]; currentPieces.push(pieceData); const pieceElement = createPieceElement(pieceData, i); piecesContainer.appendChild(pieceElement); } }
    function createPieceElement(pieceData, id) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece');
        pieceElement.dataset.pieceId = id;
        const { shape, color } = pieceData;
        const cellSize = getComputedStyle(document.documentElement).getPropertyValue('--piece-cell-size');
        pieceElement.style.gridTemplateRows = `repeat(${shape.length}, ${cellSize})`;
        pieceElement.style.gridTemplateColumns = `repeat(${shape[0].length}, ${cellSize})`;
        shape.forEach(row => row.forEach(cell => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('piece-cell');
            if (cell) { cellElement.style.backgroundColor = color; cellElement.classList.add('filled'); }
            pieceElement.appendChild(cellElement);
        }));

        pieceElement.addEventListener('mousedown', handleDragStart);
        pieceElement.addEventListener('touchstart', handleDragStart, { passive: false });
        
        return pieceElement;
    }

    // --- Universal Drag Start (Mouse & Touch) ---
    function handleDragStart(e) {
        if (isClearing || isDragging) return;
        e.preventDefault();
        isDragging = true;
        
        originalPieceElement = e.currentTarget;
        const pieceId = parseInt(originalPieceElement.dataset.pieceId);
        draggedPieceData = currentPieces[pieceId];

        const rect = originalPieceElement.getBoundingClientRect();
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        
        // Calculate the touch/click offset within the piece
        const pieceCellSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--piece-cell-size'));
        touchOffset.x = clientX - rect.left;
        touchOffset.y = clientY - rect.top;
        touchOffset.col = Math.floor(touchOffset.x / pieceCellSize);
        touchOffset.row = Math.floor(touchOffset.y / pieceCellSize);
        
        // Create a visual clone for dragging
        draggingClone = originalPieceElement.cloneNode(true);
        draggingClone.classList.add('dragging-clone');
        document.body.appendChild(draggingClone);
        
        // Position the clone
        draggingClone.style.left = `${clientX - touchOffset.x + LIFTED_OFFSET_X}px`; // NEW: Added LIFTED_OFFSET_X
        draggingClone.style.top = `${clientY - touchOffset.y + LIFTED_OFFSET_Y}px`;  // NEW: Added LIFTED_OFFSET_Y
        
        originalPieceElement.style.opacity = '0.3';

        // Add move and end listeners
        if (e.type === 'mousedown') {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        } else {
            document.addEventListener('touchmove', handleDragMove, { passive: false });
            document.addEventListener('touchend', handleDragEnd);
        }
    }

    // --- Universal Drag Move (Mouse & Touch) ---
    function handleDragMove(e) {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        // Move the clone
        draggingClone.style.left = `${clientX - touchOffset.x + LIFTED_OFFSET_X}px`; // NEW: Added LIFTED_OFFSET_X
        draggingClone.style.top = `${clientY - touchOffset.y + LIFTED_OFFSET_Y}px`;  // NEW: Added LIFTED_OFFSET_Y

        clearAllPreviews();
        const targetCell = getCellFromPoint(clientX, clientY);
        
        if (targetCell) {
            const baseRow = parseInt(targetCell.dataset.row) - touchOffset.row;
            const baseCol = parseInt(targetCell.dataset.col) - touchOffset.col;
            
            if (canPlacePiece(baseRow, baseCol, draggedPieceData.shape)) {
                drawGhost(baseRow, baseCol, draggedPieceData.shape);
                const potentialClears = getPotentialClears(baseRow, baseCol, draggedPieceData.shape);
                if (potentialClears.size > 0) highlightCells(potentialClears);
            }
        }
    }

    // --- Universal Drag End (Mouse & Touch) ---
    function handleDragEnd(e) {
        if (!isDragging) return;
