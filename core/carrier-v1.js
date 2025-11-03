/* ============================================================================
 * Datei   : core/carrier.js
 * Version : v25.11.03 (skeleton)
 * Zweck   : Träger-System (Transportaufträge)
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 * Ereignisse:
 *   req:carry:enqueue {from,to,item,qty}
 *   cb:carry:assign   {jobId,from,to,item,qty}
 *   cb:carry:done     {jobId}
 * ============================================================================
 */

let nextJobId = 1;
const queue = [];

class CarryJob {
  constructor({from,to,item,qty}) {
    this.id = nextJobId++;
    this.from = from;
    this.to = to;
    this.item = item;
    this.qty = qty;
    this.status = "pending";
  }
}

function enqueueJob(detail) {
  const job = new CarryJob(detail);
  queue.push(job);
  dispatchEvent(new CustomEvent("cb:carry:assign",{detail:job}));
  console.info("[carrier] Auftrag", job.id, "von", job.from, "nach", job.to);
  setTimeout(()=>finishJob(job.id), 1000); // Dummy-Laufzeit
}

function finishJob(id) {
  const job = queue.find(j=>j.id===id);
  if(!job) return;
  job.status="done";
  dispatchEvent(new CustomEvent("cb:carry:done",{detail:{jobId:id}}));
}

addEventListener("req:carry:enqueue", e=>enqueueJob(e.detail||{}));

window.Carrier = { queue, enqueue:enqueueJob, finish:finishJob };
