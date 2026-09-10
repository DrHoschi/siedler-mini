import { runIM17BSelfTest } from './im-17b-self-test.js';

const result = runIM17BSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
