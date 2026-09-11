import { runIM18DSelfTest } from './im-18d-self-test.js';

const result = runIM18DSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
