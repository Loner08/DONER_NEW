// ===== ДАННЫЕ =====
const SEATS_PER_TABLE = 9;
const MAX_TABLES = 4;

function emptyTable() {
    return {
        players: Array(SEATS_PER_TABLE).fill(0),
        names: Array(SEATS_PER_TABLE).fill('')
    };
}

let appData = {
    total: 0,
    tables: [emptyTable(), emptyTable()],
    eliminated: []
};

let currentMultiplier = 150;
let currentOption = 2;
let deductTenPercent = false;
let currentTableIndex = 0;
let pendingSeat = null;

let timer = {
    totalSeconds: 10 * 60,
    maxSeconds: 10 * 60,
    running: false,
    interval: null
};

let level = 1;
let mbScore = 100;
let bbScore = 200;

let menuExpanded = { prize: true, auto: false, dist: false };

const blindSequence = [
    100, 200, 300, 400, 500, 600, 700, 800,
    1000, 1200, 1400, 1600, 1800, 2000,
    2500, 3500, 4000, 4500, 5000,
    6000, 7000, 8000, 10000, 12000, 14000, 16000, 18000, 20000,
    25000, 30000, 35000, 40000
];

// ===== СТАРТ =====
window.onload = function() {
    loadData();
    renderTables();
    updateAllUI();
    initializeMenuSections();
    updateAddTableButton();
    checkBalance(true);
};

function loadData() {
    try {
        const saved = localStorage.getItem('pokerTimerData');
        if (saved) {
            const d = JSON.parse(saved);
            if (d.appData) {
                appData = d.appData;

                // Миграция: если в столах не 9 мест — дополняем/обрезаем
                appData.tables = (appData.tables || []).map(t => {
                    const players = (t.players || []).slice(0, SEATS_PER_TABLE);
                    const names = (t.names || []).slice(0, SEATS_PER_TABLE);
                    while (players.length < SEATS_PER_TABLE) players.push(0);
                    while (names.length < SEATS_PER_TABLE) names.push('');
                    return { players, names };
                });

                if (appData.tables.length < 2) {
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
                appData.eliminated.forEach((e, i) => { e.order = i + 1; });
            }
            if (d.timer) {
                timer.totalSeconds = d.timer.totalSeconds ?? 600;
                timer.maxSeconds = d.timer.maxSeconds ?? 600;
            }
            level = d.level || 1;
            mbScore = d.mbScore || 100;
            bbScore = d.bbScore || 200;
            currentMultiplier = d.currentMultiplier || 150;
            currentOption = d.currentOption || 2;
            deductTenPercent = d.deductTenPercent || false;
            menuExpanded = d.menuExpanded || menuExpanded;

            const cb = document.getElementById('deductTenPercent');
            if (cb) cb.checked = deductTenPercent;
        }
    } catch(e) { console.log('Load error', e); }
}

function saveData() {
    try {
        localStorage.setItem('pokerTimerData', JSON.stringify({
            appData,
            timer: { totalSeconds: timer.totalSeconds, maxSeconds: timer.maxSeconds },
            level, mbScore, bbScore,
            currentMultiplier, currentOption, deductTenPercent, menuExpanded
        }));
    } catch(e) {}
}

// ===== ДОБАВИТЬ СТОЛ =====
function addTable() {
    if (appData.tables.length >= MAX_TABLES) return;
    appData.tables.push(emptyTable());
    currentTableIndex = appData.tables.length - 1;
    renderTables();
    updateAddTableButton();
    updateTableIndicator();
    updateAlbumPosition();
    saveData();
}

function updateAddTableButton() {
    const btn = document.getElementById('addTableBtn');
    if (!btn) return;
    if (appData.tables.length >= MAX_TABLES) {
        btn.disabled = true;
        btn.style.display = 'none';
    } else {
        btn.disabled = false;
        btn.style.display = 'flex';
    }
}

// ===== РЕНДЕР СТОЛОВ =====
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

    btn.innerHTML = `
        ${tableBadge}
        ${name ? `<span class="btn-delete" data-table="${ti}" data-seat="${si}" title="Выбить игрока">✕</span>` : ''}
        <div class="btn-number">${displayName}</div>
        <div class="btn-count">${count}</div>
    `;

    // Перетаскивание
    attachDragHandlers(btn, ti, si, name, isElim);

    // Клик
    btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) return;
        if (dragState) return;
        handleSeatClick(ti, si);
    });

    // Крестик
    const del = btn.querySelector('.btn-delete');
    if (del) {
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            eliminatePlayer(ti, si);
        });
    }

    return btn;
}

// ===== ПЕРЕТАСКИВАНИЕ (pointer events — работает и мышью, и пальцем) =====
let dragState = null;
let longPressTimer = null;

