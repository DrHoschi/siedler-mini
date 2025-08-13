// game.js  v14.2
export function createGameState({ placeStartHQ=true } = {}){
  const state = {
    time: 0,
    resources: { wood: 20, stone: 10, food: 10, gold: 0, carriers: 0 },
    tool: 'pointer',
    toolName: 'Zeiger',
    setTool(name){ this.tool=name; this.toolName=name[0].toUpperCase()+name.slice(1); },
    pendingBuild: null
  };
  return state;
}
