export class Renderer {
  #canvas;
  #ctx;

  constructor(canvas, config) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('canvas required');
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.config = config;
  }

  resize() {
    const rect = this.#canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.render.maxDevicePixelRatio);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.#canvas.width !== w || this.#canvas.height !== h) {
      this.#canvas.width = w;
      this.#canvas.height = h;
    }
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render() {
    this.resize();
    const { width, height } = this.#canvas.getBoundingClientRect();
    this.#ctx.clearRect(0, 0, width, height);
  }
}
