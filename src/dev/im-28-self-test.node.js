import { runIM28SelfTest } from './im-28-self-test.js';
const result=runIM28SelfTest();
console.log(JSON.stringify(result,null,2));
if(result.blockerCount>0)process.exitCode=1;
