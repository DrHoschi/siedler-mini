function requireRuntime(runtime) {
  if (!runtime?.populationProjection || !runtime?.goldEconomy || typeof runtime?.getActiveRuntimeComposition !== 'function') {
    throw new TypeError('IM-21A authoritative population, gold and active runtime composition sources required');
  }
  return runtime;
}

function resourceAmountByTechnicalName(runtime, technicalName) {
  const composition = runtime.getActiveRuntimeComposition();
  const resourceState = composition?.authoritative?.resourceState;
  if (!resourceState || typeof resourceState.snapshot !== 'function') {
    throw new TypeError('authoritative ResourceState snapshot required');
  }
  const snapshot = resourceState.snapshot();
  const definitions = Object.values(snapshot?.definitions?.items || {});
  const definitionIds = new Set(definitions.filter(value => value?.technicalName === technicalName).map(value => value.id));
  if (definitionIds.size === 0) return 0;
  return Object.values(snapshot?.resources?.items || {}).reduce((sum, value) => {
    if (!definitionIds.has(value?.definitionId) || value?.state === 'CONSUMED') return sum;
    const amount = Number(value?.amount);
    return Number.isSafeInteger(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
}

function freezeViewModel({ woodAmount, stoneAmount, populationCount, goldBalance }) {
  return Object.freeze({
    kind: 'runtime-hud-view-model',
    woodAmount,
    stoneAmount,
    populationCount,
    goldBalance,
  });
}

export function projectRuntimeHud(runtime = window.CleanRuntime) {
  const source = requireRuntime(runtime);
  const population = source.populationProjection;
  const goldState = source.goldEconomy.snapshot();

  if (population?.kind !== 'authoritative-population-projection' || !Number.isInteger(population.count) || population.count < 0) {
    throw new TypeError('IM-19D authoritative population projection required');
  }
  if (goldState?.kind !== 'gold-economy-state' || !Number.isSafeInteger(goldState.balance) || goldState.balance < 0) {
    throw new TypeError('gold economy state source required');
  }

  return freezeViewModel({
    woodAmount: resourceAmountByTechnicalName(source, 'wood'),
    stoneAmount: resourceAmountByTechnicalName(source, 'stone'),
    populationCount: population.count,
    goldBalance: goldState.balance,
  });
}

export function renderRuntimeHud(viewModel, root = document) {
  if (viewModel?.kind !== 'runtime-hud-view-model') throw new TypeError('runtime HUD view model required');
  const fields = {
    wood: [root.querySelector('#hud-wood'), viewModel.woodAmount],
    stone: [root.querySelector('#hud-stone'), viewModel.stoneAmount],
    gold: [root.querySelector('#hud-gold'), viewModel.goldBalance],
    population: [root.querySelector('#hud-population'), viewModel.populationCount],
  };
  for (const [name, [element, value]] of Object.entries(fields)) {
    if (!element) throw new TypeError(`runtime HUD ${name} output element required`);
    element.textContent = String(value);
    element.dataset.value = String(value);
  }
  return viewModel;
}

export function refreshRuntimeHud(runtime = window.CleanRuntime, root = document) {
  return renderRuntimeHud(projectRuntimeHud(runtime), root);
}

const initialViewModel = refreshRuntimeHud();

window.IM21ARuntimeHud = Object.freeze({
  project: projectRuntimeHud,
  render: renderRuntimeHud,
  refresh: refreshRuntimeHud,
  getCurrentViewModel: () => projectRuntimeHud(),
  initialViewModel,
  authority: Object.freeze({
    resourceOwner: false,
    populationOwner: false,
    goldOwner: false,
    gameplayMutation: false,
  }),
});
