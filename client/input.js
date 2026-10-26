import { INPUT } from "../shared/constants.js";

const MOVEMENT_KEYS = new Map([
  ["KeyW", INPUT.UP],
  ["ArrowUp", INPUT.UP],
  ["KeyS", INPUT.DOWN],
  ["ArrowDown", INPUT.DOWN],
  ["KeyA", INPUT.LEFT],
  ["ArrowLeft", INPUT.LEFT],
  ["KeyD", INPUT.RIGHT],
  ["ArrowRight", INPUT.RIGHT],
]);

const ACTION_KEYS = new Map([
  ["Space", INPUT.DASH],
  ["KeyR", INPUT.SHOCK],
  ["KeyE", INPUT.ULTIMATE],
]);

const ABILITY_MAP = {
  dash: INPUT.DASH,
  shock: INPUT.SHOCK,
  super: INPUT.ULTIMATE,
};

export class GameInput {
  constructor({
    canvas,
    movePad,
    moveKnob,
    abilityButtons,
    screenToWorld,
    onAction,
    getSelf = null,
    getAutoTarget = null,
    isAutoAim = () => true,
  }) {
    this.getSelf = getSelf;
    this.getAutoTarget = getAutoTarget;
    this.isAutoAim = isAutoAim;
    // mode sentuh: bidikan dari tombol serang (seret) atau bidik otomatis
    // pratinjau ponsel di laptop (?phone=1): mouse diperlakukan seperti sentuhan
    this.forceTouch = new URLSearchParams(location.search).has("phone");
    this.touchMode = this.forceTouch;
    this.manualAim = null;
    this.lastDir = null;
    this.attackPointerId = null;
    // seret tombol skill (Dash/Super) untuk membidik; lepas jauh dari tombol = batal
    this.skillDrag = null;
    this.skillDir = null;
    this.skillDirUntil = 0;
    this.canvas = canvas;
    this.movePad = movePad;
    this.moveKnob = moveKnob;
    this.abilityButtons = abilityButtons;
    this.screenToWorld = screenToWorld;
    this.onAction = onAction;
    this.enabled = false;
    this.keys = new Set();
    this.latches = new Map();
    this.joystick = { x: 0, y: 0, active: false, pointerId: null };
    this.mouseWorld = { x: 900, y: 500 };
    this.attackHeld = false;
    this.attackButtonHeld = false;
    this.lastPointer = { x: 0, y: 0 };
    this.bound = false;
    this.bind();
  }

