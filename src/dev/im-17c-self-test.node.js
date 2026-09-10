import { runIM17CSelfTest } from './im-17c-self-test.js';

const result = runIM17CSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
