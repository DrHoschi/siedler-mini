// V15 storage – Save/Load via localStorage
export function createStorage(key){
  function load(){
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch(e){ return null; }
  }
  function save(obj){
    localStorage.setItem(key, JSON.stringify(obj));
  }
  function clear(){
    localStorage.removeItem(key);
  }
  return { load, save, clear };
}
