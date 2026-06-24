/* ================================================================
   dashboard.js — Login, Dashboard Views, Leaderboard, Profil, Turnamen
   Data layer menggunakan localStorage.
   ================================================================ */

var currentUser = '';
var lbFilter = 'all';
var tourneyIdCounter = 0;

// ===== DATA LAYER =====
function getData() { try { return JSON.parse(localStorage.getItem('cmp_data')) || { users: {}, tournaments: [] }; } catch (e) { return { users: {}, tournaments: [] }; } }
function saveData(d) { try { localStorage.setItem('cmp_data', JSON.stringify(d)); } catch (e) {} }
function getUser(name) {
    var d = getData();
    return d.users[name] || { name: name, wins: 0, losses: 0, draws: 0, games: [], rating: 1200 };
}
function saveUser(u) { var d = getData(); d.users[u.name] = u; saveData(d); }
function addGameResult(name, result, opponent, level, moves) {
    var u = getUser(name);
    u.games.unshift({ result: result, opponent: opponent, level: level, moves: moves, date: Date.now() });
    if (u.games.length > 50) u.games.length = 50;
    if (result === 'win') { u.wins++; u.rating = Math.min(3000, u.rating + 25); }
    else if (result === 'loss') { u.losses++; u.rating = Math.max(100, u.rating - 15); }
    else { u.draws++; }
    saveUser(u);
}
function getLeaderboard(filter) {
    var d = getData(), entries = Object.values(d.users);
    if (filter && filter !== 'all') entries = entries.filter(function(e) { return e.games.some(function(g) { return g.level == filter && g.result === 'win'; }); });
    entries.sort(function(a, b) { return b.wins - a.wins || b.rating - a.rating; });
    return entries;
}

// ===== LOGIN =====
function doLogin() {
    var inp = document.getElementById('login-input').value.trim().replace('@', '');
    if (inp.length < 3 || inp.length > 20) { document.getElementById('login-error').style.display = 'block'; return; }
    document.getElementById('login-error').style.display = 'none';
    currentUser = inp; localStorage.setItem('cmp_user', currentUser);
    setupDashboard(); showScreen('dashboard-screen');
}

// ===== DASHBOARD SETUP =====
function setupDashboard() {
    var u = getUser(currentUser), col = avatarColor(currentUser);
    document.getElementById('sidebar-avatar').style.background = col;
    document.getElementById('sidebar-avatar').textContent = currentUser[0].toUpperCase();
    document.getElementById('sidebar-name').textContent = currentUser;
    document.querySelector('#sidebar-user .text-\\[10px\\]').textContent = '@' + currentUser;
    // Inisialisasi tourney counter dari data tersimpan
    var d = getData();
    tourneyIdCounter = d.tournaments ? d.tournaments.length : 0;
    renderHome(); renderLeaderboard(); renderProfile(); renderTournaments();
}

function renderHome() {
    var u = getUser(currentUser), total = u.wins + u.losses + u.draws, wr = total ? Math.round(u.wins / total * 100) : 0;
    document.getElementById('home-stats').innerHTML =
        '<div class="stat-card"><div class="stat-num">' + total + '</div><div class="stat-label">Total Partai</div></div>' +
        '<div class="stat-card"><div class="stat-num" style="color:#6ee7a0;">' + u.wins + '</div><div class="stat-label">Menang</div></div>' +
        '<div class="stat-card"><div class="stat-num" style="color:#fbbf24;">' + wr + '%</div><div class="stat-label">Win Rate</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + u.rating + '</div><div class="stat-label">Rating</div></div>';
    var rg = document.getElementById('recent-games');
    if (!u.games.length) { rg.innerHTML = '<div class="text-center py-6 text-xs" style="color:var(--muted);">Belum ada partai. Mulai bermain!</div>'; return; }
    rg.innerHTML = u.games.slice(0, 5).map(function(g) {
        var rc = g.result === 'win' ? 'result-win' : g.result === 'loss' ? 'result-loss' : 'result-draw';
        var rl = g.result === 'win' ? 'Menang' : g.result === 'loss' ? 'Kalah' : 'Seri';
        var lv = { 1: 'Mudah', 2: 'Sedang', 3: 'Sulit', local: 'Lokal', online: 'Online' }[g.level] || g.level;
        var dt = new Date(g.date);
        var ds = dt.toLocaleDateString('id', { day: 'numeric', month: 'short' }) + ' ' + dt.toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' });
        return '<div class="recent-game"><span class="result-badge ' + rc + '">' + rl + '</span><div class="flex-1 min-w-0"><div class="text-xs font-semibold truncate">vs ' + g.opponent + '</div><div class="text-[10px]" style="color:var(--muted);">' + lv + ' &middot; ' + g.moves + ' langkah &middot; ' + ds + '</div></div></div>';
    }).join('');
}

