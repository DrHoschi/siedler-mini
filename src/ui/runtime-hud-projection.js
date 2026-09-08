function requireRuntime(runtime) {
  if (!runtime?.housingPopulation?.population || !runtime?.goldEconomy) {
    throw new TypeError('authoritative population and gold runtime sources required');
  }
  return runtime;
}

function freezeViewModel({ populationCount, goldBalance }) {
  return Object.freeze({
    kind: 'runtime-hud-view-model',
    populationCount,
    goldBalance,
  });
}

export function projectRuntimeHud(runtime = window.CleanRuntime) {
  const source = requireRuntime(runtime);
  const population = source.housingPopulation.population;
  const goldState = source.goldEconomy.snapshot();

  if (population?.kind !== 'derived-population' || !Number.isInteger(population.count) || population.count < 0) {
    throw new TypeError('derived population source required');
  }
  if (goldState?.kind !== 'gold-economy-state' || !Number.isSafeInteger(goldState.balance) || goldState.balance < 0) {
    throw new TypeError('gold economy state source required');
  }

  return freezeViewModel({
    populationCount: population.count,
    goldBalance: goldState.balance,
  });
}

export function renderRuntimeHud(viewModel, root = document) {
  if (viewModel?.kind !== 'runtime-hud-view-model') {
    throw new TypeError('runtime HUD view model required');
  }
  const populationEl = root.querySelector('#hud-population');
  const goldEl = root.querySelector('#hud-gold');
  if (!populationEl || !goldEl) throw new TypeError('runtime HUD output elements required');

  populationEl.textContent = `Bevölkerung: ${viewModel.populationCount}`;
  goldEl.textContent = `Gold: ${viewModel.goldBalance}`;
  populationEl.dataset.value = String(viewModel.populationCount);
  goldEl.dataset.value = String(viewModel.goldBalance);
  return viewModel;
}

export function refreshRuntimeHud(runtime = window.CleanRuntime, root = document) {
  return renderRuntimeHud(projectRuntimeHud(runtime), root);
}

const initialViewModel = refreshRuntimeHud();

window.IM14CRuntimeHud = Object.freeze({
  project: projectRuntimeHud,
  render: renderRuntimeHud,
  refresh: refreshRuntimeHud,
  getCurrentViewModel: () => projectRuntimeHud(),
  initialViewModel,
});
