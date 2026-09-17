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
    renderTables();
    updateAddTableButton();
    updateTableIndicator();
    saveData();
    // Переключаемся на новый стол
    currentTableIndex = appData.tables.length - 1;
    updateAlbumPosition();
    updateTableIndicator();
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

    if (name && !isElim) {
        btn.draggable = true;
        btn.addEventListener('dragstart', onDragStart);
        btn.addEventListener('dragend', onDragEnd);
    }
    btn.addEventListener('dragover', onDragOver);
    btn.addEventListener('dragleave', onDragLeave);
    btn.addEventListener('drop', onDrop);

    btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) return;
        handleSeatClick(ti, si);
    });

    const del = btn.querySelector('.btn-delete');
    if (del) {
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            eliminatePlayer(ti, si);
        });
    }

    return btn;
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

// ===== DRAG & DROP =====
let dragSource = null;

function onDragStart(e) {
    const btn = e.currentTarget;
    const ti = +btn.dataset.table;
    const si = +btn.dataset.seat;
    const name = appData.tables[ti].names[si];
    if (!name || appData.eliminated.some(x => x.name === name)) {
        e.preventDefault();
        return;
    }
    dragSource = { ti, si };
    btn.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${ti}-${si}`);

    const viewport = document.querySelector('.album-viewport');
    const track = document.getElementById('albumTrack');
    if (viewport) viewport.classList.add('dragging-active');
    if (track) track.classList.add('dragging-active');
}

function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.table-card.drag-target').forEach(el => el.classList.remove('drag-target'));

    const viewport = document.querySelector('.album-viewport');
    const track = document.getElementById('albumTrack');
    if (viewport) viewport.classList.remove('dragging-active');
    if (track) track.classList.remove('dragging-active');

    dragSource = null;
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');

    const card = e.currentTarget.closest('.table-card');
    if (card) card.classList.add('drag-target');
}

function onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
    const card = e.currentTarget.closest('.table-card');
    if (card && !card.contains(e.relatedTarget)) {
        card.classList.remove('drag-target');
    }
}

function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.remove('drag-over');
    const card = target.closest('.table-card');
    if (card) card.classList.remove('drag-target');

    if (!dragSource) return;

    const targetTi = +target.dataset.table;
    const targetSi = +target.dataset.seat;
    if (dragSource.ti === targetTi && dragSource.si === targetSi) return;

    const srcTable = appData.tables[dragSource.ti];
    const tgtTable = appData.tables[targetTi];
    const srcName = srcTable.names[dragSource.si];
    const srcCount = srcTable.players[dragSource.si];
    const tgtName = tgtTable.names[targetSi];
    const tgtCount = tgtTable.players[targetSi];

    if (tgtName) {
        srcTable.names[dragSource.si] = tgtName;
        srcTable.players[dragSource.si] = tgtCount;
        tgtTable.names[targetSi] = srcName;
        tgtTable.players[targetSi] = srcCount;
    } else {
        tgtTable.names[targetSi] = srcName;
        tgtTable.players[targetSi] = srcCount;
        srcTable.names[dragSource.si] = '';
        srcTable.players[dragSource.si] = 0;
    }

    dragSource = null;
    renderTables();
    updateAllUI();
    saveData();
    checkBalance();
}

// ===== ДИСБАЛАНС =====
// Считаем активных (не выбитых) игроков по всем столам
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

    // Все столы с максимальным количеством — перегружены
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

        // Текст со всеми столами
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