import {
  DEFAULT_FX_SETTINGS,
  FX_TIERS,
  lowerTier,
  normalizeFxSettings,
  resolveFx,
} from "../shared/fx.js";

const STORAGE_KEY = "logicodix.fx";
const FPS_FLOOR = 25;
const FPS_WINDOW_MS = 3000;

/** Ilustrasi jumpscare prosedural (placeholder gaya; aset final dari tim art menggantikan). */
const SCARES = {
  reog: `<svg viewBox="0 0 200 200"><g fill="none"><ellipse cx="100" cy="30" rx="70" ry="22" fill="#0f766e"/><ellipse cx="100" cy="100" rx="62" ry="70" fill="#8B1A1A" stroke="#D4AF37" stroke-width="6"/><path d="M50 70 Q75 52 90 72 M150 70 Q125 52 110 72" stroke="#1A1A1A" stroke-width="9" stroke-linecap="round"/><circle cx="76" cy="90" r="15" fill="#fef9c3"/><circle cx="124" cy="90" r="15" fill="#fef9c3"/><circle cx="80" cy="90" r="7" fill="#1A1A1A"/><circle cx="128" cy="90" r="7" fill="#1A1A1A"/><path d="M52 128 Q100 160 148 128 Q120 120 100 134 Q80 120 52 128Z" fill="#1A1A1A"/><path d="M82 146 L88 166 L94 148 M106 148 L112 166 L118 146" stroke="#f8fafc" stroke-width="4"/></g></svg>`,
  palapa: `<div class="fx-text">PALAPA</div>`,
  rangda: `<svg viewBox="0 0 200 200"><g fill="none"><path d="M20 120 L40 20 L70 70 L100 6 L130 70 L160 20 L180 120 Z" fill="#2D0A3A"/><ellipse cx="100" cy="112" rx="66" ry="74" fill="#F5F5DC"/><ellipse cx="72" cy="92" rx="17" ry="12" fill="#fde047"/><ellipse cx="128" cy="92" rx="17" ry="12" fill="#fde047"/><circle cx="72" cy="92" r="6" fill="#b91c1c"/><circle cx="128" cy="92" r="6" fill="#b91c1c"/><path d="M56 70 L90 84 M144 70 L110 84" stroke="#7f1d1d" stroke-width="7" stroke-linecap="round"/><path d="M58 138 Q100 176 142 138 Q100 150 58 138Z" fill="#1c0b0b"/><path d="M72 142 L78 162 L84 146 M116 146 L122 162 L128 142" stroke="#fff" stroke-width="5"/><path d="M96 150 L100 196 L106 150Z" fill="#e11d48"/></g></svg>`,
  eyes: `<svg viewBox="0 0 200 120"><g><ellipse cx="55" cy="60" rx="42" ry="34" fill="#F0F8FF"/><ellipse cx="145" cy="60" rx="42" ry="34" fill="#F0F8FF"/><circle cx="55" cy="60" r="20" fill="#0A4D4A"/><circle cx="145" cy="60" r="20" fill="#0A4D4A"/><circle cx="55" cy="60" r="8" fill="#021a19"/><circle cx="145" cy="60" r="8" fill="#021a19"/><path d="M0 108 Q25 90 50 108 T100 108 T150 108 T200 108" stroke="#38bdf8" stroke-width="6" fill="none"/></g></svg>`,
  animalEyes: `<svg viewBox="0 0 200 80"><g><ellipse cx="55" cy="40" rx="22" ry="12" fill="#f59e0b"/><ellipse cx="145" cy="40" rx="22" ry="12" fill="#f59e0b"/><rect x="52" y="26" width="6" height="28" rx="3" fill="#1a0f08"/><rect x="142" y="26" width="6" height="28" rx="3" fill="#1a0f08"/></g></svg>`,
  smokeFace: `<svg viewBox="0 0 200 200"><g opacity="0.7"><ellipse cx="100" cy="100" rx="58" ry="72" fill="#e2e8f0" opacity="0.35"/><ellipse cx="78" cy="88" rx="11" ry="16" fill="#0f172a" opacity="0.8"/><ellipse cx="122" cy="88" rx="11" ry="16" fill="#0f172a" opacity="0.8"/><ellipse cx="100" cy="140" rx="10" ry="18" fill="#0f172a" opacity="0.6"/></g></svg>`,
};

