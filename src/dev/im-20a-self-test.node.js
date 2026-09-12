import { runIM20ASelfTest } from './im-20a-self-test.js';

const result = runIM20ASelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
