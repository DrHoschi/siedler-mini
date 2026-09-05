import { runCr22bSelfTest } from './cr-22b-self-test.js';

const report = runCr22bSelfTest();
console.log(JSON.stringify(report, null, 2));
if (!report.pass || report.blockerCount !== 0) process.exitCode = 1;