function attachDragHandlers(btn, ti, si, name, isElim) {
    if (!name || isElim) return;

    btn.style.cursor = 'grab';

    btn.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('btn-delete')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const isTouch = e.pointerType === 'touch';
        const delay = isTouch ? 220 : 0;

        longPressTimer = setTimeout(() => {
            startDrag(e, btn, ti, si, name);
        }, delay);
    });

    btn.addEventListener('pointermove', (e) => {
        if (dragState) {
            moveDrag(e);
            return;
        }
        // Если палец/мышь сдвинулись до срабатывания таймера — отменяем
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });

    btn.addEventListener('pointerup', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });

    btn.addEventListener('pointercancel', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });

    btn.addEventListener('contextmenu', (e) => {
        if (dragState) e.preventDefault();
    });
}

function startDrag(e, btn, ti, si, name) {
    longPressTimer = null;

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = name;
    document.body.appendChild(ghost);

    const rect = btn.getBoundingClientRect();
    const startX = e.clientX || (rect.left + rect.width / 2);
    const startY = e.clientY || (rect.top + rect.height / 2);

    dragState = {
        ti, si,
        ghost,
        sourceEl: btn,
        targetEl: null
    };

    btn.classList.add('dragging');
    positionGhost(startX, startY);

    document.addEventListener('pointermove', globalPointerMove, { passive: false });
    document.addEventListener('pointerup', globalPointerUp);
    document.addEventListener('pointercancel', globalPointerUp);

    const viewport = document.querySelector('.album-viewport');
    const track = document.getElementById('albumTrack');
    if (viewport) viewport.classList.add('dragging-active');
    if (track) track.classList.add('dragging-active');

    if (navigator.vibrate) navigator.vibrate(20);

    e.preventDefault();
}

function moveDrag(e) {
    if (!dragState) return;
    positionGhost(e.clientX, e.clientY);
}

function positionGhost(x, y) {
    if (!dragState) return;
    dragState.ghost.style.left = x + 'px';
    dragState.ghost.style.top = y + 'px';
}

