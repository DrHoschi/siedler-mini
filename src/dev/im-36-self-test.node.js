import { runIM36SelfTest } from './im-36-self-test.js';
const result = runIM36SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.blockerCount) process.exitCode = 1;
