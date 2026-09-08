import { RuntimeConfig } from './runtime/config.js?v=im14c-1';

const EXPECTED_BUILD = 'IM-14C-RUNTIME-HUD-PROJECTION';
const testEl = document.querySelector('#test-status');
const runtime = window.CleanRuntime;
const hud = window.IM14CRuntimeHud;

function fail(message) {
  if (testEl) {
    testEl.textContent = `IM-14C — Runtime HUD Projection — FAIL — ${message}`;
    testEl.dataset.pass = 'false';
  }
}

try {
  if (!runtime?.housingPopulation?.population || !runtime?.goldEconomy) {
    throw new Error('authoritative Runtime sources unavailable');
  }
  if (!hud?.project || !hud?.refresh) {
    throw new Error('Runtime HUD projection boundary unavailable');
  }

  const populationBefore = runtime.housingPopulation.population.count;
  const goldBefore = runtime.goldEconomy.snapshot().balance;

  const projected = hud.project(runtime);
  const refreshed = hud.refresh(runtime, document);

  const populationAfter = runtime.housingPopulation.population.count;
  const goldAfter = runtime.goldEconomy.snapshot().balance;
  const populationEl = document.querySelector('#hud-population');
  const goldEl = document.querySelector('#hud-gold');

  const populationPass = projected.populationCount === populationBefore
    && refreshed.populationCount === populationBefore
    && populationEl?.dataset.value === String(populationBefore);
  const goldPass = projected.goldBalance === goldBefore
    && refreshed.goldBalance === goldBefore
    && goldEl?.dataset.value === String(goldBefore);
  const readOnlyPass = populationBefore === populationAfter && goldBefore === goldAfter;
  const deterministicPass = JSON.stringify(projected) === JSON.stringify(hud.project(runtime));
  const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
  const pass = populationPass && goldPass && readOnlyPass && deterministicPass && buildPass;

  if (testEl) {
    testEl.textContent = `IM-14C — Runtime HUD Projection — ${pass ? 'PASS' : 'FAIL'} — Population Source ${populationPass ? 'PASS' : 'FAIL'} — Gold Source ${goldPass ? 'PASS' : 'FAIL'} — Read-only Ownership ${readOnlyPass && deterministicPass ? 'PASS' : 'FAIL'} — Build Identity ${buildPass ? 'PASS' : `FAIL (${RuntimeConfig.build})`}`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  console.info('[IM-14C] Runtime HUD Projection evidence', {
    build: RuntimeConfig.build,
    expectedBuild: EXPECTED_BUILD,
    populationBefore,
    populationAfter,
    goldBefore,
    goldAfter,
    projected,
    populationPass,
    goldPass,
    readOnlyPass,
    deterministicPass,
    buildPass,
    selectionSemanticsIntroduced: false,
    contextSemanticsIntroduced: false,
    cameraSemanticsChanged: false,
    gameplayMutationIntroduced: false,
  });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  console.error('[IM-14C] Runtime HUD Projection evidence failed', error);
}
