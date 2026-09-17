import { runIM20FSelfTest } from './im-20f-self-test.js';

const result = runIM20FSelfTest();
if (result.status !== 'PASS') throw new Error('IM-20F self-test failed');
console.log('IM-20F exactly-once recovery reconciliation: PASS');
