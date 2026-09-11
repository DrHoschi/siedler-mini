import { runIM18ASelfTest } from './im-18a-self-test.js';

const result = runIM18ASelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
