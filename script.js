// ===== ДАННЫЕ =====
const SEATS_PER_TABLE = 9;

function emptyTable() {
    return {
        players: Array(SEATS_PER_TABLE).fill(0),
        names: Array(SEATS_PER_TABLE).fill('')
    };
}

let appData = {
    total: 0,
    tables: [emptyTable()],
    eliminated: []
};

let currentMultiplier = 500;
let currentOption = 2;
let deductTenPercent = false;
let currentTableIndex = 0;
let pendingSeat = null;
let gameMode = null;

let timer = {
    totalSeconds: 15 * 60,
    maxSeconds: 15 * 60,
    running: false,
    interval: null
};

let level = 1;
let mbScore = 100;
let bbScore = 100;
let anteScore = 0;

let menuExpanded = { theme: false, prize: true, auto: false, dist: false };

// ===== СТРУКТУРА ТУРНИРА =====
const structure = [
    { type: 'level', mb: 100,  bb: 100,   duration: 15 * 60 },
    { type: 'level', mb: 100,  bb: 200,   duration: 15 * 60 },
    { type: 'level', mb: 100,  bb: 300,   duration: 15 * 60 },
    { type: 'level', mb: 200,  bb: 400,   duration: 15 * 60 },
    { type: 'break', duration: 15 * 60 },

    { type: 'level', mb: 300,  bb: 600,   duration: 15 * 60 },
    { type: 'level', mb: 400,  bb: 800,   duration: 15 * 60 },
    { type: 'level', mb: 500,  bb: 1000,  duration: 15 * 60 },
    { type: 'level', mb: 800,  bb: 1600,  duration: 15 * 60 },
    { type: 'break', duration: 60 * 60 },

    { type: 'level', mb: 1000,   bb: 2000,   duration: 12 * 60 },
    { type: 'level', mb: 1200,   bb: 2400,   duration: 12 * 60 },
    { type: 'level', mb: 1400,   bb: 2800,   duration: 12 * 60 },
    { type: 'level', mb: 1600,   bb: 3200,   duration: 12 * 60 },
    { type: 'level', mb: 2000,   bb: 4000,   duration: 12 * 60 },
    { type: 'level', mb: 2500,   bb: 5000,   duration: 12 * 60 },
    { type: 'level', mb: 3000,   bb: 6000,   duration: 12 * 60 },
    { type: 'level', mb: 3500,   bb: 7000,   duration: 12 * 60 },
    { type: 'level', mb: 4000,   bb: 8000,   duration: 12 * 60 },
    { type: 'level', mb: 5000,   bb: 10000,  duration: 12 * 60 },
    { type: 'break', duration: 15 * 60 },

    { type: 'level', mb: 6000,   bb: 12000,  duration: 12 * 60 },
    { type: 'level', mb: 7000,   bb: 14000,  duration: 12 * 60 },
    { type: 'level', mb: 8000,   bb: 16000,  duration: 12 * 60 },
    { type: 'level', mb: 10000,  bb: 20000,  duration: 12 * 60 },
    { type: 'level', mb: 12000,  bb: 24000,  duration: 12 * 60 },
    { type: 'level', mb: 15000,  bb: 30000,  duration: 12 * 60 },
    { type: 'level', mb: 18000,  bb: 36000,  duration: 12 * 60 },
    { type: 'level', mb: 20000,  bb: 40000,  duration: 12 * 60 },

    { type: 'level', mb: 25000,  bb: 50000,   duration: 12 * 60 },
    { type: 'level', mb: 30000,  bb: 60000,   duration: 12 * 60 },
    { type: 'level', mb: 35000,  bb: 70000,   duration: 12 * 60 },
    { type: 'level', mb: 40000,  bb: 80000,   duration: 12 * 60 },
    { type: 'level', mb: 50000,  bb: 100000,  duration: 12 * 60 },
    { type: 'level', mb: 60000,  bb: 120000,  duration: 12 * 60 },
    { type: 'level', mb: 70000,  bb: 140000,  duration: 12 * 60 },
    { type: 'level', mb: 80000,  bb: 160000,  duration: 12 * 60 },
    { type: 'level', mb: 100000, bb: 200000,  duration: 12 * 60 },
    { type: 'level', mb: 120000, bb: 240000,  duration: 12 * 60 },
    { type: 'level', mb: 150000, bb: 300000,  duration: 12 * 60 },
    { type: 'level', mb: 200000, bb: 400000,  duration: 12 * 60 },
    { type: 'level', mb: 250000, bb: 500000,  duration: 12 * 60 },
    { type: 'level', mb: 300000, bb: 600000,  duration: 12 * 60 },

    { type: 'final', mb: 400000, bb: 800000 }
];

const GAME_MODES = {
    'tournament':      { label: 'Турнир',         ante: false, levels: true,  mb: 100, bb: 100 },
    'tournament-ante': { label: 'Турнир с анте',  ante: true,  levels: true,  mb: 100, bb: 100 },
    'cash':            { label: 'Кэш',            ante: false, levels: false, mb: 5,   bb: 10  }
};

const GAME_MODE_NAMES = {
    'tournament': 'Турнир',
    'tournament-ante': 'Турнир с анте',
    'cash': 'Кэш'
};

// ===== ТЕМЫ =====
function setTheme(name) {
    const themes = ['vegas', 'casino', 'cyber', 'sport', 'native', 'blue'];
    if (!themes.includes(name)) return;
    document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem('pokerTheme', name); } catch(e) {}
    updateThemeButtons();
}

function updateThemeButtons() {
    const current = document.documentElement.getAttribute('data-theme') || 'vegas';
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeName === current);
    });
}

