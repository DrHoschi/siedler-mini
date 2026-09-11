import { runIM18GSelfTest } from './im-18g-self-test.js';
const result=runIM18GSelfTest();console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
