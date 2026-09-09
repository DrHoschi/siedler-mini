import { runIM16DSelfTest } from './im-16d-self-test.js';

const result = runIM16DSelfTest();
if (!result.pass) throw new Error(`IM-16D self-test failed: ${JSON.stringify(result)}`);
console.log(JSON.stringify(result, null, 2));