(function restoreTheme() {
    try {
        const saved = localStorage.getItem('pokerTheme');
        if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch(e) {}
})();

// ===== ВСПОМОГАТЕЛЬНЫЕ =====
function getStructureItem(levelNumber) {
    return structure[levelNumber - 1] || null;
}

function getLevelDuration(levelNumber) {
    const item = getStructureItem(levelNumber);
    if (!item) return 15 * 60;
    if (item.type === 'final') return Infinity;
    return item.duration;
}

function isBreakLevel(levelNumber) {
    const item = getStructureItem(levelNumber);
    return item && item.type === 'break';
}

function isFinalLevel(levelNumber) {
    const item = getStructureItem(levelNumber);
    return item && item.type === 'final';
}

function getLevelNumber(index) {
    let n = 0;
    for (let i = 0; i < index && i < structure.length; i++) {
        if (structure[i].type !== 'break') n++;
    }
    return n;
}

function formatBlind(num) {
    if (num === undefined || num === null || num === '') return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ===== СТАРТ =====
window.onload = function() {
    loadData();
    renderTables();
    initializeMenuSections();
    updateAddRemoveButtons();
    checkBalance(true);
    updateThemeButtons();

    if (!gameMode) {
        document.getElementById('gameModeOverlay').classList.add('active');
        updateAllUI();
    } else {
        updateModeSwitchLabel();
        updateAllUI();
    }
};

function loadData() {
    try {
        const saved = localStorage.getItem('pokerTimerData');
        if (saved) {
            const d = JSON.parse(saved);
            if (d.appData) {
                appData = d.appData;

                appData.tables = (appData.tables || []).map(t => {
                    const players = (t.players || []).slice(0, SEATS_PER_TABLE);
                    const names = (t.names || []).slice(0, SEATS_PER_TABLE);
                    while (players.length < SEATS_PER_TABLE) players.push(0);
                    while (names.length < SEATS_PER_TABLE) names.push('');
                    return { players, names };
                });

                if (appData.tables.length < 1) {
                    appData.tables.push(emptyTable());
                }

                appData.eliminated = (appData.eliminated || []).map(e => {
                    if (typeof e === 'string') return { name: e, order: 0, tableNumber: 0 };
                    return {
                        name: e.name,
                        order: e.order || e.seatNumber || 0,
                        tableNumber: e.tableNumber || 0
                    };
                });
            }

            if (d.timer) {
                timer.totalSeconds = d.timer.totalSeconds ?? 15 * 60;
                timer.maxSeconds = d.timer.maxSeconds ?? 15 * 60;
            }
            timer.running = false;
            timer.interval = null;

            level = Math.min(Math.max(1, d.level || 1), structure.length);
            mbScore = d.mbScore || 100;
            bbScore = d.bbScore || 100;
            anteScore = d.anteScore || 0;

            currentMultiplier = d.currentMultiplier || 500;
            currentOption = d.currentOption || 2;
            deductTenPercent = d.deductTenPercent || false;
            menuExpanded = d.menuExpanded || menuExpanded;
            gameMode = d.gameMode || null;

            const cb = document.getElementById('deductTenPercent');
            if (cb) cb.checked = deductTenPercent;
        }
    } catch(e) { console.log('Load error', e); }
}

function saveData() {
    try {
        localStorage.setItem('pokerTimerData', JSON.stringify({
            appData,
            timer: {
                totalSeconds: timer.totalSeconds,
                maxSeconds: timer.maxSeconds
            },
            level, mbScore, bbScore, anteScore,
            currentMultiplier, currentOption, deductTenPercent, menuExpanded,
            gameMode
        }));
    } catch(e) {}
}

// ===== РЕЖИМ ИГРЫ =====
function selectGameMode(mode) {
    gameMode = mode;
    document.getElementById('gameModeOverlay').classList.remove('active');
    updateModeSwitchLabel();
    applyGameMode();
    updateAllUI();
    saveData();
}

function openGameModeSelector() {
    document.querySelectorAll('.gamemode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === gameMode);
    });
    document.getElementById('gameModeOverlay').classList.add('active');
}

function updateModeSwitchLabel() {
    const el = document.getElementById('modeSwitchLabel');
    if (el) el.textContent = GAME_MODE_NAMES[gameMode] || 'Игра';
}

function applyGameMode() {
    if (!gameMode) return;
    const cfg = GAME_MODES[gameMode];
    if (!cfg) return;

    if (!cfg.levels) {
        mbScore = cfg.mb;
        bbScore = cfg.bb;
        anteScore = 0;
        level = 1;
        timer.totalSeconds = 15 * 60;
        timer.maxSeconds = 15 * 60;
    } else {
        level = 1;
        const item = structure[0];
        mbScore = item.mb;
        bbScore = item.bb;
        anteScore = 0;
        timer.totalSeconds = item.duration;
        timer.maxSeconds = item.duration;
    }

    updateAnteDisplay();
    updateLevelDisplay();
    updateNextLevelOnly();
    updateTimerDisplay();
    updateProgressBar();
    updateTimerToBreak();
    updateBlindsVisibility();
}

function updateAnteDisplay() {
    const anteBox = document.getElementById('anteBox');
    const anteScoreEl = document.getElementById('anteScore');
    if (!anteBox || !anteScoreEl) return;

    const cfg = GAME_MODES[gameMode];
    if (!cfg) {
        anteBox.style.display = 'none';
        return;
    }

    if (cfg.ante && cfg.levels && getLevelNumber(level) >= 9 && !isBreakLevel(level)) {
        anteBox.style.display = 'flex';
        const anteValue = bbScore;
        anteScoreEl.textContent = '+АНТЕ ' + formatBlind(anteValue);
        anteScore = anteValue;
    } else {
        anteBox.style.display = 'none';
        anteScore = 0;
    }
}

// ===== СТОЛЫ =====
function addTable() {
    appData.tables.push(emptyTable());
    currentTableIndex = appData.tables.length - 1;
    renderTables();
    updateAddRemoveButtons();
    updateTableIndicator();
    updateAlbumPosition();
    saveData();
}

function removeTable() {
    if (appData.tables.length <= 1) return;

    const removedIndex = currentTableIndex;
    const table = appData.tables[removedIndex];

    const activeNames = table.names.filter(n =>
        n && !appData.eliminated.some(e => e.name === n)
    );

    if (activeNames.length > 0) {
        alert(`Нельзя удалить стол: в нём ${activeNames.length} активных игроков. Сначала выбейте их или перенесите в другой стол.`);
        return;
    }

    appData.tables.splice(removedIndex, 1);

    if (currentTableIndex >= appData.tables.length) {
        currentTableIndex = appData.tables.length - 1;
    }

    renderTables();
    updateAddRemoveButtons();
    updateTableIndicator();
    updateAlbumPosition();
    updateAllUI();
    saveData();
}

function updateAddRemoveButtons() {
    const remBtn = document.getElementById('removeTableBtn');
    if (!remBtn) return;
    if (appData.tables.length <= 1) {
        remBtn.disabled = true;
        remBtn.style.opacity = '0.4';
        remBtn.style.pointerEvents = 'none';
    } else {
        remBtn.disabled = false;
        remBtn.style.opacity = '1';
        remBtn.style.pointerEvents = 'auto';
    }
}

// ===== РЕНДЕР =====
function renderTables() {
    const track = document.getElementById('albumTrack');
    if (!track) return;

    const imbalanceInfo = getImbalanceInfo();
    track.innerHTML = '';

    appData.tables.forEach((table, ti) => {
        const slide = document.createElement('div');
        slide.className = 'table-slide';

        const card = document.createElement('div');
        card.className = 'table-card';
        card.dataset.tableCard = ti;
        if (imbalanceInfo.imbalanced && imbalanceInfo.overloadedTables.includes(ti)) {
            card.classList.add('imbalanced');
        }
        card.innerHTML = `<h3>Стол ${ti + 1}</h3>`;

        const grid = document.createElement('div');
        grid.className = 'buttons-grid';
        grid.dataset.table = ti;

        for (let si = 0; si < SEATS_PER_TABLE; si++) {
            grid.appendChild(createSeatButton(ti, si));
        }

        card.appendChild(grid);

        const sum = appData.tables[ti].players.reduce((a,b)=>a+b,0);
        const summary = document.createElement('div');
        summary.className = 'table-summary';
        summary.innerHTML = `<span>Входов:</span><span>${sum}</span>`;
        card.appendChild(summary);

        slide.appendChild(card);
        track.appendChild(slide);
    });

    updateAlbumPosition();
    updateTableIndicator();
}

function createSeatButton(ti, si) {
    const table = appData.tables[ti];
    const count = table.players[si];
    const name = table.names[si] || '';
    const isElim = name && appData.eliminated.some(e => e.name === name);

    const btn = document.createElement('button');
    btn.className = 'number-btn';
    btn.dataset.table = ti;
    btn.dataset.seat = si;

    if (name) btn.classList.add('has-name');
    if (isElim) btn.classList.add('eliminated');

    const displayName = name || (si + 1);

    const tableBadge = name
        ? `<span class="btn-table-badge">${ti + 1}</span>`
        : '';

    const minusBtn = (name && count >= 1 && !isElim)
        ? `<span class="btn-minus-count" data-table="${ti}" data-seat="${si}" title="Убрать один вход">−1</span>`
        : '';

    btn.innerHTML = `
        ${tableBadge}
        ${name ? `<span class="btn-delete" data-table="${ti}" data-seat="${si}" title="Выбить игрока">✕</span>` : ''}
        ${minusBtn}
        <div class="btn-number">${displayName}</div>
        <div class="btn-count">${count}</div>
    `;

    attachDragHandlers(btn, ti, si, name, isElim);

    btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) return;
        if (e.target.classList.contains('btn-minus-count')) return;
        if (justDragged) {
            justDragged = false;
            return;
        }
        handleSeatClick(ti, si);
    });

    const del = btn.querySelector('.btn-delete');
    if (del) {
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            eliminatePlayer(ti, si);
        });
    }

    const minus = btn.querySelector('.btn-minus-count');
    if (minus) {
        minus.addEventListener('click', (e) => {
            e.stopPropagation();
            decrementEntry(ti, si);
        });
    }

    return btn;
}

