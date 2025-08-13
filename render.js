// render.js
// Fix: default-Export *und* Named-Exports aus core/render.js korrekt re-exportieren

// default (z.B. createRenderer) weiterreichen:
export { default } from './core/render.js';

// und zusätzlich alle benannten Exporte:
export * from './core/render.js';
