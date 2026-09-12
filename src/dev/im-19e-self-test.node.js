import { runIM19ESelfTest } from './im-19e-self-test.js';

const result = runIM19ESelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