function globalPointerMove(e) {
    if (!dragState) return;
    e.preventDefault();

    positionGhost(e.clientX, e.clientY);

    const el = document.elementFromPoint(e.clientX, e.clientY);
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

function globalPointerUp(e) {
    document.removeEventListener('pointermove', globalPointerMove);
    document.removeEventListener('pointerup', globalPointerUp);
    document.removeEventListener('pointercancel', globalPointerUp);

    if (!dragState) return;

    const targetBtn = dragState.targetEl;

    document.querySelectorAll('.number-btn.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.table-card.drag-target').forEach(el => el.classList.remove('drag-target'));

    if (dragState.ghost && dragState.ghost.parentNode) {
        dragState.ghost.parentNode.removeChild(dragState.ghost);
    }
    if (dragState.sourceEl) dragState.sourceEl.classList.remove('dragging');

    const viewport = document.querySelector('.album-viewport');
    const track = document.getElementById('albumTrack');
    if (viewport) viewport.classList.remove('dragging-active');
    if (track) track.classList.remove('dragging-active');

    if (targetBtn) {
        const targetTi = +targetBtn.dataset.table;
        const targetSi = +targetBtn.dataset.seat;
        const { ti: srcTi, si: srcSi } = dragState;

        if (!(srcTi === targetTi && srcSi === targetSi)) {
            performMove(srcTi, srcSi, targetTi, targetSi);
        }
    }

    // Сбрасываем через небольшую задержку, чтобы клик не сработал
    setTimeout(() => { dragState = null; }, 50);
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
    checkBalance();
}

// ===== КЛИК =====
function handleSeatClick(ti, si) {
    const table = appData.tables[ti];
    const name = table.names[si];

    if (!name) {
        pendingSeat = { tableIndex: ti, seatIndex: si };
        const modal = document.getElementById('nameModal');
        const input = document.getElementById('playerNameInput');
        input.value = '';
        modal.classList.add('active');
        setTimeout(() => input.focus(), 100);
        return;
    }

    const isElim = appData.eliminated.some(e => e.name === name);
    if (isElim) return;

    table.players[si]++;
    appData.total++;
    updateAllUI();
    saveData();
    checkBalance();
}

function confirmPlayerName() {
    const name = document.getElementById('playerNameInput').value.trim();
    if (pendingSeat && name) {
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

function closeNameModal() {
    document.getElementById('nameModal').classList.remove('active');
    pendingSeat = null;
}

// ===== ВЫБИВАНИЕ =====
function eliminatePlayer(ti, si) {
    const table = appData.tables[ti];
    const name = table.names[si];
    if (!name) return;

    if (!confirm(`Выбить игрока "${name}"?`)) return;

    if (!appData.eliminated.some(e => e.name === name)) {
        const order = appData.eliminated.length + 1;
        appData.eliminated.push({
            name,
            order,
            tableNumber: ti + 1
        });
    }

    renderTables();
    updateAllUI();
    saveData();
    checkBalance();
}

// ===== ДИСБАЛАНС =====
function getActiveCounts() {
    return appData.tables.map(t =>
        t.names.filter(n => n && !appData.eliminated.some(e => e.name === n)).length
    );
}

function getImbalanceInfo() {
    const counts = getActiveCounts();
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const diff = max - min;
    const imbalanced = diff >= 2;

    const overloadedTables = [];
    if (imbalanced) {
        counts.forEach((c, i) => {
            if (c === max) overloadedTables.push(i);
        });
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
        document.getElementById('balanceText').textContent =
            `${parts}. Разница ${info.diff}.`;

        if (!silent && overlay) {
            overlay.classList.add('active');
        }
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
    const info = getImbalanceInfo();
    if (info.imbalanced) {
        checkBalance();
        return;
    }
    timer.running = true;
    timer.interval = setInterval(() => {
        if (timer.totalSeconds > 0) {
            timer.totalSeconds--;
            updateTimerDisplay();
        } else {
            nextLevel();
        }
    }, 1000);
}

function stopTimer() {
    timer.running = false;
    clearInterval(timer.interval);
    timer.interval = null;
    saveData();
}

function skipLevel() {
    if (confirm(`Перейти на уровень ${level + 1}?`)) {
        stopTimer();
        nextLevel();
    }
}

function nextLevel() {
    if (level < blindSequence.length) {
        level++;
        updateBlinds();
        timer.totalSeconds = 10 * 60;
        timer.maxSeconds = 10 * 60;
        updateTimerDisplay();
        renderStructure();
        updateAllUI();
        saveData();
        if (timer.running) startTimer();
    }
}

function prevLevel() {
    if (level > 1) {
        level--;
        updateBlinds();
        timer.totalSeconds = 10 * 60;
        timer.maxSeconds = 10 * 60;
        updateTimerDisplay();
        renderStructure();
        updateAllUI();
        saveData();
    }
}

function updateBlinds() {
    mbScore = blindSequence[level - 1] || 100;
    bbScore = mbScore * 2;
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (!display) return;
    const m = Math.floor(timer.totalSeconds / 60);
    const s = timer.totalSeconds % 60;
    display.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

    if (timer.totalSeconds <= 10 && timer.running) {
        display.classList.add('blinking');
        display.style.color = '#e74c3c';
    } else {
        display.classList.remove('blinking');
        display.style.color = '#2c3e50';
    }
    updateProgressBar();
}

function updateProgressBar() {
    const circle = document.querySelector('.progress-ring-circle');
    if (!circle) return;
    const r = circle.r.baseVal.value;
    const circ = 2 * Math.PI * r;
    const progress = timer.maxSeconds > 0 ? timer.totalSeconds / timer.maxSeconds : 0;
    circle.style.strokeDashoffset = circ * (1 - progress);
    if (progress <= 0.1) circle.style.stroke = '#e74c3c';
    else if (progress <= 0.3) circle.style.stroke = '#f39c12';
    else circle.style.stroke = '#2ecc71';
}

// ===== СТРУКТУРА =====
function renderStructure() {
    const list = document.getElementById('structureList');
    if (!list) return;
    list.innerHTML = '';
    const start = Math.max(0, level - 6);
    const end = Math.min(blindSequence.length, level + 5);
    for (let i = start; i < end; i++) {
        const item = document.createElement('div');
        item.className = 'structure-item' + (i === level - 1 ? ' current' : '');
        const mb = blindSequence[i];
        item.innerHTML = `<span class="lvl">Ур. ${i + 1}</span><span>${mb}/${mb*2}</span>`;
        list.appendChild(item);
    }
}

// ===== UI =====
function updateAllUI() {
    updateBlinds();
    updateTimerDisplay();
    updateLevelDisplay();
    updateStructure();
    updatePrizePool();
    updateEliminatedList();
    updateTotal();

    document.getElementById('mbScore').textContent = mbScore;
    document.getElementById('bbScore').textContent = bbScore;
}

function updateLevelDisplay() {
    const el = document.getElementById('levelDisplay');
    if (el) el.textContent = `Уровень ${level}`;
}

function updateStructure() { renderStructure(); }

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
    appData.eliminated.forEach(e => {
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
    if (!confirm('Сбросить ВСЁ?')) return;
    stopTimer();
    appData = {
        total: 0,
        tables: [emptyTable(), emptyTable()],
        eliminated: []
    };
    level = 1;
    currentMultiplier = 150;
    currentOption = 2;
    deductTenPercent = false;
    currentTableIndex = 0;
    timer = { totalSeconds: 600, maxSeconds: 600, running: false, interval: null };

    document.getElementById('deductTenPercent').checked = false;
    document.getElementById('customMultiplier').value = '';
    menuExpanded = { prize: true, auto: false, dist: false };
    closeBalanceOverlay();

    renderTables();
    updateAddTableButton();
    updateAllUI();
    initializeMenuSections();
    saveData();
    alert('Сброшено!');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('nameModal').classList.contains('active')) {
        confirmPlayerName();
    }
    if (e.key === 'Escape') {
        closeNameModal();
    }
});

setInterval(saveData, 5000);
window.addEventListener('beforeunload', saveData);