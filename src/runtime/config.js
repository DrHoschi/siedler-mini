export const RuntimeConfig = Object.freeze({
  product: 'Neue Siedler',
  build: 'IM-20B-POST-IM13-AUTHORITATIVE-SNAPSHOT-INTEGRATION-TESTBUILD-2',
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
