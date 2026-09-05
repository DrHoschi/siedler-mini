import { runCr23aSelfTest } from './cr-23a-self-test.js';

const output = document.querySelector('#test-status');
const result = runCr23aSelfTest();
if (output) {
  output.textContent = `CR-23A PERSON / RESIDENT IDENTITY CONTRACT: ${result.pass ? 'PASS' : 'FAIL'} / ${result.blockerCount} BLOCKER`;
}
