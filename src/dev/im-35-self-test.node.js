import { runIM35SelfTest } from './im-35-self-test.js';
const result = runIM35SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.blockerCount) process.exitCode = 1;
