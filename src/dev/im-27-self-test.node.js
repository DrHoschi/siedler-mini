import { runIM27SelfTest } from './im-27-self-test.js';
const result = runIM27SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.blockerCount > 0) process.exitCode = 1;
