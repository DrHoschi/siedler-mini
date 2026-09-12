import { runIM19FSelfTest } from './im-19f-self-test.js';

const result = runIM19FSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
