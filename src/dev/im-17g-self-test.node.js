import { runIM17GSelfTest } from './im-17g-self-test.js';

const result = runIM17GSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
