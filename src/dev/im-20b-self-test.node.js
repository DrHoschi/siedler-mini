import { runIM20BSelfTest } from './im-20b-self-test.js';

const result = runIM20BSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
