import { runIM32SelfTest } from './im-32-self-test.js';
const result = runIM32SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.blockerCount) process.exitCode = 1;
