import { runIM30SelfTest } from './im-30-self-test.js';
const result=runIM30SelfTest();
console.log(JSON.stringify(result,null,2));
if(result.blockerCount)process.exitCode=1;
