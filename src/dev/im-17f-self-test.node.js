import { runIM17FSelfTest } from './im-17f-self-test.js';

const result = runIM17FSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
