/* ================================================================
   chess.js — Engine Catur Lengkap
   Konstanta, state papan, deteksi serangan, generasi langkah,
   validasi, eksekusi, evaluasi, dan AI (Minimax + Alpha-Beta).
   ================================================================ */

// ===== KONSTANTA =====
var FILES = 'abcdefgh';
var RANKS = '87654321';
var PC = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
var PV = { p:100, n:320, b:330, r:500, q:900, k:20000 };

// Piece-Square Tables (perspektif putih, baris 0 = rank 8)
var PST = {
    p: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
    n: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
    b: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
    r: [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
    q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
    k: [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
};

function getPSTVal(p, r, c) {
    var t = p.toLowerCase(), tb = PST[t];
    if (!tb) return 0;
    return isW(p) ? tb[r][c] : tb[7 - r][c];
}

// ===== UTILITAS =====
function isW(p) { return p && p === p.toUpperCase(); }
function isB(p) { return p && p === p.toLowerCase(); }
function pColor(p) { return isW(p) ? 'white' : 'black'; }
function inB(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function cloneBoard(b) { return b.map(function(r) { return r.slice(); }); }
function avatarColor(name) {
    var colors = ['#d4a843','#229ED9','#6ee7a0','#f87171','#a78bfa','#fb923c','#38bdf8','#e879f9'];
    var h = 0;
    for (var i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
}

// ===== STATE PAPAN =====
var board, turn, selected, validMoves, history, capturedW, capturedB;
var castle, epTarget, lastMove, gameOver, gameResult;

// ===== ENGINE: DETEKSI SERANGAN =====
function isAttacked(row, col, by) {
    var pd = by === 'white' ? -1 : 1;
    // Bidak
    var dcArr = [-1, 1];
    for (var di = 0; di < 2; di++) {
        var dc = dcArr[di], pr = row - pd, pc = col + dc;
        if (inB(pr, pc)) { var pp = board[pr][pc]; if (pp && pColor(pp) === by && pp.toLowerCase() === 'p') return true; }
    }
    // Kuda
    var knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (var ki = 0; ki < 8; ki++) {
        var nr = row + knightMoves[ki][0], nc = col + knightMoves[ki][1];
        if (inB(nr, nc)) { var p = board[nr][nc]; if (p && pColor(p) === by && p.toLowerCase() === 'n') return true; }
    }
    // Rook / Queen (garis lurus)
    var straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (var si = 0; si < 4; si++) {
        var dr = straightDirs[si][0], dcr = straightDirs[si][1], r = row + dr, c = col + dcr;
        while (inB(r, c)) {
            if (board[r][c]) { var pp2 = board[r][c]; if (pColor(pp2) === by && (pp2.toLowerCase() === 'r' || pp2.toLowerCase() === 'q')) return true; break; }
            r += dr; c += dcr;
        }
    }
    // Bishop / Queen (diagonal)
    var diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (var di2 = 0; di2 < 4; di2++) {
        var dr2 = diagDirs[di2][0], dc2 = diagDirs[di2][1], r2 = row + dr2, c2 = col + dc2;
        while (inB(r2, c2)) {
            if (board[r2][c2]) { var pp3 = board[r2][c2]; if (pColor(pp3) === by && (pp3.toLowerCase() === 'b' || pp3.toLowerCase() === 'q')) return true; break; }
            r2 += dr2; c2 += dc2;
        }
    }
    // Raja
    for (var kr = -1; kr <= 1; kr++) for (var kc = -1; kc <= 1; kc++) {
        if (!kr && !kc) continue;
        var knr = row + kr, knc = col + kc;
        if (inB(knr, knc)) { var pp4 = board[knr][knc]; if (pp4 && pColor(pp4) === by && pp4.toLowerCase() === 'k') return true; }
    }
    return false;
}

// ===== ENGINE: GENERASI LANGKAH =====
function slideMv(r, c, dr, dc, color, mv) {
    var nr = r + dr, nc = c + dc;
    while (inB(nr, nc)) {
        if (!board[nr][nc]) mv.push([nr, nc]);
        else { if (pColor(board[nr][nc]) !== color) mv.push([nr, nc]); break; }
        nr += dr; nc += dc;
    }
}

function pseudoMoves(r, c) {
    var p = board[r][c]; if (!p) return [];
    var mv = [], col = pColor(p), t = p.toLowerCase();
    if (t === 'p') {
        var dir = col === 'white' ? -1 : 1, start = col === 'white' ? 6 : 1;
        if (inB(r + dir, c) && !board[r + dir][c]) {
            mv.push([r + dir, c]);
            if (r === start && !board[r + 2 * dir][c]) mv.push([r + 2 * dir, c]);
        }
        var pawnDc = [-1, 1];
        for (var pi = 0; pi < 2; pi++) {
            var nr = r + dir, nc = c + pawnDc[pi];
            if (!inB(nr, nc)) continue;
            if (board[nr][nc] && pColor(board[nr][nc]) !== col) mv.push([nr, nc]);
            if (epTarget && epTarget[0] === nr && epTarget[1] === nc) mv.push([nr, nc]);
        }
    } else if (t === 'n') {
        var nMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (var ni = 0; ni < 8; ni++) {
            var nr2 = r + nMoves[ni][0], nc2 = c + nMoves[ni][1];
            if (inB(nr2, nc2) && (!board[nr2][nc2] || pColor(board[nr2][nc2]) !== col)) mv.push([nr2, nc2]);
        }
    } else if (t === 'b') {
        var bDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
        for (var bi = 0; bi < 4; bi++) slideMv(r, c, bDirs[bi][0], bDirs[bi][1], col, mv);
    } else if (t === 'r') {
        var rDirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (var ri = 0; ri < 4; ri++) slideMv(r, c, rDirs[ri][0], rDirs[ri][1], col, mv);
    } else if (t === 'q') {
        var qDirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (var qi = 0; qi < 8; qi++) slideMv(r, c, qDirs[qi][0], qDirs[qi][1], col, mv);
    } else if (t === 'k') {
        for (var kr = -1; kr <= 1; kr++) for (var kc = -1; kc <= 1; kc++) {
            if (!kr && !kc) continue;
            var knr = r + kr, knc = c + kc;
            if (inB(knr, knc) && (!board[knr][knc] || pColor(board[knr][knc]) !== col)) mv.push([knr, knc]);
        }
        // Rokade
        var opp = col === 'white' ? 'black' : 'white';
        if (col === 'white') {
            if (castle.K && !board[7][5] && !board[7][6] && board[7][7] === 'R')
                if (!isAttacked(7,4,opp) && !isAttacked(7,5,opp) && !isAttacked(7,6,opp)) mv.push([7,6]);
            if (castle.Q && !board[7][1] && !board[7][2] && !board[7][3] && board[7][0] === 'R')
                if (!isAttacked(7,4,opp) && !isAttacked(7,3,opp) && !isAttacked(7,2,opp)) mv.push([7,2]);
        } else {
            if (castle.k && !board[0][5] && !board[0][6] && board[0][7] === 'r')
                if (!isAttacked(0,4,opp) && !isAttacked(0,5,opp) && !isAttacked(0,6,opp)) mv.push([0,6]);
            if (castle.q && !board[0][1] && !board[0][2] && !board[0][3] && board[0][0] === 'r')
                if (!isAttacked(0,4,opp) && !isAttacked(0,3,opp) && !isAttacked(0,2,opp)) mv.push([0,2]);
        }
    }
    return mv;
}

// ===== ENGINE: LANGKAH VALID =====
function getValid(r, c) {
    var p = board[r][c]; if (!p) return [];
    var col = pColor(p), opp = col === 'white' ? 'black' : 'white';
    var kc = col === 'white' ? 'K' : 'k', kr = 0, kcc = 0;
    for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) if (board[i][j] === kc) { kr = i; kcc = j; }
    return pseudoMoves(r, c).filter(function(m) {
        var tr = m[0], tc = m[1];
        var cap = board[tr][tc]; board[tr][tc] = p; board[r][c] = null;
        var epC = null, epR = -1;
        if (p.toLowerCase() === 'p' && epTarget && tr === epTarget[0] && tc === epTarget[1]) {
            epR = r; epC = board[epR][tc]; board[epR][tc] = null;
        }
        var chk = isAttacked(kr, kcc, opp);
        board[r][c] = p; board[tr][tc] = cap;
        if (epC !== null) board[epR][tc] = epC;
        return !chk;
    });
}

function getAllLegal(col) {
    var mv = [];
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
        if (board[r][c] && pColor(board[r][c]) === col) {
            var vm = getValid(r, c);
            for (var vi = 0; vi < vm.length; vi++) mv.push([r, c, vm[vi][0], vm[vi][1]]);
        }
    }
    return mv;
}

// ===== ENGINE: STATUS PERMAINAN =====
function inCheck(col) {
    var kc = col === 'white' ? 'K' : 'k', opp = col === 'white' ? 'black' : 'white';
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) if (board[r][c] === kc) return isAttacked(r, c, opp);
    return false;
}
function hasLegal(col) {
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++)
        if (board[r][c] && pColor(board[r][c]) === col && getValid(r, c).length > 0) return true;
    return false;
}
function isCheckmate(col) { return inCheck(col) && !hasLegal(col); }
function isStalemate(col) { return !inCheck(col) && !hasLegal(col); }
function insufficientMat() {
    var pw = [], pb = [];
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
        var p = board[r][c]; if (!p) continue; var t = p.toLowerCase();
        if (t !== 'k') (isW(p) ? pw : pb).push(t);
    }
    if (!pw.length && !pb.length) return true;
    if (!pw.length && pb.length === 1 && (pb[0] === 'b' || pb[0] === 'n')) return true;
    if (!pb.length && pw.length === 1 && (pw[0] === 'b' || pw[0] === 'n')) return true;
    return false;
}
function updateCastle(fr, fc, tr, tc, t, col) {
    if (t === 'k') { if (col === 'white') { castle.K = false; castle.Q = false; } else { castle.k = false; castle.q = false; } }
    if (t === 'r') {
        if (fr === 7 && fc === 0) castle.Q = false; if (fr === 7 && fc === 7) castle.K = false;
        if (fr === 0 && fc === 0) castle.q = false; if (fr === 0 && fc === 7) castle.k = false;
    }
    if (tr === 7 && tc === 0) castle.Q = false; if (tr === 7 && tc === 7) castle.K = false;
    if (tr === 0 && tc === 0) castle.q = false; if (tr === 0 && tc === 7) castle.k = false;
}

