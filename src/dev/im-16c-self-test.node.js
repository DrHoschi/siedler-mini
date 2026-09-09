import { runIM16CSelfTest } from './im-16c-self-test.js';

const evidence = runIM16CSelfTest();
if (!evidence.pass) throw new Error('IM-16C self-test failed');
console.log(JSON.stringify(evidence, null, 2));
