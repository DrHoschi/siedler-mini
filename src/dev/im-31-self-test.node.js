import { runIM31SelfTest } from './im-31-self-test.js';
const result = runIM31SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.blockerCount > 0) process.exitCode = 1;
