import { TestServer } from "office-addin-test-server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const port = 4201;

describe("Unified Multi-Host Bridge E2E", () => {
    let testServer: TestServer;
    let child: any;

    beforeAll(async () => {
        testServer = new TestServer(port);
        await testServer.startTestServer(true);
        // Wait for dev server to be ready? No, office-addin-debugging handles it
    });

    afterAll(async () => {
        await testServer.stopTestServer();
        if (child) child.kill();
        try {
            await execAsync("npx office-addin-debugging stop manifest.e2e.xml");
        } catch (e) { }
    });

    it("should successfully launch Excel and run E2E tests inside the host", async () => {
        console.log("Starting add-in with e2e manifest...");
        child = exec("npx office-addin-debugging start manifest.e2e.xml");
        child.stdout?.on("data", (data: any) => console.log(data));
        child.stderr?.on("data", (data: any) => console.error(data));
        
        console.log("Waiting for test results from the add-in...");
        const results: any = await testServer.getTestResults();
        console.log("Received results from Add-in:", JSON.stringify(results, null, 2));

        expect(results).toBeDefined();
        expect(results.failures).toBe(0);
        expect(results.tests.length).toBeGreaterThan(0);
        
        const passedTests = results.tests.filter((t: any) => t.status === "passed");
        expect(passedTests.length).toBe(results.tests.length);
    }, 60000); // 60s timeout for Excel to start and run tests
});
