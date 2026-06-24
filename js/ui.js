/* ================================================================
   ui.js — Rendering Papan, Eval Bar, Timer, Captured, Moves
   ================================================================ */

var curPieceStyle = 'klasik';

function pieceHTML(p) {
    var w = isW(p);
    return '<div class="piece-el entering"><span class="pk-' + curPieceStyle + ' ' + (w ? 'wp' : 'bp') + '">' + PC[p] + '</span></div>';
}

function createBoard() {
    var el = document.getElementById('board'); el.innerHTML = '';
    for (var i = 0; i < 64; i++) {
        var sq = document.createElement('div');
        sq.className = 'square'; sq.dataset.i = i; sq.tabIndex = 0;
        sq.addEventListener('click', (function(idx) { return function() { handleClick(idx); }; })(i));
        sq.addEventListener('keydown', (function(idx) { return function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(idx); } }; })(i));
        el.appendChild(sq);
    }
}

// flipped di-set dari app.js
var flipped = false;

function renderBoard() {
    var sqs = document.querySelectorAll('.square');
    var isReview = reviewIdx >= 0 && reviewIdx < history.length;
    var dispBoard = isReview ? history[reviewIdx].snapshot : board;
    var dispLM = isReview ? { from: history[reviewIdx].from, to: history[reviewIdx].to } : lastMove;
    sqs.forEach(function(sq, i) {
        var dr = Math.floor(i / 8), dc = i % 8;
        var r = flipped ? 7 - dr : dr, c = flipped ? 7 - dc : dc;
        var light = (r + c) % 2 === 0, p = dispBoard[r][c];
        sq.className = 'square ' + (light ? 'light' : 'dark');
        var ch = '';
        if (dc === 0) ch += '<span class="coord coord-rank">' + RANKS[r] + '</span>';
        if (dr === 7) ch += '<span class="coord coord-file">' + FILES[c] + '</span>';
        if (!isReview) {
            if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');
            var isVM = validMoves.some(function(m) { return m[0] === r && m[1] === c; });
            if (isVM) sq.classList.add(p ? 'valid-capture' : 'valid-move');
        }
        if (dispLM && ((dispLM.from[0] === r && dispLM.from[1] === c) || (dispLM.to[0] === r && dispLM.to[1] === c)))
            sq.classList.add('last-move');
        if (!isReview && p && p.toLowerCase() === 'k' && pColor(p) === turn && inCheck(turn) && !gameOver)
            sq.classList.add('in-check');
        sq.innerHTML = p ? ch + pieceHTML(p) : ch;
    });
}

function renderCaptured() {
    var ord = { q: 0, r: 1, b: 2, n: 3, p: 4 };
    var sortC = function(a) { return a.slice().sort(function(x, y) { return (ord[x.toLowerCase()] || 5) - (ord[y.toLowerCase()] || 5); }); };
    var val = function(a) { return a.reduce(function(s, p) { return s + (PV[p.toLowerCase()] || 0); }, 0); };
    var adv = val(capturedW) - val(capturedB);
    var topCol = flipped ? 'white' : 'black', botCol = flipped ? 'black' : 'white';
    var topCap = topCol === 'white' ? capturedB : capturedW, botCap = botCol === 'white' ? capturedB : capturedW;
    var rc = function(arr, av, isTop) {
        var s = sortC(arr);
        var h = s.map(function(p) { return '<span style="font-size:13px;line-height:1;">' + PC[p] + '</span>'; }).join('');
        if (isTop && av < 0) h += '<span class="advantage">+' + (-av / 100) + '</span>';
        if (!isTop && av > 0) h += '<span class="advantage">+' + (av / 100) + '</span>';
        return h;
    };
    document.getElementById('captured-top').innerHTML = rc(topCap, adv, true);
    document.getElementById('captured-bottom').innerHTML = rc(botCap, adv, false);
}

function renderMoves() {
    var el = document.getElementById('move-list'), cnt = document.getElementById('move-count');
    cnt.textContent = history.length;
    if (!history.length) { el.innerHTML = '<div class="text-center py-3 text-[9px]" style="color:var(--muted);">Belum ada langkah</div>'; return; }
    var h = '';
    for (var i = 0; i < history.length; i += 2) {
        var num = Math.floor(i / 2) + 1;
        var w = history[i] ? history[i].nota : '';
        var b = history[i + 1] ? history[i + 1].nota : '';
        var wHl = reviewIdx === i ? ' review-hl' : '';
        var bHl = reviewIdx === i + 1 ? ' review-hl' : '';
        var rowHl = (reviewIdx === i || reviewIdx === i + 1) ? ' review-active' : '';
        h += '<div class="move-row' + rowHl + '"><span class="move-num">' + num + '.</span><span class="move-text' + wHl + '" data-idx="' + i + '">' + w + '</span><span class="move-text' + bHl + '" data-idx="' + (i + 1) + '">' + (b || '') + '</span></div>';
    }
    el.innerHTML = h;
    el.querySelectorAll('.move-text[data-idx]').forEach(function(mt) {
        mt.addEventListener('click', function() {
            var idx = parseInt(mt.dataset.idx);
            if (idx >= history.length) return;
            reviewIdx === idx ? exitReview() : enterReview(idx);
        });
    });
    el.scrollTop = el.scrollHeight;
}

