import { runIM26SelfTest } from './im-26-self-test.js';

const result = runIM26SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.blockerCount > 0) process.exitCode = 1;