function updateSeatCount(ti, si) {
    const count = appData.tables[ti].players[si];
    const btn = document.querySelector(`.number-btn[data-table="${ti}"][data-seat="${si}"]`);
    if (!btn) return;
    const countEl = btn.querySelector('.btn-count');
    if (countEl) countEl.textContent = count;

    const minus = btn.querySelector('.btn-minus-count');
    if (!minus && count >= 1) {
        renderTables();
    }
}

function decrementEntry(ti, si) {
    const table = appData.tables[ti];
    if (table.players[si] > 1) {
        table.players[si]--;
        appData.total = Math.max(0, appData.total - 1);
        updateSeatCount(ti, si);
        updateTotal();
        updatePrizePool();
        saveData();
    }
}

// ===== ПЕРЕТАСКИВАНИЕ =====
let dragState = null;
let pressState = null;
let autoScrollTimer = null;
let justDragged = false;

const MOVE_THRESHOLD_MOUSE = 6;
const MOVE_THRESHOLD_TOUCH = 10;
const EDGE_ZONE = 60;
const AUTO_SCROLL_INTERVAL = 350;

function attachDragHandlers(btn, ti, si, name, isElim) {
    if (!name || isElim) return;

    btn.style.cursor = 'grab';

    btn.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('btn-delete')) return;
        if (e.target.classList.contains('btn-minus-count')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        pressState = {
            btn, ti, si, name,
            startX: e.clientX,
            startY: e.clientY,
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            isDragging: false
        };

        try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    });

    btn.addEventListener('pointermove', (e) => {
        if (!pressState) return;
        if (e.pointerId !== pressState.pointerId) return;

        if (!pressState.isDragging) {
            const dx = Math.abs(e.clientX - pressState.startX);
            const dy = Math.abs(e.clientY - pressState.startY);
            const threshold = pressState.pointerType === 'touch'
                ? MOVE_THRESHOLD_TOUCH
                : MOVE_THRESHOLD_MOUSE;

            if (dx > threshold || dy > threshold) beginDrag(e);
            return;
        }

        e.preventDefault();
        positionGhost(e.clientX, e.clientY);
        highlightTargetUnder(e.clientX, e.clientY);
        handleEdgeAutoScroll(e.clientX);
    });

    btn.addEventListener('pointerup', (e) => {
        if (e.pointerId !== pressState?.pointerId) return;
        finishDrag(e);
    });

    btn.addEventListener('pointercancel', (e) => {
        if (e.pointerId !== pressState?.pointerId) return;
        finishDrag(e);
    });

    btn.addEventListener('contextmenu', (e) => {
        if (pressState?.isDragging) e.preventDefault();
    });
}

