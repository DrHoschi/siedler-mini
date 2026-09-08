import { runIm16bSelfTest } from './im-16b-self-test.js';

try {
  const result = runIm16bSelfTest();
  console.log('IM-16B self-test PASS', result);
} catch (error) {
  console.error('IM-16B self-test FAIL', error);
  process.exitCode = 1;
}
