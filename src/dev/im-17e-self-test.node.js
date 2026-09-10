import { runIM17ESelfTest } from './im-17e-self-test.js';

const result = runIM17ESelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
