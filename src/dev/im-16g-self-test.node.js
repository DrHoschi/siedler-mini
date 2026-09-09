import { runIM16GSelfTest } from './im-16g-self-test.js';

const result = runIM16GSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
