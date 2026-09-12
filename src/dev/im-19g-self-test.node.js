import { runIM19GSelfTest } from './im-19g-self-test.js';

const result = runIM19GSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
