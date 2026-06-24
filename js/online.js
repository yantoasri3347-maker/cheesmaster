/* ================================================================
   online.js — Multiplayer Online via WebRTC (PeerJS)
   ================================================================ */

var PEER_JS = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
var peer = null, conn = null, isHost = false, roomId = '', peerReady = false;

function loadPeerJS() {
    return new Promise(function(resolve, reject) {
        if (window.Peer) { resolve(); return; }
        var s = document.createElement('script');
        s.src = PEER_JS; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });
}

function genRoomId() {
    var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = '';
    for (var i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
    return r;
}

async function createRoom() {
    try { await loadPeerJS(); } catch (e) { return; }
    roomId = genRoomId(); isHost = true;
    peer = new Peer('cm-' + roomId, { debug: 0 });
    peer.on('open', function() {
        peerReady = true;
        document.getElementById('room-code-display').textContent = roomId;
        document.getElementById('room-info').classList.remove('hidden');
        document.getElementById('join-info').classList.add('hidden');
        document.getElementById('room-status').textContent = 'Menunggu pemain...';
    });
    peer.on('connection', function(c) { conn = c; setupConn(); });
    peer.on('error', function(e) {
        if (e.type === 'unavailable-id') { roomId = genRoomId(); peer.destroy(); createRoom(); }
    });
}

async function joinRoom() {
    var code = document.getElementById('join-code-input').value.trim().toUpperCase();
    if (code.length !== 6) return;
    try { await loadPeerJS(); } catch (e) { return; }
    isHost = false; roomId = code;
    peer = new Peer(undefined, { debug: 0 });
    peer.on('open', function() {
        conn = peer.connect('cm-' + code, { reliable: true });
        setupConn();
    });
    peer.on('error', function() { /* Room tidak ditemukan */ });
}

function setupConn() {
    conn.on('open', function() {
        document.getElementById('room-status').textContent = 'Terhubung!';
        setTimeout(startOnlineGame, 500);
    });
    conn.on('data', function(d) { handleNetMsg(d); });
    conn.on('close', function() {
        if (!gameOver) { gameOver = true; gameResult = 'Lawan Terputus'; showGameOver(); }
    });
}

function handleNetMsg(d) {
    if (d.type === 'start') startOnlineGame();
    else if (d.type === 'move') animateAndExec(d.fr, d.fc, d.tr, d.tc, d.promo || null);
    else if (d.type === 'name') {
        if (isHost) document.getElementById('name-top').textContent = d.name;
        else document.getElementById('name-bottom').textContent = d.name;
    }
}

function sendNetMsg(d) { if (conn && conn.open) conn.send(d); }

function startOnlineGame() {
    gameMode = 'online'; hideModals(); initGameBoard();
    isHost ? (aiColor = 'black') : (aiColor = 'white');
    document.getElementById('online-ind-top').classList.remove('hidden');
    document.getElementById('online-ind-bot').classList.remove('hidden');
    if (isHost) { sendNetMsg({ type: 'start' }); sendNetMsg({ type: 'name', name: currentUser }); }
    else { sendNetMsg({ type: 'name', name: currentUser }); }
    document.getElementById('name-bottom').textContent = isHost ? currentUser : '...';
    document.getElementById('name-top').textContent = isHost ? '...' : currentUser;
    renderAll();
}

function closeOnline() {
    if (conn) { try { conn.close(); } catch (e) {} }
    if (peer) { try { peer.destroy(); } catch (e) {} }
    conn = null; peer = null; peerReady = false; roomId = '';
    document.getElementById('room-info').classList.add('hidden');
    document.getElementById('join-info').classList.add('hidden');
    document.getElementById('online-ind-top').classList.add('hidden');
    document.getElementById('online-ind-bot').classList.add('hidden');
}
