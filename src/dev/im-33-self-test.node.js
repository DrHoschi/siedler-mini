import { runIM33SelfTest } from './im-33-self-test.js';
const result = runIM33SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.blockerCount) process.exitCode = 1;
