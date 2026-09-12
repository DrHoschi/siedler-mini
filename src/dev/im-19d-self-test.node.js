import { runIM19DSelfTest } from './im-19d-self-test.js';

const result = runIM19DSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
