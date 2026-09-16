import { runIM20ESelfTest } from './im-20e-self-test.js';

const result = await runIM20ESelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
