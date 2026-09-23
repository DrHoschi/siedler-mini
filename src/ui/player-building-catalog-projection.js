function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function entry({ contentId, label, role, runtimeDefinitionId = null }) {
  return deepFreeze({
    kind: 'player-building-catalog-entry',
    contentId,
    label,
    role,
    runtimeDefinitionId,
    placementSupported: runtimeDefinitionId != null,
  });
}

// S2D-05 is the frozen fachliche V1 content authority. This projection is intentionally
// not a runtime Building registry. Only already-supported frozen runtime definitions get
// a runtimeDefinitionId; unsupported V1 content stays visible but fail-closed.
export const IM21C_V1_BUILDING_CATALOG = deepFreeze([
  entry({ contentId: 'b.hq', label: 'Rathaus', role: 'Start-HQ · Hauptlager', runtimeDefinitionId: 'HQ' }),
  entry({ contentId: 'b.house_small', label: 'Kleines Wohnhaus', role: 'Wohnraum · 2 Bewohner' }),
  entry({ contentId: 'b.house_middle', label: 'Mittleres Wohnhaus', role: 'Wohnraum · 3 Bewohner' }),
  entry({ contentId: 'b.lumberjack', label: 'Holzfällerhütte', role: 'Holzproduktion', runtimeDefinitionId: 'WOODCUTTER' }),
  entry({ contentId: 'b.quarry', label: 'Steinbruch', role: 'Steinproduktion' }),
  entry({ contentId: 'b.fisher', label: 'Fischerhütte', role: 'Fischproduktion' }),
  entry({ contentId: 'b.hunter', label: 'Jägerhütte', role: 'Fleisch- und Fellproduktion' }),
]);

export const IM21C_SUPPORTED_PLACEMENT_OPTIONS = deepFreeze(
  IM21C_V1_BUILDING_CATALOG
    .filter(item => item.placementSupported)
    .map(item => deepFreeze({ definitionId: item.runtimeDefinitionId, label: item.label })),
);

export function projectPlayerBuildingCatalog() {
  return deepFreeze({
    kind: 'player-building-catalog-projection',
    source: 'S2D-05-V1-CONTENT',
    entries: IM21C_V1_BUILDING_CATALOG,
    capabilities: {
      contentAuthority: false,
      runtimeBuildingRegistry: false,
      placementAuthority: false,
      constructionAuthority: false,
      economyAuthority: false,
      saveGameAuthority: false,
      unsupportedEntriesFailClosed: true,
    },
  });
}
