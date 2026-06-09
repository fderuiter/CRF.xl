/* global Excel */
import { sendTestResults } from "office-addin-test-helpers";
import { speculativeSyncManager } from "./core/services/speculative-sync-service";
import { createRecoverySnapshot, persistRecoverySnapshot, readRecoverySnapshot, dismissRecoverySnapshot } from "./core/services/recovery-storage";

export async function runAllTests() {
  const results: any = { failures: 0, tests: [] };

  function assert(condition: boolean, msg: string) {
    if (!condition) {
       results.failures++;
       results.tests.push({ test: msg, status: "failed" });
       console.error("TEST FAILED:", msg);
    } else {
       results.tests.push({ test: msg, status: "passed" });
       console.log("TEST PASSED:", msg);
    }
  }

  try {
     // Wait for Excel to be ready
     await Excel.run(async (ctx) => {
        await ctx.sync();
     });

     // --- Test 1: SpeculativeSyncManager correctly handles and retries during a simulated 'HostBusy' state ---
     const originalExcelRun = Excel.run;
     let runCount = 0;
     let busySimulated = false;

     (Excel as any).run = async (batch: any) => {
       // We intercept the second run to simulate a Busy error
       if (runCount === 1) {
          busySimulated = true;
          runCount++;
          const e = new Error("User is in cell edit mode");
          (e as any).code = "Busy";
          throw e;
       }
       runCount++;
       return originalExcelRun(batch);
     };

     // Create dummy projection and predicted study
     const projection = {
         studyRows: [["StudyID"], ["STUDY01"]],
         formsRows: [["FormOID", "FormName"], ["F1", "Form 1"]],
         codelistRows: [["CodelistOID", "Name"], ["CL1", "CL 1"]]
     };
     const predictedStudy = { studyName: "STUDY01", forms: [], variables: [], metadata: { protocol: "", protocolName: "" } } as any;

     let syncStates: string[] = [];
     const unsubscribe = speculativeSyncManager.subscribe((state) => {
         syncStates.push(state);
     });

     await speculativeSyncManager.startSync(projection, predictedStudy, null);

     // Wait for sync to finish (it will retry once and then succeed, or error)
     await new Promise(r => {
        const interval = setInterval(() => {
           if (speculativeSyncManager.getState() === "idle" || speculativeSyncManager.getState() === "error") {
              clearInterval(interval);
              r(true);
           }
        }, 100);
     });

     unsubscribe();

     // Restore Excel.run
     (Excel as any).run = originalExcelRun;

     assert(busySimulated, "Simulated 'HostBusy' state was triggered.");
     assert(syncStates.includes("syncing"), "SpeculativeSyncManager transitioned to 'syncing' state.");
     assert(speculativeSyncManager.getState() === "idle", "SpeculativeSyncManager successfully recovered and reached 'idle' state.");

     // --- Test 2: Recovery snapshots correctly stored and retrieved after a browser refresh ---
     // Clear previous storage
     dismissRecoverySnapshot();
     
     // Take snapshot
     const ss = createRecoverySnapshot({
         issues: [],
         studySummary: { formCount: 1, variableCount: 1, visitCount: 1 }
     });
     persistRecoverySnapshot(ss);
     
     // Retrieve snapshot
     const snapshot = readRecoverySnapshot();
     assert(snapshot !== null, "Recovery snapshot successfully retrieved.");
     assert(snapshot?.studySummary.formCount === 1, "Recovery snapshot content matches.");
     
  } catch (e: any) {
     assert(false, "Uncaught exception: " + e.message);
  }

  // Send results to test server
  await sendTestResults(results, 4201);
}