// ===== EKSEKUSI LANGKAH =====
function execMove(fr, fc, tr, tc, promo) {
    var p = board[fr][fc], cap = board[tr][tc], col = pColor(p), t = p.toLowerCase();
    var opp = col === 'white' ? 'black' : 'white';
    var nota = '';
    if (t === 'k' && Math.abs(tc - fc) === 2) {
        nota = tc > fc ? 'O-O' : 'O-O-O';
        if (tc > fc) { board[fr][5] = board[fr][7]; board[fr][7] = null; }
        else { board[fr][3] = board[fr][0]; board[fr][0] = null; }
    } else {
        nota = t === 'p' ? '' : t.toUpperCase();
        if (t !== 'p') {
            var same = [];
            for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
                if (r === fr && c === fc) continue;
                var pp = board[r][c];
                if (pp && pp.toLowerCase() === t && pColor(pp) === col && getValid(r, c).some(function(m) { return m[0] === tr && m[1] === tc; }))
                    same.push([r, c]);
            }
            if (same.length) {
                if (same.every(function(s) { return s[1] !== fc; })) nota += FILES[fc];
                else if (same.every(function(s) { return s[0] !== fr; })) nota += RANKS[fr];
                else nota += FILES[fc] + RANKS[fr];
            }
        }
        if (cap) { if (t === 'p') nota += FILES[fc]; nota += 'x'; }
        nota += FILES[tc] + RANKS[tr];
    }
    var epCap = false;
    if (t === 'p' && epTarget && tr === epTarget[0] && tc === epTarget[1]) {
        var epP = board[fr][tc]; (col === 'white' ? capturedW : capturedB).push(epP);
        board[fr][tc] = null; epCap = true;
        if (nota.indexOf('x') === -1) nota = FILES[fc] + 'x' + FILES[tc] + RANKS[tr];
    }
    if (cap) (col === 'white' ? capturedW : capturedB).push(cap);
    board[tr][tc] = p; board[fr][fc] = null;
    if (t === 'p' && (tr === 0 || tr === 7)) {
        var pp = promo || (col === 'white' ? 'Q' : 'q');
        board[tr][tc] = col === 'white' ? pp.toUpperCase() : pp.toLowerCase();
        nota += '=' + pp.toUpperCase();
    }
    epTarget = (t === 'p' && Math.abs(tr - fr) === 2) ? [(fr + tr) / 2, fc] : null;
    updateCastle(fr, fc, tr, tc, t, col);
    history.push({ from: [fr,fc], to: [tr,tc], piece: p, cap: cap, nota: nota, epCap: epCap,
        castleB: { K: castle.K, Q: castle.Q, k: castle.k, q: castle.q },
        epB: epTarget ? epTarget.slice() : null, snapshot: cloneBoard(board), promo: promo || null });
    lastMove = { from: [fr,fc], to: [tr,tc] }; turn = opp;
    if (isCheckmate(opp)) { gameOver = true; gameResult = col === 'white' ? 'Putih Menang!' : 'Hitam Menang!'; nota += '#'; }
    else if (isStalemate(opp)) { gameOver = true; gameResult = 'Seri (Stalemate)'; }
    else if (insufficientMat()) { gameOver = true; gameResult = 'Seri (Material Tidak Cukup)'; }
    else if (inCheck(opp)) nota += '+';
    return { wasCapture: !!cap || epCap, wasCheck: nota.indexOf('+') !== -1, wasCheckmate: nota.indexOf('#') !== -1 };
}

