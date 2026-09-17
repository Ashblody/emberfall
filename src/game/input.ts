export class Input {
  keys = new Set<string>();
  moveX = 0;
  moveY = 0;
  skillBasic = false;
  skillSpiral = false;
  skillAshwake = false;
  private stickActive = false;
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private stickRadius = 48;
  private stickEl: HTMLElement;
  private knobEl: HTMLElement;

  constructor(
    stickEl: HTMLElement,
    knobEl: HTMLElement,
    btnBasic: HTMLElement,
    btnSpiral: HTMLElement,
    btnAshwake: HTMLElement,
  ) {
    this.stickEl = stickEl;
    this.knobEl = knobEl;
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === '1') this.skillBasic = true;
      if (e.key === '2') this.skillSpiral = true;
      if (e.key === '3') this.skillAshwake = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));

    const bindBtn = (el: HTMLElement, flag: 'skillBasic' | 'skillSpiral' | 'skillAshwake') => {
      const down = (e: Event) => {
        e.preventDefault();
        el.classList.add('pressed');
        this[flag] = true;
      };
      const up = () => el.classList.remove('pressed');
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    };
    bindBtn(btnBasic, 'skillBasic');
    bindBtn(btnSpiral, 'skillSpiral');
    bindBtn(btnAshwake, 'skillAshwake');

    const onStickStart = (e: PointerEvent) => {
      if (this.stickActive) return;
      e.preventDefault();
      this.stickActive = true;
      this.stickId = e.pointerId;
      const rect = this.stickEl.getBoundingClientRect();
      this.stickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.stickEl.setPointerCapture(e.pointerId);
      this.updateStick(e.clientX, e.clientY);
    };
    const onStickMove = (e: PointerEvent) => {
      if (!this.stickActive || e.pointerId !== this.stickId) return;
      e.preventDefault();
      this.updateStick(e.clientX, e.clientY);
    };
    const onStickEnd = (e: PointerEvent) => {
      if (e.pointerId !== this.stickId) return;
      this.stickActive = false;
      this.stickId = null;
      this.moveX = 0;
      this.moveY = 0;
      this.knobEl.style.left = '35px';
      this.knobEl.style.top = '35px';
    };
    this.stickEl.addEventListener('pointerdown', onStickStart);
    this.stickEl.addEventListener('pointermove', onStickMove);
    this.stickEl.addEventListener('pointerup', onStickEnd);
    this.stickEl.addEventListener('pointercancel', onStickEnd);
  }

  private updateStick(cx: number, cy: number) {
    let dx = cx - this.stickOrigin.x;
    let dy = cy - this.stickOrigin.y;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, this.stickRadius);
    dx = (dx / len) * clamped;
    dy = (dy / len) * clamped;
    this.moveX = dx / this.stickRadius;
    this.moveY = dy / this.stickRadius;
    this.knobEl.style.left = `${35 + dx}px`;
    this.knobEl.style.top = `${35 + dy}px`;
  }

  pollMove(): { x: number; y: number } {
    let x = this.moveX;
    let y = this.moveY;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  consumeSkills() {
    const out = {
      basic: this.skillBasic,
      spiral: this.skillSpiral,
      ashwake: this.skillAshwake,
    };
    this.skillBasic = false;
    this.skillSpiral = false;
    this.skillAshwake = false;
    return out;
  }
}
