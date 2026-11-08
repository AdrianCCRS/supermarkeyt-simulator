/*
 * Sonido del juego, sintetizado con WebAudio (sin archivos de audio): efectos de 8 bits y una musiquita de fondo.
 *   Sonido.tocar('escaner')      un efecto (ver RECETAS)
 *   Sonido.musica(true / false)  la musiquita de la tienda
 *   Sonido.alternar()            silencia / activa todo (tecla M o botón); se recuerda entre visitas
 * Los navegadores no dejan sonar nada hasta el primer clic o tecla del jugador: hasta entonces los sonidos se descartan.
 */
const Sonido = (function () {
    const CLAVE = 'sonido';
    let ctx = null, maestro = null, efectos = null, musicaGain = null, ruidoBuf = null;
    let activo = true;
    try { activo = localStorage.getItem(CLAVE) !== '0'; } catch (e) { /* sin almacenamiento */ }

    const nota = (m) => 440 * Math.pow(2, (m - 69) / 12);

    /** Crea el contexto de audio la primera vez (y lo reanuda si el navegador lo tenía dormido). */
    function asegurar() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) { return null; }
            try {
                ctx = new AC();
                maestro = ctx.createGain();
                maestro.gain.value = activo ? 0.6 : 0;
                maestro.connect(ctx.destination);
                efectos = ctx.createGain(); efectos.gain.value = 1; efectos.connect(maestro);
                musicaGain = ctx.createGain(); musicaGain.gain.value = 0.5; musicaGain.connect(maestro);
            } catch (e) { ctx = null; return null; }
        }
        if (ctx.state === 'suspended') { ctx.resume(); }
        return ctx;
    }

    /** Un tono: frecuencia (con deslizamiento opcional hasta `hasta`), duración y volumen, con caída rápida. */
    function tono(freq, dur, o) {
        o = o || {};
        const t0 = ctx.currentTime + (o.en || 0);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = o.tipo || 'square';
        osc.frequency.setValueAtTime(freq, t0);
        if (o.hasta) { osc.frequency.exponentialRampToValueAtTime(o.hasta, t0 + dur); }
        const v = o.vol === undefined ? 0.15 : o.vol;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(v, t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g); g.connect(o.destino || efectos);
        osc.start(t0); osc.stop(t0 + dur + 0.02);
    }

    /** Ruido filtrado (roces, billetes, bolsa). */
    function ruido(dur, o) {
        o = o || {};
        if (!ruidoBuf) {
            ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const d = ruidoBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) { d[i] = Math.random() * 2 - 1; }
        }
        const t0 = ctx.currentTime + (o.en || 0);
        const src = ctx.createBufferSource(); src.buffer = ruidoBuf;
        const f = ctx.createBiquadFilter(); f.type = o.filtro || 'bandpass'; f.frequency.value = o.freq || 2000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(o.vol === undefined ? 0.2 : o.vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(f); f.connect(g); g.connect(efectos);
        src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
    }

    const RECETAS = {
        tecla()    { tono(880, 0.04, { vol: 0.08 }); },
        coger()    { tono(420, 0.03, { vol: 0.06, tipo: 'triangle' }); },
        escaner()  { tono(1500, 0.07, { vol: 0.1 }); tono(2000, 0.09, { vol: 0.1, en: 0.07 }); },
        pesa()     { tono(520, 0.05, { vol: 0.08, tipo: 'triangle' }); tono(780, 0.07, { vol: 0.08, tipo: 'triangle', en: 0.05 }); },
        bolsa()    { ruido(0.09, { freq: 500, filtro: 'lowpass', vol: 0.25 }); tono(180, 0.07, { tipo: 'triangle', vol: 0.12 }); },
        anular()   { tono(500, 0.08, { hasta: 250, tipo: 'triangle', vol: 0.1 }); },
        error()    { tono(160, 0.2, { hasta: 110, tipo: 'sawtooth', vol: 0.1 }); },
        billete()  { ruido(0.14, { freq: 3200, vol: 0.12 }); },
        cobro()    { ruido(0.05, { freq: 5000, vol: 0.1 }); tono(1319, 0.08, { vol: 0.1 }); tono(1760, 0.4, { vol: 0.1, en: 0.08, tipo: 'triangle' }); },
        moneda()   { tono(2400, 0.06, { vol: 0.07, tipo: 'triangle' }); tono(3200, 0.1, { vol: 0.07, tipo: 'triangle', en: 0.07 }); },
        recibo()   { for (let i = 0; i < 8; i++) { ruido(0.03, { freq: 2500, vol: 0.1, en: i * 0.07 }); } },
        entregar() { ruido(0.25, { freq: 900, vol: 0.12 }); },
        campana()  { tono(784, 0.22, { tipo: 'sine', vol: 0.12 }); tono(659, 0.35, { tipo: 'sine', vol: 0.12, en: 0.2 }); },
        celebrar() { [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.1, { vol: 0.09, en: i * 0.08 })); },
        protesta() { tono(420, 0.4, { hasta: 170, tipo: 'sawtooth', vol: 0.1 }); },
        alerta()   { tono(700, 0.07, { vol: 0.07 }); tono(700, 0.07, { vol: 0.07, en: 0.12 }); },
        abandono() { tono(500, 0.55, { hasta: 110, vol: 0.1 }); },
        abrir()    { [392, 523, 659, 784].forEach((f, i) => tono(f, 0.14, { vol: 0.1, en: i * 0.1 })); },
        cerrar()   { [784, 659, 523, 392].forEach((f, i) => tono(f, 0.16, { vol: 0.1, en: i * 0.12 })); }
    };

    /** Toca un efecto. Silencio si está desactivado o el navegador aún no permite audio. */
    function tocar(nombre) {
        if (!activo || !RECETAS[nombre]) { return; }
        if (!asegurar() || ctx.state !== 'running') { return; }
        try { RECETAS[nombre](); } catch (e) { /* un fallo de audio no debe romper el juego */ }
    }

    // ---- Musiquita: Do · La menor · Fa · Sol, en corcheas, con bajo y melodía en arpegio ----
    const ACORDES = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
    const MELODIA = [0, 1, 2, 3, 2, 1, 2, 1, 0, 2, 3, 2, 1, 2, 1, 0];
    const PASO = 60 / 112 / 2;                       // una corchea a 112 negras por minuto
    let sonando = false, temporizador = null, proxima = 0, paso = 0;

    function planificar() {
        if (!ctx || ctx.state !== 'running') { proxima = ctx ? ctx.currentTime + 0.1 : 0; return; }
        while (proxima < ctx.currentTime + 0.3) {
            const acorde = ACORDES[Math.floor(paso / 8) % 4];
            const p = paso % 8;
            const en = Math.max(0, proxima - ctx.currentTime);
            tono(nota(acorde[MELODIA[paso % 16] % 4]), PASO * 0.9, { vol: 0.05, en, destino: musicaGain });
            if (p % 4 === 0) { tono(nota(acorde[0] - 12), PASO * 3.5, { vol: 0.12, tipo: 'triangle', en, destino: musicaGain }); }
            if (p === 2 || p === 6) { tono(nota(acorde[2] - 12), PASO * 1.5, { vol: 0.06, tipo: 'triangle', en, destino: musicaGain }); }
            proxima += PASO; paso++;
        }
    }

    function musica(encender) {
        if (encender === sonando) { return; }
        sonando = encender;
        if (encender) {
            asegurar();
            proxima = ctx ? ctx.currentTime + 0.1 : 0;
            temporizador = setInterval(planificar, 100);
        } else {
            clearInterval(temporizador);
            temporizador = null;
        }
    }

    function alternar() {
        activo = !activo;
        try { localStorage.setItem(CLAVE, activo ? '1' : '0'); } catch (e) { /* nada */ }
        if (asegurar()) { maestro.gain.value = activo ? 0.6 : 0; }
        actualizarBoton();
        if (activo) { tocar('tecla'); }
    }

    function actualizarBoton() {
        const b = document.getElementById('btn-sonido');
        if (b) { b.textContent = activo ? 'SONIDO: SI' : 'SONIDO: NO'; b.setAttribute('aria-pressed', activo ? 'true' : 'false'); }
    }

    // El navegador solo deja sonar tras un gesto del jugador
    ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, asegurar, { capture: true }));
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) { alternar(); }
    });
    document.addEventListener('DOMContentLoaded', () => {
        const b = document.getElementById('btn-sonido');
        if (b) { b.addEventListener('click', alternar); }
        actualizarBoton();
    });

    return { tocar, musica, alternar, activo: () => activo, contexto: () => ctx };
})();
