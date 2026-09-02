import { EventBus } from '../runtime/event-bus.js';
import { Scheduler } from '../runtime/scheduler.js';
import { Store } from '../runtime/store.js';

export function runFoundationSelfTest(config) {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  check('event-bus-on-off', () => {
    const bus = new EventBus();
    let n = 0;
    const off = bus.on('x', () => n++);
    bus.emit('x'); off(); bus.emit('x');
    return n === 1 && bus.listenerCount('x') === 0;
  });

  check('store-snapshot-detached', () => {
    const store = new Store('test', { nested: { value: 1 } });
    const snap = store.snapshot();
    store.update(draft => { draft.nested.value = 2; });
    return snap.nested.value === 1 && Object.isFrozen(snap) && Object.isFrozen(snap.nested);
  });

  check('scheduler-phase-order-and-unique-id', () => {
    const scheduler = new Scheduler({ phases: config.simulation.phases, stepMs: config.simulation.fixedStepMs });
    const order = [];
    scheduler.register({ id:'a', phase:'input', tick:() => order.push('input') });
    scheduler.register({ id:'b', phase:'events', tick:() => order.push('events') });
    let duplicateRejected = false;
    try { scheduler.register({ id:'a', phase:'world', tick:() => {} }); } catch { duplicateRejected = true; }
    scheduler.step();
    return duplicateRejected && order.join(',') === 'input,events' && scheduler.systemCount() === 2;
  });

  const pass = results.every(r => r.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
