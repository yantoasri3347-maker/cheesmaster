/* ================================================================
   audio.js — Efek Suara (Web Audio API)
   ================================================================ */

var soundOn = true;
var audioCtx = null;

function getAC() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playSound(type) {
    if (!soundOn) return;
    try {
        var ctx = getAC(), t = ctx.currentTime;
        if (type === 'move') {
            var o = ctx.createOscillator(), g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.06);
            g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
            o.start(t); o.stop(t + 0.09);
        } else if (type === 'capture') {
            var o2 = ctx.createOscillator(), g2 = ctx.createGain();
            o2.connect(g2); g2.connect(ctx.destination);
            o2.type = 'sawtooth'; o2.frequency.setValueAtTime(300, t); o2.frequency.exponentialRampToValueAtTime(150, t + 0.15);
            g2.gain.setValueAtTime(0.1, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            o2.start(t); o2.stop(t + 0.18);
        } else if (type === 'check') {
            var o3 = ctx.createOscillator(), g3 = ctx.createGain();
            o3.connect(g3); g3.connect(ctx.destination);
            o3.type = 'square'; o3.frequency.setValueAtTime(880, t); o3.frequency.setValueAtTime(660, t + 0.08);
            g3.gain.setValueAtTime(0.05, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            o3.start(t); o3.stop(t + 0.2);
        } else if (type === 'checkmate') {
            var freqs = [523, 659, 784, 1047];
            for (var i = 0; i < freqs.length; i++) {
                var oi = ctx.createOscillator(), gi = ctx.createGain();
                oi.connect(gi); gi.connect(ctx.destination);
                oi.type = 'sine'; oi.frequency.value = freqs[i];
                gi.gain.setValueAtTime(0.08, t + i * 0.12); gi.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
                oi.start(t + i * 0.12); oi.stop(t + i * 0.12 + 0.3);
            }
        }
    } catch (e) { /* Abaikan error audio */ }
}
