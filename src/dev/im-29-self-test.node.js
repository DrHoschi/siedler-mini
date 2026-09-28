import { runIM29SelfTest } from './im-29-self-test.js';
const result=runIM29SelfTest();
console.log(JSON.stringify(result,null,2));
if(result.blockerCount>0)process.exitCode=1;