function beginDrag(e) {
    if (!pressState) return;
    pressState.isDragging = true;

    const { btn, ti, si, name } = pressState;

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = name;
    document.body.appendChild(ghost);

    dragState = {
        ti, si,
        ghost,
        sourceEl: btn,
        targetEl: null,
        pointerId: e.pointerId,
        pointerType: pressState.pointerType
    };

    btn.classList.add('dragging');
    positionGhost(e.clientX, e.clientY);

    document.querySelectorAll('.album-prev, .album-next').forEach(el => {
        el.classList.add('drag-scroll-active');
    });

    if (pressState.pointerType === 'touch') {
        document.body.classList.add('touch-drag-active');
    }

    window.addEventListener('wheel', onDragWheel, { passive: false });
    if (navigator.vibrate) navigator.vibrate(15);
}

function positionGhost(x, y) {
    if (!dragState) return;
    dragState.ghost.style.left = x + 'px';
    dragState.ghost.style.top = y + 'px';
}

function highlightTargetUnder(x, y) {
    if (!dragState) return;

    const ghost = dragState.ghost;
    const prevDisplay = ghost.style.display;
    ghost.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    ghost.style.display = prevDisplay;

    const targetBtn = el ? el.closest('.number-btn') : null;

    if (dragState.targetEl && dragState.targetEl !== targetBtn) {
        dragState.targetEl.classList.remove('drag-over');
        const oldCard = dragState.targetEl.closest('.table-card');
        if (oldCard) oldCard.classList.remove('drag-target');
    }

    if (targetBtn && targetBtn !== dragState.sourceEl) {
        targetBtn.classList.add('drag-over');
        dragState.targetEl = targetBtn;
        const card = targetBtn.closest('.table-card');
        if (card) card.classList.add('drag-target');
    } else {
        dragState.targetEl = null;
    }
}

function handleEdgeAutoScroll(clientX) {
    if (!dragState) return;

    const w = window.innerWidth;
    const prevBtn = document.querySelector('.album-prev');
    const nextBtn = document.querySelector('.album-next');

    let zone = null;

    if (prevBtn && currentTableIndex > 0) {
        const r = prevBtn.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right) zone = 'prev';
    }
    if (!zone && nextBtn && currentTableIndex < appData.tables.length - 1) {
        const r = nextBtn.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right) zone = 'next';
    }
    if (!zone && clientX < EDGE_ZONE && currentTableIndex > 0) zone = 'prev';
    if (!zone && clientX > w - EDGE_ZONE && currentTableIndex < appData.tables.length - 1) zone = 'next';

    if (prevBtn) prevBtn.classList.toggle('drag-scroll-hover', zone === 'prev');
    if (nextBtn) nextBtn.classList.toggle('drag-scroll-hover', zone === 'next');

    if (zone) {
        if (autoScrollTimer && autoScrollTimer._zone === zone) return;
        if (autoScrollTimer) clearInterval(autoScrollTimer);

        const step = () => {
            if (zone === 'prev' && currentTableIndex > 0) {
                currentTableIndex--;
                updateAlbumPosition();
                updateTableIndicator();
            } else if (zone === 'next' && currentTableIndex < appData.tables.length - 1) {
                currentTableIndex++;
                updateAlbumPosition();
                updateTableIndicator();
            }
        };
        step();
        autoScrollTimer = setInterval(step, AUTO_SCROLL_INTERVAL);
        autoScrollTimer._zone = zone;
    } else {
        if (autoScrollTimer) {
            clearInterval(autoScrollTimer);
            autoScrollTimer = null;
        }
    }
}

