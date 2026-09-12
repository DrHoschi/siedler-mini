export const RuntimeConfig = Object.freeze({
  product: 'Neue Siedler',
  build: 'IM-19D-AUTHORITATIVE-POPULATION-PROJECTION-TESTBUILD-2',
  simulation: Object.freeze({
    fixedStepMs: 100,
    maxCatchUpSteps: 4,
    phases: Object.freeze([
      'input','world','demand','assignment','intent','movement',
      'work','economy','recovery','events','maintenance'
    ])
  }),
  render: Object.freeze({ maxDevicePixelRatio: 2 }),
  dev: Object.freeze({ selfTestOnBoot: true })
});

// IM-19D final freeze verification: comment-only; no runtime semantics changed.