/**
 * Efek layar saat ultimate: grading/vignette, flash, jumpscare, getar, dan stinger audio.
 * Semuanya murni visual/audio dan mengikuti level, tier, serta toggle aksesibilitas.
 */
export class ScreenFx {
  constructor({ grade, flash, scare, audio, onTierChange = null }) {
    this.grade = grade;
    this.flash = flash;
    this.scare = scare;
    this.audio = audio;
    this.onTierChange = onTierChange;
    this.settings = this.load();
    this.autoTier = "full";
    this.active = false;
    this.samples = [];
    this.lastFrame = 0;
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  }

  get tier() {
    return this.settings.tier === "auto" ? this.autoTier : this.settings.tier;
  }

  load() {
    try {
      return normalizeFxSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch {
      return normalizeFxSettings(null);
    }
  }

  update(patch) {
    this.settings = normalizeFxSettings({ ...this.settings, ...patch });
    if (patch.tier === "auto") this.autoTier = "full";
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Penyimpanan bisa tidak tersedia; pengaturan tetap berlaku selama sesi.
    }
  }

  setActive(active) {
    this.active = active;
    this.samples = [];
    this.lastFrame = 0;
  }

  /** Pantau FPS saat bertanding; turun tier otomatis bila <25 FPS selama 3 detik. */
  frame(now) {
    if (!this.active || this.settings.tier !== "auto") return;
    if (this.lastFrame) this.samples.push({ at: now, dt: now - this.lastFrame });
    this.lastFrame = now;
    while (this.samples.length && now - this.samples[0].at > FPS_WINDOW_MS) this.samples.shift();
    if (this.samples.length < 30 || now - this.samples[0].at < FPS_WINDOW_MS - 200) return;
    const averageDt = this.samples.reduce((sum, sample) => sum + sample.dt, 0) / this.samples.length;
    if (1000 / averageDt >= FPS_FLOOR) return;
    const next = lowerTier(this.autoTier);
    this.samples = [];
    if (next === this.autoTier) return;
    this.autoTier = next;
    this.onTierChange?.(next);
  }

  trigger(heroId, { shakeTarget = null } = {}) {
    const fx = resolveFx(heroId, this.settings, this.tier, {
      reducedMotion: Boolean(this.reducedMotion?.matches),
    });
    this.audio?.stinger?.(fx.stinger);
    if (fx.grade) this.playGrade(fx.grade);
    if (fx.flash) this.playFlash(fx.flash);
    if (fx.jumpscare) this.playScare(fx.jumpscare);
    if (fx.shake && shakeTarget) this.playShake(shakeTarget, fx.shake);
    return fx;
  }

  playGrade({ color, peak, ms }) {
    this.grade.style.background = `radial-gradient(ellipse at center, ${color}00 28%, ${color} 100%)`;
    this.grade.animate(
      [{ opacity: 0 }, { opacity: peak, offset: 0.25 }, { opacity: peak * 0.7, offset: 0.6 }, { opacity: 0 }],
      { duration: ms, easing: "ease-out" },
    );
  }

  playFlash({ color, ms }) {
    this.flash.style.background = color;
    this.flash.animate([{ opacity: 0 }, { opacity: 0.45, offset: 0.2 }, { opacity: 0 }], { duration: ms });
  }

  playScare({ kind, ms }) {
    this.scare.innerHTML = SCARES[kind] ?? "";
    this.scare.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], {
      duration: ms,
    });
    this.scare.firstElementChild?.animate?.(
      [{ transform: "scale(0.65)" }, { transform: "scale(1.12)" }],
      { duration: ms, easing: "ease-out" },
    );
  }

  playShake(target, { amount, ms }) {
    const steps = Math.max(4, Math.round(ms / 40));
    const amplitude = amount * 16;
    const frames = [];
    for (let step = 0; step < steps; step += 1) {
      const decay = 1 - step / steps;
      frames.push({
        transform: `translate(${(Math.random() * 2 - 1) * amplitude * decay}px, ${(Math.random() * 2 - 1) * amplitude * decay}px)`,
      });
    }
    frames.push({ transform: "translate(0, 0)" });
    target.animate(frames, { duration: ms, easing: "linear" });
  }
}

export { DEFAULT_FX_SETTINGS, FX_TIERS };
