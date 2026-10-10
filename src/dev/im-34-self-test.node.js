import { runIM34SelfTest } from './im-34-self-test.js';
const result = runIM34SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.blockerCount) process.exitCode = 1;
