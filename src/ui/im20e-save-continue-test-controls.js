const runtime = window.CleanRuntime;
const output = document.querySelector('#im20e-save-continue-result');
const buttons = [...document.querySelectorAll('[data-im20e-action]')];

function show(message, status) {
  if (!output) return;
  output.textContent = message;
  output.dataset.status = status;
}

for (const button of buttons) {
  button.addEventListener('click', async () => {
    try {
      if (button.dataset.im20eAction === 'SAVE') {
        show('Save wartet auf eine abgeschlossene Simulationsgrenze …', 'pending');
        const result = await runtime.saveToBrowserStorage();
        show(`V2 gespeichert · Step ${result.stepIndex} · ${result.write.bytes} Bytes`, 'pass');
      } else if (button.dataset.im20eAction === 'CONTINUE') {
        const result = runtime.continueFromBrowserStorage();
        if (result.status === 'CONTINUED') {
          show(`Restore + Rebind + Continue · Step ${result.captureStepIndex} · Scheduler ${result.schedulerRegistrationCount}`, 'pass');
        } else if (result.status === 'NO_SAVE') {
          show('Kein Browser-Save vorhanden.', 'idle');
        } else {
          show(`Continue abgelehnt · ${result.reason}`, 'fail');
        }
      }
    } catch (error) {
      show(`IM-20E fehlgeschlagen · ${error.message}`, 'fail');
    }
  });
}
