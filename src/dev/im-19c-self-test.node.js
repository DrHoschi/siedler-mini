import { runIM19CSelfTest } from './im-19c-self-test.js';

const result = runIM19CSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
