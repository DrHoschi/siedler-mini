import { runIM25SelfTest } from './im-25-self-test.js';
const result = runIM25SelfTest();
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
