import { runIM38SelfTest } from './im-38-self-test.js';
const result=await runIM38SelfTest();
console.log(JSON.stringify(result,null,2));
if(!result.pass)process.exitCode=1;