function onDragWheel(e) {
    if (!dragState) return;
    e.preventDefault();
    if (e.deltaY > 0 && currentTableIndex < appData.tables.length - 1) {
        currentTableIndex++;
        updateAlbumPosition();
        updateTableIndicator();
    } else if (e.deltaY < 0 && currentTableIndex > 0) {
        currentTableIndex--;
        updateAlbumPosition();
        updateTableIndicator();
    }
}

function finishDrag(e) {
    if (!pressState) return;
    if (!pressState.isDragging) {
        pressState = null;
        return;
    }
    if (!dragState) { pressState = null; return; }

    const targetBtn = dragState.targetEl;
    const srcEl = dragState.sourceEl;
    const srcTi = dragState.ti;
    const srcSi = dragState.si;

    if (srcEl) {
        try { srcEl.releasePointerCapture(pressState.pointerId); } catch (err) {}
    }

    document.querySelectorAll('.number-btn.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.table-card.drag-target').forEach(el => el.classList.remove('drag-target'));
    if (dragState.ghost && dragState.ghost.parentNode) {
        dragState.ghost.parentNode.removeChild(dragState.ghost);
    }
    if (srcEl) srcEl.classList.remove('dragging');

    document.querySelectorAll('.album-arrow.drag-scroll-active, .album-arrow.drag-scroll-hover')
        .forEach(el => el.classList.remove('drag-scroll-active', 'drag-scroll-hover'));

    window.removeEventListener('wheel', onDragWheel);
    document.body.classList.remove('touch-drag-active');

    if (autoScrollTimer) {
        clearInterval(autoScrollTimer);
        autoScrollTimer = null;
    }

    dragState = null;
    pressState = null;

    if (targetBtn) {
        const targetTi = +targetBtn.dataset.table;
        const targetSi = +targetBtn.dataset.seat;
        if (!(srcTi === targetTi && srcSi === targetSi)) {
            performMove(srcTi, srcSi, targetTi, targetSi);
        }
    }

    justDragged = true;
    setTimeout(() => { justDragged = false; }, 300);
}

function performMove(srcTi, srcSi, targetTi, targetSi) {
    const srcTable = appData.tables[srcTi];
    const tgtTable = appData.tables[targetTi];

    const srcName = srcTable.names[srcSi];
    const srcCount = srcTable.players[srcSi];
    const tgtName = tgtTable.names[targetSi];
    const tgtCount = tgtTable.players[targetSi];

    if (tgtName) {
        srcTable.names[srcSi] = tgtName;
        srcTable.players[srcSi] = tgtCount;
        tgtTable.names[targetSi] = srcName;
        tgtTable.players[targetSi] = srcCount;
    } else {
        tgtTable.names[targetSi] = srcName;
        tgtTable.players[targetSi] = srcCount;
        srcTable.names[srcSi] = '';
        srcTable.players[srcSi] = 0;
    }

    renderTables();
    updateAllUI();
    saveData();
}

// ===== КЛИК =====
function handleSeatClick(ti, si) {
    const table = appData.tables[ti];
    const name = table.names[si];

    if (!name) {
        pendingSeat = { tableIndex: ti, seatIndex: si };
        const modal = document.getElementById('nameModal');
        const input = document.getElementById('playerNameInput');
        const err = document.getElementById('nameError');
        input.value = '';
        input.classList.remove('error');
        err.style.display = 'none';
        modal.classList.add('active');
        setTimeout(() => input.focus(), 100);
        return;
    }

    const isElim = appData.eliminated.some(e => e.name === name);
    if (isElim) return;

    table.players[si]++;
    appData.total++;

    updateSeatCount(ti, si);
    updateTotal();
    updatePrizePool();

    saveData();
}

function confirmPlayerName() {
    const name = document.getElementById('playerNameInput').value.trim();
    const err = document.getElementById('nameError');
    const input = document.getElementById('playerNameInput');

    if (!name) { closeNameModal(); return; }

    if (isNameTaken(name)) {
        err.textContent = `Имя "${name}" уже занято другим игроком.`;
        err.style.display = 'block';
        input.classList.add('error');
        return;
    }

    if (pendingSeat) {
        const { tableIndex, seatIndex } = pendingSeat;
        appData.tables[tableIndex].names[seatIndex] = name;
        appData.tables[tableIndex].players[seatIndex] = 1;
        appData.total++;
        renderTables();
        updateAllUI();
        saveData();
        checkBalance();
    }
    closeNameModal();
}

function isNameTaken(name) {
    const lower = name.toLowerCase();
    for (const t of appData.tables) {
        for (const n of t.names) {
            if (n && n.toLowerCase() === lower) return true;
        }
    }
    for (const e of appData.eliminated) {
        if (e.name && e.name.toLowerCase() === lower) return true;
    }
    return false;
}

function closeNameModal() {
    document.getElementById('nameModal').classList.remove('active');
    const err = document.getElementById('nameError');
    const input = document.getElementById('playerNameInput');
    if (err) err.style.display = 'none';
    if (input) input.classList.remove('error');
    pendingSeat = null;
}

// ===== ВЫБИВАНИЕ =====
function eliminatePlayer(ti, si) {
    const table = appData.tables[ti];
    const name = table.names[si];
    if (!name) return;

    if (!appData.eliminated.some(e => e.name === name)) {
        const totalUnique = countAllUniquePlayers();
        const eliminatedSoFar = appData.eliminated.length;
        const order = Math.max(1, totalUnique - eliminatedSoFar);

        appData.eliminated.push({
            name,
            order: order,
            tableNumber: ti + 1
        });
    }

    renderTables();
    updateAllUI();
    saveData();
    checkBalance();
}

