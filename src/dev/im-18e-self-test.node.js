import { runIM18ESelfTest } from './im-18e-self-test.js';
const result=runIM18ESelfTest(); console.log(JSON.stringify(result,null,2)); if(!result.pass) process.exitCode=1;