function undoLast() {
    if (!history.length) return;
    var h = history.pop(), fr = h.from[0], fc = h.from[1], tr = h.to[0], tc = h.to[1];
    board[fr][fc] = h.piece; board[tr][tc] = h.cap;
    if (h.epCap) { board[fr][tc] = pColor(h.piece) === 'white' ? 'p' : 'P'; (pColor(h.piece) === 'white' ? capturedW : capturedB).pop(); }
    if (h.cap) (pColor(h.piece) === 'white' ? capturedW : capturedB).pop();
    if (h.piece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
        if (tc > fc) { board[fr][7] = board[fr][5]; board[fr][5] = null; }
        else { board[fr][0] = board[fr][3]; board[fr][3] = null; }
    }
    castle = h.castleB; epTarget = h.epB; turn = pColor(h.piece);
    gameOver = false; gameResult = null;
    lastMove = history.length ? { from: history[history.length - 1].from, to: history[history.length - 1].to } : null;
}

// ===== EVALUASI POSISI =====
function evaluate() {
    var sc = 0;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
        var p = board[r][c]; if (!p) continue;
        sc += isW(p) ? (PV[p.toLowerCase()] + getPSTVal(p, r, c)) : -((PV[p.toLowerCase()] + getPSTVal(p, r, c)));
    }
    return sc;
}