  bind() {
    if (this.bound) return;
    this.bound = true;

    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
    window.addEventListener("blur", () => this.reset());
    window.addEventListener("pointerup", () => {
      this.attackHeld = false;
      this.attackButtonHeld = false;
      this.endJoystick();
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" || this.forceTouch) return;
      this.touchMode = false;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.mouseWorld = this.screenToWorld(event.clientX, event.clientY);
    });

    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.enabled) return;
      if (event.pointerType === "touch" || this.forceTouch) return; // sentuhan memakai tombol serang
      this.touchMode = false;
      if (event.button !== 0) return;
      this.mouseWorld = this.screenToWorld(event.clientX, event.clientY);
      this.attackHeld = true;
      this.onAction?.("shoot");
    });

    window.addEventListener("pointerup", (event) => {
      if (event.button === 0) this.attackHeld = false;
    });

    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    this.bindJoystick();
    this.bindAbilityButtons();
  }

  bindJoystick() {
    if (!this.movePad) return;
    this.movePad.addEventListener("pointerdown", (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      if (event.pointerType === "touch" || this.forceTouch) this.touchMode = true;
      this.joystick.active = true;
      this.joystick.pointerId = event.pointerId;
      this.movePad.setPointerCapture?.(event.pointerId);
      this.updateJoystick(event);
    });
    this.movePad.addEventListener("pointermove", (event) => {
      if (!this.joystick.active || event.pointerId !== this.joystick.pointerId) return;
      event.preventDefault();
      this.updateJoystick(event);
    });
    this.movePad.addEventListener("pointerup", (event) => {
      if (event.pointerId !== this.joystick.pointerId) return;
      this.endJoystick();
    });
    this.movePad.addEventListener("pointercancel", () => this.endJoystick());
  }

  bindAbilityButtons() {
    for (const button of this.abilityButtons) {
      const ability = button.dataset.ability;
      const aimable = ability === "dash" || ability === "super";
      button.addEventListener("contextmenu", (event) => event.preventDefault());
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (!this.enabled) return;
        if (event.pointerType === "touch" || event.pointerType === "pen" || this.forceTouch) this.touchMode = true;
        if (ability === "attack") {
          this.attackButtonHeld = true;
          this.attackPointerId = event.pointerId;
          this.manualAim = null;
          button.setPointerCapture?.(event.pointerId);
          this.onAction?.("shoot");
          return;
        }
        if (aimable && (event.pointerType !== "mouse" || this.forceTouch)) {
          const rect = button.getBoundingClientRect();
          this.skillDrag = {
            ability,
            id: event.pointerId,
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            size: rect.width,
            dir: null,
            cancel: false,
          };
          button.setPointerCapture?.(event.pointerId);
          return;
        }
        this.pressAbility(ability);
      });

      button.addEventListener("pointermove", (event) => {
        if (ability === "attack") {
          // seret tombol serang untuk membidik manual; tap biasa = bidik otomatis
          if (!this.attackButtonHeld || event.pointerId !== this.attackPointerId || !this.touchMode) return;
          const rect = button.getBoundingClientRect();
          const dx = event.clientX - (rect.left + rect.width / 2);
          const dy = event.clientY - (rect.top + rect.height / 2);
          const distance = Math.hypot(dx, dy);
          this.manualAim = distance > rect.width * 0.28 ? { x: dx / distance, y: dy / distance } : null;
          return;
        }
        const drag = this.skillDrag;
        if (!drag || drag.id !== event.pointerId || drag.ability !== ability) return;
        const dx = event.clientX - drag.cx;
        const dy = event.clientY - drag.cy;
        const distance = Math.hypot(dx, dy);
        if (distance > drag.size * 0.45) {
          drag.dir = { x: dx / distance, y: dy / distance };
          drag.cancel = distance > drag.size * 2.6;
        } else {
          drag.dir = null;
          drag.cancel = false;
        }
      });

      const release = (event) => {
        if (ability === "attack") {
          if (event?.pointerId !== undefined && event.pointerId !== this.attackPointerId) return;
          this.attackButtonHeld = false;
          this.manualAim = null;
          this.attackPointerId = null;
          return;
        }
        const drag = this.skillDrag;
        if (!drag || drag.id !== event?.pointerId || drag.ability !== ability) return;
        this.skillDrag = null;
        if (event.type === "pointercancel" || drag.cancel) {
          if (drag.cancel) this.onAction?.("cancel");
          return;
        }
        if (drag.dir) {
          this.skillDir = drag.dir;
          this.skillDirUntil = performance.now() + 260;
        }
        this.pressAbility(ability);
      };
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
    }
  }

  /** Sedang menyeret skill untuk membidik (dipakai untuk indikator arah). */
  get skillAiming() {
    return Boolean(this.skillDrag?.dir) && !this.skillDrag.cancel;
  }

  /** Jari digeser terlalu jauh dari tombol skill: pelepasan akan membatalkan skill. */
  get skillCancel() {
    return Boolean(this.skillDrag?.cancel);
  }

  updateJoystick(event) {
    const rect = this.movePad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const maxRadius = rect.width * 0.31;
    const distance = Math.hypot(dx, dy);
    const scale = distance > maxRadius ? maxRadius / distance : 1;
    const x = (dx * scale) / maxRadius;
    const y = (dy * scale) / maxRadius;
    this.joystick.x = x;
    this.joystick.y = y;
    this.joystick.active = true;
    if (this.moveKnob) {
      this.moveKnob.style.transform = `translate(${x * maxRadius}px, ${y * maxRadius}px)`;
    }
  }

  endJoystick() {
    this.joystick.active = false;
    this.joystick.x = 0;
    this.joystick.y = 0;
    this.joystick.pointerId = null;
    if (this.moveKnob) this.moveKnob.style.transform = "translate(0, 0)";
  }

  onKeyDown(event) {
    if (!this.enabled) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

    if (MOVEMENT_KEYS.has(event.code)) {
      event.preventDefault();
      this.keys.add(event.code);
      return;
    }

    if (ACTION_KEYS.has(event.code)) {
      event.preventDefault();
      if (!event.repeat) this.latch(ACTION_KEYS.get(event.code));
      return;
    }

    if (event.code === "KeyJ") {
      event.preventDefault();
      this.attackHeld = true;
      return;
    }

    if (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3" || event.code === "Digit4") {
      const index = Number(event.code.slice(-1)) - 1;
      this.onAction?.("quiz", index);
    }
  }

  onKeyUp(event) {
    if (MOVEMENT_KEYS.has(event.code)) {
      this.keys.delete(event.code);
    }
    if (event.code === "KeyJ") {
      this.attackHeld = false;
    }
  }

  latch(bit) {
    this.latches.set(bit, performance.now() + 120);
  }

  pressAbility(ability) {
    const bit = ABILITY_MAP[ability];
    if (!bit) return;
    this.latch(bit);
    this.onAction?.("ability", ability);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  reset() {
    this.skillDrag = null;
    this.skillDir = null;
    this.manualAim = null;
    this.attackPointerId = null;
    this.keys.clear();
    this.latches.clear();
    this.attackHeld = false;
    this.attackButtonHeld = false;
    this.endJoystick();
  }

  getAim() {
    if (this.touchMode) return this.getTouchAim();
    // kamera mengikuti hero, jadi titik dunia di bawah kursor harus dihitung ulang tiap frame
    if (this.lastPointer) this.mouseWorld = this.screenToWorld(this.lastPointer.x, this.lastPointer.y);
    return this.mouseWorld;
  }

  /**
   * Bidikan sentuh, urutan prioritas:
   * 1) seretan tombol serang, 2) target otomatis terdekat, 3) arah joystick, 4) arah terakhir.
   */
  getTouchAim() {
    const self = this.getSelf?.();
    if (!self) return this.mouseWorld;
    let dir = null;
    if (this.skillDrag?.dir) {
      dir = this.skillDrag.dir;
    } else if (this.skillDir && performance.now() < this.skillDirUntil) {
      dir = this.skillDir;
    } else if (this.manualAim) {
      dir = this.manualAim;
    } else {
      const autoAim = this.isAutoAim();
      const moving = this.joystick.active && Math.hypot(this.joystick.x, this.joystick.y) > 0.3;
      const target = autoAim ? this.getAutoTarget?.() : null;
      if (target && (this.attackButtonHeld || !moving)) {
        const dx = target.x - self.x;
        const dy = target.y - self.y;
        const length = Math.hypot(dx, dy) || 1;
        dir = { x: dx / length, y: dy / length };
      } else if (moving) {
        const length = Math.hypot(this.joystick.x, this.joystick.y) || 1;
        dir = { x: this.joystick.x / length, y: this.joystick.y / length };
      }
    }
    if (!dir) dir = this.lastDir ?? { x: self.slot === 0 ? 1 : -1, y: 0 };
    this.lastDir = dir;
    this.mouseWorld = { x: self.x + dir.x * 600, y: self.y + dir.y * 600 };
    return this.mouseWorld;
  }

  getMask(now = performance.now()) {
    let mask = 0;
    for (const code of this.keys) {
      mask |= MOVEMENT_KEYS.get(code) ?? 0;
    }

    if (this.joystick.active) {
      if (this.joystick.x > 0.24) mask |= INPUT.RIGHT;
      if (this.joystick.x < -0.24) mask |= INPUT.LEFT;
      if (this.joystick.y > 0.24) mask |= INPUT.DOWN;
      if (this.joystick.y < -0.24) mask |= INPUT.UP;
    }

    if (this.attackHeld || this.attackButtonHeld) mask |= INPUT.ATTACK;

    for (const [bit, expiry] of this.latches) {
      if (expiry > now) mask |= bit;
      else this.latches.delete(bit);
    }

    return mask;
  }
}