function renderStatus() {
    var bar = document.getElementById('status-bar');
    bar.classList.remove('status-check');
    if (reviewIdx >= 0) { bar.textContent = 'Mode Tinjauan'; return; }
    if (gameOver) { bar.textContent = gameResult; return; }
    var who = turn === 'white' ? 'Putih' : 'Hitam';
    if (inCheck(turn)) { bar.textContent = 'Skak! Giliran ' + who; bar.classList.add('status-check'); }
    else bar.textContent = 'Giliran ' + who;
}

function renderPlayerBars() {
    var topCol = flipped ? 'white' : 'black', botCol = flipped ? 'black' : 'white';
    document.getElementById('name-top').textContent = topCol === 'white' ? 'Putih' : 'Hitam';
    document.getElementById('name-bottom').textContent = botCol === 'white' ? 'Putih' : 'Hitam';
    document.getElementById('dot-top').classList.toggle('active', turn === topCol && !gameOver && reviewIdx < 0);
    document.getElementById('dot-bottom').classList.toggle('active', turn === botCol && !gameOver && reviewIdx < 0);
    document.getElementById('label-top').classList.add('hidden');
    document.getElementById('label-bottom').classList.add('hidden');
    if (gameMode === 'ai') {
        document.getElementById(aiColor === 'black' ? 'label-top' : 'label-bottom').classList.remove('hidden');
    }
}

// ===== TIMER =====
var timerW = 0, timerB = 0, timerMode = 0, timerInterval = null, timerStarted = false;

function formatTime(ms) {
    if (ms <= 0) return '0:00';
    var ts = Math.ceil(ms / 1000), m = Math.floor(ts / 60), s = ts % 60;
    return m + ':' + String(s).padStart(2, '0');
}
function timerClass(ms) { if (ms <= 10000) return 'timer-danger'; if (ms <= 30000) return 'timer-warn'; return 'timer-safe'; }
function renderTimers() {
    var tT = document.getElementById('timer-top'), tB = document.getElementById('timer-bottom');
    var topCol = flipped ? 'white' : 'black', botCol = flipped ? 'black' : 'white';
    var topMs = topCol === 'white' ? timerW : timerB, botMs = botCol === 'white' ? timerW : timerB;
    tT.textContent = formatTime(topMs); tT.className = 'timer-display ' + timerClass(topMs) + (timerMode ? '' : ' hidden');
    tB.textContent = formatTime(botMs); tB.className = 'timer-display ' + timerClass(botMs) + (timerMode ? '' : ' hidden');
}
function startTimer() {
    if (timerMode === 0 || timerInterval) return;
    timerInterval = setInterval(function() {
        if (gameOver || reviewIdx >= 0 || animating) return;
        if (turn === 'white') { timerW -= 100; if (timerW <= 0) { timerW = 0; gameOver = true; gameResult = 'Hitam Menang! (Waktu Habis)'; stopTimer(); showGameOver(); } }
        else { timerB -= 100; if (timerB <= 0) { timerB = 0; gameOver = true; gameResult = 'Putih Menang! (Waktu Habis)'; stopTimer(); showGameOver(); } }
        renderTimers();
    }, 100);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

// ===== EVAL BAR =====
// currentEval di-set dari app.js
var currentEval = 0;

function renderEvalBar() {
    var ev = gameOver ? 0 : currentEval;
    var clamped = Math.max(-2000, Math.min(2000, ev));
    var pct = 50 + (clamped / 2000) * 50;
    var wH = Math.max(2, Math.min(98, pct));
    document.getElementById('eval-white').style.height = wH + '%';
    document.getElementById('eval-black').style.height = Math.max(2, 100 - wH) + '%';
    var evStr = (ev / 100).toFixed(1), evSign = ev > 0 ? '+' : '';
    document.getElementById('eval-label-top').textContent = ev >= 0 ? evSign + evStr : '';
    document.getElementById('eval-label-bot').textContent = ev < 0 ? evSign + evStr : '';
}

// ===== REVIEW =====
var reviewIdx = -1;

function enterReview(idx) {
    if (idx < 0 || idx >= history.length) return;
    reviewIdx = idx; stopTimer();
    document.getElementById('review-banner').classList.remove('hidden');
    document.getElementById('review-step').textContent = idx + 1;
    renderAll();
}
function exitReview() {
    reviewIdx = -1;
    document.getElementById('review-banner').classList.add('hidden');
    renderAll();
    if (timerStarted && !gameOver) startTimer();
}

// ===== RENDER ALL =====
function renderAll() {
    renderBoard(); renderCaptured(); renderMoves(); renderStatus(); renderPlayerBars(); renderTimers(); renderEvalBar();
}
