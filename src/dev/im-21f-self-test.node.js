import { runIM21FSelfTest } from './im-21f-self-test.js';

const result = await runIM21FSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
