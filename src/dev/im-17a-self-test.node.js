import { runIM17ASelfTest } from './im-17a-self-test.js';

const result = runIM17ASelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
