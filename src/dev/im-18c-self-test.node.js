import { runIM18CSelfTest } from './im-18c-self-test.js';

const result = runIM18CSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
