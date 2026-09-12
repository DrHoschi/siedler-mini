import { runIM20CSelfTest } from './im-20c-self-test.js';

const result = runIM20CSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
