import { runIM19ASelfTest } from './im-19a-self-test.js';

const result = runIM19ASelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
