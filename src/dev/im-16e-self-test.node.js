import { runIM16ESelfTest } from './im-16e-self-test.js';

const result = runIM16ESelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