// ===== AI: MINIMAX + ALPHA-BETA =====
function makeTemp(fr, fc, tr, tc) {
    var p = board[fr][fc], col = pColor(p), t = p.toLowerCase();
    var st = { from: [fr,fc], to: [tr,tc], piece: p, cap: board[tr][tc], epPc: null, epR: -1, epC: -1,
        castleB: { K: castle.K, Q: castle.Q, k: castle.k, q: castle.q }, epB: epTarget ? epTarget.slice() : null };
    if (t === 'p' && epTarget && tr === epTarget[0] && tc === epTarget[1]) { st.epPc = board[fr][tc]; st.epR = fr; st.epC = tc; board[fr][tc] = null; }
    if (t === 'k' && Math.abs(tc - fc) === 2) {
        if (tc > fc) { board[fr][5] = board[fr][7]; board[fr][7] = null; }
        else { board[fr][3] = board[fr][0]; board[fr][0] = null; }
    }
    board[tr][tc] = p; board[fr][fc] = null;
    if (t === 'p' && (tr === 0 || tr === 7)) board[tr][tc] = col === 'white' ? 'Q' : 'q';
    epTarget = (t === 'p' && Math.abs(tr - fr) === 2) ? [(fr + tr) / 2, fc] : null;
    updateCastle(fr, fc, tr, tc, t, col);
    return st;
}
function unmakeTemp(st) {
    var fr = st.from[0], fc = st.from[1], tr = st.to[0], tc = st.to[1];
    board[fr][fc] = st.piece; board[tr][tc] = st.cap;
    if (st.epPc) board[st.epR][st.epC] = st.epPc;
    if (st.piece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
        if (tc > fc) { board[fr][7] = board[fr][5]; board[fr][5] = null; }
        else { board[fr][0] = board[fr][3]; board[fr][3] = null; }
    }
    castle = st.castleB; epTarget = st.epB;
}

