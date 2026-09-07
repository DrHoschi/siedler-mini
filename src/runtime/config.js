export const RuntimeConfig = Object.freeze({
  product: 'Neue Siedler',
  build: 'CR-32B-DETERMINISTIC-PATH-USAGE-WEAR-ACCUMULATION-INTEGRATION',
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