function countAllUniquePlayers() {
    const set = new Set();
    for (const t of appData.tables) {
        for (const n of t.names) {
            if (n) set.add(n.toLowerCase());
        }
    }
    for (const e of appData.eliminated) {
        if (e.name) set.add(e.name.toLowerCase());
    }
    return set.size;
}

// ===== ДИСБАЛАНС =====
function getActiveCounts() {
    return appData.tables.map(t =>
        t.names.filter(n => n && !appData.eliminated.some(e => e.name === n)).length
    );
}

function getImbalanceInfo() {
    const counts = getActiveCounts();
    if (counts.length === 0) {
        return { counts, diff: 0, imbalanced: false, overloadedTables: [] };
    }
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const diff = max - min;
    const imbalanced = diff >= 2;

    const overloadedTables = [];
    if (imbalanced) {
        counts.forEach((c, i) => { if (c === max) overloadedTables.push(i); });
    }
    return { counts, diff, imbalanced, overloadedTables };
}

function checkBalance(silent = false) {
    const info = getImbalanceInfo();
    renderTables();
    const overlay = document.getElementById('imbalanceOverlay');
    if (info.imbalanced) {
        stopTimer();
        const parts = info.counts.map((c, i) => `Стол ${i + 1}: ${c}`).join(', ');
        document.getElementById('balanceText').textContent = `${parts}. Разница ${info.diff}.`;
        if (!silent && overlay) overlay.classList.add('active');
    } else {
        if (overlay) overlay.classList.remove('active');
    }
}

