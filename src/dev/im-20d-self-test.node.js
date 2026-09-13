import { runIM20DSelfTest } from './im-20d-self-test.js';

const result = runIM20DSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
