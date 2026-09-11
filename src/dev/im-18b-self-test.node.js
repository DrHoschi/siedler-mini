import { runIM18BSelfTest } from './im-18b-self-test.js';

const result = runIM18BSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
