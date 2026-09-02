import { runCr03FreezeGate } from './cr-03-freeze-gate.js';
import { runCr04aSelfTest } from './cr-04a-self-test.js';

function report(label, result) {
  console.log(`\n— ${label} —`);
  for (const entry of result.results) {
    console.log(`${entry.pass ? '✅' : '❌'} ${entry.name}${entry.error ? ` — ${entry.error}` : ''}`);
  }
  return result.pass;
}

const cr03 = runCr03FreezeGate();
const cr04a = runCr04aSelfTest();
const pass = report('CR-03 Regression', cr03) && report('CR-04A Contract Tests', cr04a);

if (!pass) {
  console.error('\n❌ CR-04A Integration/Regression Gate FAILED');
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-04A Integration/Regression Gate PASS / 0 Blocker');
}
