import { runIM19BSelfTest } from './im-19b-self-test.js';

const result = runIM19BSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
