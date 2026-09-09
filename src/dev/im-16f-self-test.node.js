import { runIM16FSelfTest } from './im-16f-self-test.js';

const result = runIM16FSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