function minimax(depth, alpha, beta, isMax) {
    if (depth === 0) return evaluate();
    var col = isMax ? 'white' : 'black', mvs = getAllLegal(col);
    if (!mvs.length) {
        if (inCheck(col)) return isMax ? -100000 + (aiDepth - depth) : 100000 - (aiDepth - depth);
        return 0;
    }
    mvs.sort(function(a, b) { return (board[b[2]][b[3]] ? PV[board[b[2]][b[3]].toLowerCase()] : 0) - (board[a[2]][a[3]] ? PV[board[a[2]][a[3]].toLowerCase()] : 0); });
    if (isMax) {
        var mx = -Infinity;
        for (var i = 0; i < mvs.length; i++) { var st = makeTemp(mvs[i][0], mvs[i][1], mvs[i][2], mvs[i][3]); var ev = minimax(depth - 1, alpha, beta, false); unmakeTemp(st); mx = Math.max(mx, ev); alpha = Math.max(alpha, ev); if (beta <= alpha) break; }
        return mx;
    } else {
        var mn = Infinity;
        for (var j = 0; j < mvs.length; j++) { var st2 = makeTemp(mvs[j][0], mvs[j][1], mvs[j][2], mvs[j][3]); var ev2 = minimax(depth - 1, alpha, beta, true); unmakeTemp(st2); mn = Math.min(mn, ev2); beta = Math.min(beta, ev2); if (beta <= alpha) break; }
        return mn;
    }
}

// aiDepth di-set dari app.js
var aiDepth = 1;

function getAIMove() {
    var col = turn, isMax = col === 'white', mvs = getAllLegal(col);
    if (!mvs.length) return null;
    // Depth 1: Greedy heuristic
    if (aiDepth <= 1) {
        var best = -Infinity, picks = [];
        for (var i = 0; i < mvs.length; i++) {
            var sc = 0, tgt = board[mvs[i][2]][mvs[i][3]];
            if (tgt) sc += PV[tgt.toLowerCase()] * 10 - PV[board[mvs[i][0]][mvs[i][1]].toLowerCase()];
            var sv = board[mvs[i][2]][mvs[i][3]]; board[mvs[i][2]][mvs[i][3]] = board[mvs[i][0]][mvs[i][1]]; board[mvs[i][0]][mvs[i][1]] = null;
            var opp = col === 'white' ? 'black' : 'white';
            if (inCheck(opp)) sc += 50;
            if (isAttacked(mvs[i][2], mvs[i][3], opp)) sc -= PV[board[mvs[i][2]][mvs[i][3]].toLowerCase()] * 0.3;
            board[mvs[i][0]][mvs[i][1]] = board[mvs[i][2]][mvs[i][3]]; board[mvs[i][2]][mvs[i][3]] = sv;
            if (mvs[i][2] >= 2 && mvs[i][2] <= 5 && mvs[i][3] >= 2 && mvs[i][3] <= 5) sc += 5;
            sc += Math.random() * 8;
            if (sc > best) { best = sc; picks = [mvs[i]]; } else if (Math.abs(sc - best) < 0.01) picks.push(mvs[i]);
        }
        return picks.length ? picks[Math.floor(Math.random() * picks.length)] : mvs[0];
    }
    // Depth 2-3: Minimax
    mvs.sort(function(a, b) { return (board[b[2]][b[3]] ? PV[board[b[2]][b[3]].toLowerCase()] : 0) - (board[a[2]][a[3]] ? PV[board[a[2]][a[3]].toLowerCase()] : 0); });
    var bestMv = mvs[0], bestEv = isMax ? -Infinity : Infinity;
    for (var j = 0; j < mvs.length; j++) {
        var st = makeTemp(mvs[j][0], mvs[j][1], mvs[j][2], mvs[j][3]);
        var ev = minimax(aiDepth - 1, -Infinity, Infinity, !isMax);
        unmakeTemp(st);
        if (isMax ? ev > bestEv : ev < bestEv) { bestEv = ev; bestMv = mvs[j]; }
    }
    return bestMv;
}