function closeBalanceOverlay() {
    const overlay = document.getElementById('imbalanceOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ===== АЛЬБОМ =====
function updateAlbumPosition() {
    const track = document.getElementById('albumTrack');
    if (track) track.style.transform = `translateX(-${currentTableIndex * 100}%)`;
}
function nextTable() {
    if (currentTableIndex < appData.tables.length - 1) {
        currentTableIndex++;
        updateAlbumPosition();
        updateTableIndicator();
    }
}
function prevTable() {
    if (currentTableIndex > 0) {
        currentTableIndex--;
        updateAlbumPosition();
        updateTableIndicator();
    }
}
function updateTableIndicator() {
    const el = document.getElementById('tableIndicator');
    if (el) el.textContent = `Стол ${currentTableIndex + 1} / ${appData.tables.length}`;
}

// ===== ТАЙМЕР =====
function startTimer() {
    if (timer.running) return;

    if (gameMode !== 'cash' && isFinalLevel(level)) return;

    const info = getImbalanceInfo();
    if (info.imbalanced) { checkBalance(); return; }

    timer.running = true;
    const layout = document.querySelector('.main-layout');
    if (layout) layout.classList.add('focus-timer');

    timer.interval = setInterval(() => {
        if (timer.totalSeconds > 0) {
            timer.totalSeconds--;
            updateTimerDisplay();
            updateTimerToBreak();
            saveData();
        } else {
            nextLevel();
        }
    }, 1000);

    saveData();
}

function stopTimer() {
    timer.running = false;
    clearInterval(timer.interval);
    timer.interval = null;
    const layout = document.querySelector('.main-layout');
    if (layout) layout.classList.remove('focus-timer');
    saveData();
}

function skipLevel() {
    const cfg = GAME_MODES[gameMode];
    if (cfg && cfg.levels === false) return;

    const wasRunning = timer.running;
    stopTimer();
    nextLevel();
    if (wasRunning) startTimer();
}

function nextLevel() {
    const cfg = GAME_MODES[gameMode];
    if (cfg && cfg.levels === false) {
        timer.totalSeconds = timer.maxSeconds;
        updateTimerDisplay();
        saveData();
        return;
    }

    if (level >= structure.length) {
        stopTimer();
        return;
    }

    level++;
    updateBlinds();

    const duration = getLevelDuration(level);
    if (duration === Infinity) {
        timer.totalSeconds = 0;
        timer.maxSeconds = 0;
        stopTimer();
    } else {
        timer.totalSeconds = duration;
        timer.maxSeconds = duration;
    }

    updateTimerDisplay();
    updateNextLevelOnly();
    updateAnteDisplay();
    updateLevelDisplay();
    updateBlindsVisibility();
    updateTimerToBreak();
    updateAllUI();
    saveData();
}

function prevLevel() {
    const cfg = GAME_MODES[gameMode];
    if (cfg && cfg.levels === false) return;

    if (level > 1) {
        const wasRunning = timer.running;
        if (wasRunning) stopTimer();

        level--;
        updateBlinds();

        const duration = getLevelDuration(level);
        if (duration === Infinity) {
            timer.totalSeconds = 0;
            timer.maxSeconds = 0;
        } else {
            timer.totalSeconds = duration;
            timer.maxSeconds = duration;
        }

        updateTimerDisplay();
        updateNextLevelOnly();
        updateAnteDisplay();
        updateLevelDisplay();
        updateBlindsVisibility();
        updateTimerToBreak();
        updateAllUI();
        saveData();

        if (wasRunning) startTimer();
    }
}

function updateBlinds() {
    const item = getStructureItem(level);
    if (!item) return;
    if (item.type === 'level' || item.type === 'final') {
        mbScore = item.mb;
        bbScore = item.bb;
    }
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (!display) return;

    if (gameMode !== 'cash' && isFinalLevel(level)) {
        display.textContent = '—';
        display.classList.remove('blinking', 'danger');
        display.style.color = '';
        updateProgressBar();
        return;
    }

    const m = Math.floor(timer.totalSeconds / 60);
    const s = timer.totalSeconds % 60;
    display.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

    // Красный цвет — последние 59 секунд
    if (timer.totalSeconds <= 59 && timer.running) {
        display.classList.add('danger');
    } else {
        display.classList.remove('danger');
    }
    updateProgressBar();
}

function updateProgressBar() {
    const circle = document.querySelector('.progress-ring-circle');
    if (!circle) return;

    if (gameMode !== 'cash' && isFinalLevel(level)) {
        circle.style.strokeDashoffset = 0;
        circle.style.stroke = 'var(--accent-secondary)';
        return;
    }

    const r = circle.r.baseVal.value;
    const circ = 2 * Math.PI * r;
    const progress = timer.maxSeconds > 0 ? timer.totalSeconds / timer.maxSeconds : 0;
    circle.style.strokeDashoffset = circ * (1 - progress);

    // При последних 59 сек меняем цвет кольца на красный, иначе — на var
    if (timer.totalSeconds <= 59 && timer.running) {
        circle.style.stroke = 'var(--accent-danger)';
    } else {
        circle.style.stroke = 'var(--timer-progress)';
    }
}

// ===== СЛЕДУЮЩИЙ УРОВЕНЬ =====
function updateNextLevelOnly() {
    const el = document.getElementById('nextLevelOnly');
    if (!el) return;
    const cfg = GAME_MODES[gameMode];
    if (cfg && cfg.levels === false) {
        el.textContent = 'Кэш-игра';
        return;
    }

    const next = structure[level];

    if (!next) {
        el.textContent = '—';
        return;
    }

    if (next.type === 'break') {
        const mins = Math.round(next.duration / 60);
        el.textContent = `Следующий: ПЕРЕРЫВ (${mins} мин)`;
    } else {
        const nextLevelNum = getLevelNumber(level) + 1;
        el.textContent = `Следующий: Уровень ${nextLevelNum} — ${formatBlind(next.mb)} / ${formatBlind(next.bb)}`;
    }
}

// ===== ТАЙМЕР ДО ПЕРЕРЫВА =====
function updateTimerToBreak() {
    const el = document.getElementById('timerToBreak');
    if (!el) return;

    const cfg = GAME_MODES[gameMode];

    if (!cfg || !cfg.levels) {
        el.textContent = '';
        return;
    }

    if (isBreakLevel(level)) {
        const m = Math.ceil(timer.totalSeconds / 60);
        el.textContent = `До конца перерыва: ${m} мин`;
        return;
    }

    if (isFinalLevel(level)) {
        el.textContent = '';
        return;
    }

    let secondsLeft = timer.totalSeconds;
    let found = false;

    for (let i = level; i < structure.length; i++) {
        const it = structure[i];
        if (it.type === 'break') {
            found = true;
            break;
        }
        if (it.type === 'level') {
            secondsLeft += it.duration;
        }
        if (it.type === 'final') break;
    }

    if (!found) {
        el.textContent = '';
        return;
    }

    const mins = Math.ceil(secondsLeft / 60);
    el.textContent = `До перерыва: ${mins} мин`;
}

// ===== ВИДИМОСТЬ БЛАЙНДОВ =====
function updateBlindsVisibility() {
    const blindsRow = document.getElementById('blindsRow');
    const breakDisplay = document.getElementById('breakDisplay');
    const cfg = GAME_MODES[gameMode];

    if (!blindsRow || !breakDisplay) return;

    if (cfg && cfg.levels && isBreakLevel(level)) {
        blindsRow.classList.add('hidden');
        breakDisplay.style.display = 'block';
    } else {
        blindsRow.classList.remove('hidden');
        breakDisplay.style.display = 'none';
    }
}

// ===== UI =====
function updateAllUI() {
    updateTimerDisplay();
    updateLevelDisplay();
    updateNextLevelOnly();
    updateAnteDisplay();
    updateBlindsVisibility();
    updateTimerToBreak();
    updatePrizePool();
    updateEliminatedList();
    updateTotal();

    const mbEl = document.getElementById('mbScore');
    const bbEl = document.getElementById('bbScore');
    if (mbEl) mbEl.textContent = formatBlind(mbScore);
    if (bbEl) bbEl.textContent = formatBlind(bbScore);
}

function updateLevelDisplay() {
    const el = document.getElementById('levelDisplay');
    if (!el) return;
    const cfg = GAME_MODES[gameMode];
    if (cfg && cfg.levels === false) {
        el.textContent = 'Кэш';
        return;
    }

    const item = getStructureItem(level);
    if (!item) {
        el.textContent = `Уровень ${getLevelNumber(level)}`;
        return;
    }
    if (item.type === 'break') {
        el.textContent = 'ПЕРЕРЫВ';
    } else {
        el.textContent = `Уровень ${getLevelNumber(level)}`;
    }
}

function updateTotal() {
    const el = document.getElementById('total');
    if (el) el.textContent = appData.total;
}

function updatePrizePool() {
    const totalClicks = appData.total;
    const totalAmount = totalClicks * currentMultiplier;
    const deduct = Math.round(totalAmount * 0.1);

    let display = totalAmount;
    if (deductTenPercent) display = totalAmount - deduct;

    const lt = document.getElementById('prizeTotal');
    if (lt) lt.textContent = formatNumber(display);

    const st = document.getElementById('prizeTotalSide');
    if (st) st.textContent = formatNumber(display);

    const sdr = document.getElementById('prizeDeductSide');
    const sdv = document.getElementById('prizeDeductSideVal');
    if (deductTenPercent) {
        sdr.style.display = 'flex';
        sdv.textContent = formatNumber(deduct);
    } else {
        sdr.style.display = 'none';
    }

    const parts = calculateParts(display, currentOption);
    const container = document.getElementById('prizeParts');
    if (!container) return;
    container.innerHTML = '';
    parts.forEach((p, i) => {
        const place = ['🥇 1 место', '🥈 2 место', '🥉 3 место', '🎖️ 4 место'][i] || `${i+1} место`;
        const div = document.createElement('div');
        div.className = 'prizepool-part';
        div.innerHTML = `<span class="part-name">${place} (${p.percentage}%)</span><span class="part-value">${formatNumber(p.amount)}</span>`;
        container.appendChild(div);
    });
}

function calculateParts(total, option) {
    switch(option) {
        case 2: return [
            { percentage: 65, amount: Math.round(total * 0.65) },
            { percentage: 35, amount: Math.round(total * 0.35) }
        ];
        case 3: return [
            { percentage: 50, amount: Math.round(total * 0.5) },
            { percentage: 30, amount: Math.round(total * 0.3) },
            { percentage: 20, amount: Math.round(total * 0.2) }
        ];
        case 4: return [
            { percentage: 40, amount: Math.round(total * 0.4) },
            { percentage: 30, amount: Math.round(total * 0.3) },
            { percentage: 20, amount: Math.round(total * 0.2) },
            { percentage: 10, amount: Math.round(total * 0.1) }
        ];
        default: return [];
    }
}

function updateEliminatedList() {
    const list = document.getElementById('eliminatedList');
    if (!list) return;
    list.innerHTML = '';
    if (appData.eliminated.length === 0) {
        list.innerHTML = '<div class="eliminated-empty">Пока никого</div>';
        return;
    }
    const sorted = [...appData.eliminated].sort((a, b) => a.order - b.order);
    sorted.forEach(e => {
        const div = document.createElement('div');
        div.className = 'eliminated-item';
        div.innerHTML =
            `<span class="elim-num">#${e.order}</span>` +
            `<span>${e.name}</span>` +
            (e.tableNumber ? `<span class="elim-table">Стол ${e.tableNumber}</span>` : '');
        list.appendChild(div);
    });
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ===== МЕНЮ =====
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    updatePrizePool();
}

function initializeMenuSections() {
    Object.keys(menuExpanded).forEach(sec => {
        const el = document.getElementById(sec + 'Section');
        if (!el) return;
        const arrow = el.parentElement.querySelector('.toggle-arrow');
        if (menuExpanded[sec]) {
            el.classList.add('expanded');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        }
    });
    document.querySelectorAll('.multiplier-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(currentMultiplier)) btn.classList.add('active');
    });
    document.querySelectorAll('.option-btn').forEach((btn, i) => {
        btn.classList.remove('active');
        if (i === currentOption - 2) btn.classList.add('active');
    });
}

function toggleSection(id) {
    const el = document.getElementById(id + 'Section');
    if (!el) return;
    const arrow = el.parentElement.querySelector('.toggle-arrow');
    if (el.classList.contains('expanded')) {
        el.classList.remove('expanded');
        if (arrow) arrow.style.transform = 'rotate(0)';
        menuExpanded[id] = false;
    } else {
        el.classList.add('expanded');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        menuExpanded[id] = true;
    }
    saveData();
}

function selectMultiplier(m) {
    currentMultiplier = m;
    document.querySelectorAll('.multiplier-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    document.getElementById('customMultiplier').value = '';
    updatePrizePool();
    saveData();
}

function applyCustomMultiplier() {
    const v = parseInt(document.getElementById('customMultiplier').value);
    if (v > 0) {
        currentMultiplier = v;
        document.querySelectorAll('.multiplier-btn').forEach(b => b.classList.remove('active'));
        updatePrizePool();
        saveData();
    } else alert('Введите число');
}

function toggleDeductTenPercent() {
    deductTenPercent = document.getElementById('deductTenPercent').checked;
    updatePrizePool();
    saveData();
}

function selectOption(opt) {
    currentOption = opt;
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.closest('.option-btn').classList.add('active');
    }
    updatePrizePool();
    saveData();
}

// ===== СБРОС =====
function resetAll() {
    stopTimer();
    document.querySelector('.main-layout')?.classList.remove('focus-timer');

    appData = {
        total: 0,
        tables: [emptyTable()],
        eliminated: []
    };
    currentMultiplier = 500;
    currentOption = 2;
    deductTenPercent = false;
    currentTableIndex = 0;
    timer = { totalSeconds: 15 * 60, maxSeconds: 15 * 60, running: false, interval: null };

    const cb = document.getElementById('deductTenPercent');
    if (cb) cb.checked = false;

    const custom = document.getElementById('customMultiplier');
    if (custom) custom.value = '';

    menuExpanded = { theme: false, prize: true, auto: false, dist: false };
    closeBalanceOverlay();

    if (gameMode) {
        applyGameMode();
    } else {
        level = 1;
        mbScore = 100;
        bbScore = 100;
        anteScore = 0;
        updateAnteDisplay();
        updateLevelDisplay();
        updateNextLevelOnly();
        updateTimerDisplay();
        updateProgressBar();
        updateTimerToBreak();
        updateBlindsVisibility();
    }

    renderTables();
    updateAddRemoveButtons();
    updateAllUI();
    initializeMenuSections();
    saveData();
}

document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('nameModal').classList.contains('active')) {
        confirmPlayerName();
    }
    if (e.key === 'Escape') {
        closeNameModal();
        document.getElementById('gameModeOverlay').classList.remove('active');
    }
});

setInterval(saveData, 5000);
window.addEventListener('beforeunload', saveData);