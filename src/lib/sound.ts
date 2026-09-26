"use client";

// Tonos generados con Web Audio para no depender de archivos de sonido.
// Los navegadores solo permiten audio después de una interacción del usuario,
// por eso las pantallas tienen un botón "Activar sonido" que llama a unlockAudio().
let ctx: AudioContext | null = null;

export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx.state !== "closed";
}

export function beep(notes: number[] = [880, 1175], duration = 0.18) {
  if (!ctx || ctx.state !== "running") return;
  notes.forEach((freq, i) => {
    const start = ctx!.currentTime + i * duration;
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + duration);
  });
}
