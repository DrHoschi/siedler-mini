import { runIM17DSelfTest } from './im-17d-self-test.js';

const result = runIM17DSelfTest();
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