function renderLeaderboard() {
    var entries = getLeaderboard(lbFilter), body = document.getElementById('lb-body');
    if (!entries.length) { body.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-xs" style="color:var(--muted);">Belum ada data</td></tr>'; return; }
    body.innerHTML = entries.map(function(e, i) {
        var rc = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
        var isMe = e.name === currentUser ? 'lb-me' : '';
        var lv = e.games.filter(function(g) { return g.result === 'win'; }).map(function(g) { return ({ 1: 'Mudah', 2: 'Sedang', 3: 'Sulit' }[g.level] || '?'); }).slice(0, 3).join(', ') || '-';
        var d = e.games[0] ? new Date(e.games[0].date).toLocaleDateString('id', { day: 'numeric', month: 'short' }) : '-';
        return '<tr class="' + isMe + '"><td><span class="rank-badge ' + rc + '">' + (i + 1) + '</span></td><td class="font-semibold flex items-center gap-2"><div class="avatar" style="width:24px;height:24px;border-radius:6px;font-size:10px;background:' + avatarColor(e.name) + ';">' + e.name[0].toUpperCase() + '</div>' + e.name + (isMe ? ' <span class="text-[9px]" style="color:var(--accent);">(Anda)</span>' : '') + '</td><td style="color:var(--muted);">' + lv + '</td><td class="font-bold" style="color:var(--accent);">' + e.wins + '</td><td style="color:var(--muted);">' + d + '</td></tr>';
    }).join('');
}

function renderProfile() {
    var u = getUser(currentUser), col = avatarColor(currentUser), total = u.wins + u.losses + u.draws, wr = total ? Math.round(u.wins / total * 100) : 0;
    document.getElementById('profile-header').innerHTML = '<div class="profile-avatar" style="background:' + col + ';">' + currentUser[0].toUpperCase() + '</div><div><h3 class="font-display text-xl font-bold">' + currentUser + '</h3><p style="color:var(--muted);font-size:13px;">@' + currentUser + ' &middot; Rating ' + u.rating + '</p></div>';
    document.getElementById('profile-stats').innerHTML =
        '<div class="profile-stat"><div class="ps-val">' + total + '</div><div class="ps-label">Partai</div></div>' +
        '<div class="profile-stat"><div class="ps-val" style="color:#6ee7a0;">' + u.wins + '</div><div class="ps-label">Menang</div></div>' +
        '<div class="profile-stat"><div class="ps-val" style="color:#f87171;">' + u.losses + '</div><div class="ps-label">Kalah</div></div>' +
        '<div class="profile-stat"><div class="ps-val" style="color:#fbbf24;">' + u.draws + '</div><div class="ps-label">Seri</div></div>' +
        '<div class="profile-stat"><div class="ps-val" style="color:var(--accent);">' + wr + '%</div><div class="ps-label">Win Rate</div></div>' +
        '<div class="profile-stat"><div class="ps-val">' + u.rating + '</div><div class="ps-label">Rating</div></div>';
    var pg = document.getElementById('profile-games');
    if (!u.games.length) { pg.innerHTML = '<div class="text-center py-6 text-xs" style="color:var(--muted);">Belum ada partai</div>'; return; }
    pg.innerHTML = u.games.slice(0, 15).map(function(g) {
        var rc = g.result === 'win' ? 'result-win' : g.result === 'loss' ? 'result-loss' : 'result-draw';
        var rl = g.result === 'win' ? 'Menang' : g.result === 'loss' ? 'Kalah' : 'Seri';
        var lv = { 1: 'Mudah', 2: 'Sedang', 3: 'Sulit', local: 'Lokal', online: 'Online' }[g.level] || g.level;
        var dt = new Date(g.date);
        var ds = dt.toLocaleDateString('id', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' });
        return '<div class="recent-game"><span class="result-badge ' + rc + '">' + rl + '</span><div class="flex-1 min-w-0"><div class="text-xs font-semibold truncate">vs ' + g.opponent + '</div><div class="text-[10px]" style="color:var(--muted);">' + lv + ' &middot; ' + g.moves + ' langkah &middot; ' + ds + '</div></div></div>';
    }).join('');
}

// ===== TOURNAMENT =====
function createTournament() {
    var d = getData(), id = ++tourneyIdCounter;
    var aiNames = ['Magnus_Bot', 'Kasparov_AI', 'Fischer_960', 'Capablanca_X', 'Tal_Attack', 'Karpov_Def', 'Anand_V3'];
    var shuffled = aiNames.sort(function() { return Math.random() - 0.5; }).slice(0, 7);
    var players = [{ name: currentUser, isHuman: true }].concat(shuffled.map(function(n) { return { name: n, isHuman: false }; }));
    for (var i = players.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = players[i]; players[i] = players[j]; players[j] = tmp; }
    var tourney = { id: id, name: 'Turnamen #' + id, players: players, rounds: [], status: 'active', created: Date.now() };
    var r1 = [];
    for (var k = 0; k < 8; k += 2) r1.push({ p1: players[k].name, p2: players[k + 1].name, winner: null, score: null });
    tourney.rounds.push(r1);
    d.tournaments.push(tourney); saveData(d); renderTournaments();
}

function simulateTourneyRound(tId, roundIdx) {
    var d = getData(), t = d.tournaments.find(function(x) { return x.id === tId; });
    if (!t) return;
    var round = t.rounds[roundIdx]; if (!round) return;
    round.forEach(function(m) {
        if (m.winner) return;
        var isP1Human = m.p1 === currentUser, isP2Human = m.p2 === currentUser;
        if (isP1Human || isP2Human) { m.winner = isP1Human ? m.p1 : m.p2; m.score = '2-0'; }
        else { m.winner = Math.random() > 0.5 ? m.p1 : m.p2; m.score = Math.random() > 0.5 ? '2-1' : '2-0'; }
    });
    var winners = round.map(function(m) { return m.winner; });
    if (winners.length > 1) {
        var nr = [];
        for (var i = 0; i < winners.length; i += 2) nr.push({ p1: winners[i], p2: winners[i + 1] || 'BYE', winner: null, score: null });
        t.rounds.push(nr);
    } else { t.status = 'completed'; }
    var humanMatch = round.find(function(m) { return m.p1 === currentUser || m.p2 === currentUser; });
    if (humanMatch) {
        var won = humanMatch.winner === currentUser;
        addGameResult(currentUser, won ? 'win' : 'loss', humanMatch.winner === currentUser ? humanMatch.p2 : humanMatch.p1, t.status === 'completed' && won ? '3' : '1', 0);
    }
    saveData(d); renderTournaments(); renderHome(); renderProfile(); renderLeaderboard();
    if (t.status === 'completed' && humanMatch && humanMatch.winner === currentUser) {
        var m = document.createElement('div'); m.className = 'modal-overlay show'; m.style.zIndex = '200';
        m.innerHTML = '<div class="modal-box g-card p-8 text-center" style="min-width:280px;backdrop-filter:blur(16px);"><div class="text-5xl mb-3"><i class="fas fa-trophy" style="color:var(--accent);"></i></div><h2 class="font-display text-xl font-bold mb-2" style="color:var(--accent);">Juara Turnamen!</h2><p class="text-xs mb-5" style="color:var(--muted);">Selamat! Anda memenangkan turnamen.</p><button class="g-btn-primary g-btn text-xs" onclick="this.closest(\'.modal-overlay\').remove()">Lanjut</button></div>';
        document.body.appendChild(m);
    }
}

function renderTournaments() {
    var d = getData(), list = document.getElementById('tourney-list');
    var active = d.tournaments.filter(function(t) { return t.status === 'active'; });
    var completed = d.tournaments.filter(function(t) { return t.status === 'completed'; });
    var html = '';
    if (active.length) { html += '<h3 class="text-sm font-bold mb-3" style="color:#6ee7a0;">Berlangsung</h3>'; active.forEach(function(t) { html += renderTourneyCard(t); }); }
    if (completed.length) { html += '<h3 class="text-sm font-bold mb-3 mt-5" style="color:var(--muted);">Selesai</h3>'; completed.forEach(function(t) { html += renderTourneyCard(t); }); }
    if (!html) html = '<div class="text-center py-10 text-xs" style="color:var(--muted);">Belum ada turnamen. Buat turnamen baru!</div>';
    list.innerHTML = html;
    list.querySelectorAll('[data-play-round]').forEach(function(btn) {
        btn.addEventListener('click', function() { simulateTourneyRound(parseInt(btn.dataset.tourneyId), parseInt(btn.dataset.round)); });
    });
}

function renderTourneyCard(t) {
    var isFinal = t.status === 'completed';
    var bracketHtml = '<div class="bracket">';
    t.rounds.forEach(function(round, ri) {
        var label = ri === 0 ? 'Babak 1' : ri === t.rounds.length - 1 ? 'Final' : 'Semi Final';
        bracketHtml += '<div class="bracket-round"><div class="bracket-label">' + label + '</div>';
        round.forEach(function(m) {
            var w1 = m.winner === m.p1 ? 'winner' : 'loser', w2 = m.winner === m.p2 ? 'winner' : 'loser';
            bracketHtml += '<div class="bracket-match"><div class="bracket-slot ' + w1 + '"><span>' + m.p1 + '</span>' + (m.winner === m.p1 ? '<i class="fas fa-check text-[10px]"></i>' : '') + '</div><div class="bracket-slot ' + w2 + '"><span>' + m.p2 + '</span>' + (m.winner === m.p2 ? '<i class="fas fa-check text-[10px]"></i>' : '') + '</div></div>';
        });
        bracketHtml += '</div>';
    });
    bracketHtml += '</div>';
    var playBtn = '';
    if (!isFinal) {
        var nextRound = t.rounds.findIndex(function(r) { return r.some(function(m) { return !m.winner; }); });
        if (nextRound >= 0) {
            var hasHuman = t.rounds[nextRound].some(function(m) { return m.p1 === currentUser || m.p2 === currentUser; });
            if (hasHuman) playBtn = '<button class="g-btn-primary g-btn text-[10px] mt-3" data-play-round="1" data-tourney-id="' + t.id + '" data-round="' + nextRound + '"><i class="fas fa-play"></i> Mainkan Babak</button>';
            else playBtn = '<button class="g-btn text-[10px] mt-3" data-play-round="1" data-tourney-id="' + t.id + '" data-round="' + nextRound + '"><i class="fas fa-forward"></i> Simulasi</button>';
        }
    }
    var champion = isFinal && t.rounds.length ? t.rounds[t.rounds.length - 1][0].winner : '';
    return '<div class="tourney-card"><div class="flex items-center justify-between mb-2"><h4 class="font-bold text-sm">' + t.name + '</h4>' + (isFinal ? '<span class="result-badge result-win"><i class="fas fa-trophy mr-1"></i>' + champion + '</span>' : '<span class="text-[10px]" style="color:#6ee7a0;">Berlangsung</span>') + '</div>' + bracketHtml + playBtn + '</div>';
}
