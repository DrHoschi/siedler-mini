import { runIM18FSelfTest } from './im-18f-self-test.js';
const result=runIM18FSelfTest();console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
