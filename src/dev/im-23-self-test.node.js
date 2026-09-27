import { runIM23SelfTest } from './im-23-self-test.js';
const result=runIM23SelfTest();
console.log(JSON.stringify(result,null,2));
if(result.status!=='PASS')process.exitCode=1;
