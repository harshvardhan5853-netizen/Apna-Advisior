// Test extraction against running dev server
import * as fs from "node:fs";
import * as path from "node:path";

const BASE = "http://localhost:3000";
const SCREENSHOTS_DIR = path.resolve(import.meta.dirname, "..", "test-data", "screenshots");

async function testFile(filePath, kind) {
  console.log(`\n=== Testing: ${path.basename(filePath)} (${kind}) ===`);
  const start = Date.now();

  try {
    // Check server health first
    const healthResp = await fetch(`${BASE}/api/extract`, { signal: AbortSignal.timeout(5000) });
    const health = await healthResp.json();
    console.log(`Health: ok=${health.ok}, python=${health.hasPython}, script=${health.hasScript}`);

    // Upload file
    const form = new FormData();
    form.append("kind", kind);
    const bytes = fs.readFileSync(filePath);
    form.append("file", new Blob([bytes]), path.basename(filePath));

    const resp = await fetch(`${BASE}/api/extract`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(180000),
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Status: ${resp.status} (${elapsed}s)`);
    const data = await resp.json();

    if (resp.ok) {
      console.log(`Holdings: ${data.holdings?.length ?? 0}`);
      for (const h of (data.holdings ?? [])) {
        console.log(`  ${h.symbol || "?"} | qty=${h.quantity} | price=${h.avgBuyPrice} | invested=${h.investedAmount} | conf=${h.confidence?.toFixed(2)}`);
      }
      console.log(`Warnings: ${data.warnings?.length ?? 0}`);
    } else {
      console.log(`Error: ${data.error} — ${data.detail}`);
    }
  } catch (e) {
    console.log(`Exception: ${e.message}`);
  }
}

async function main() {
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith(".png")).sort();
  console.log(`Found ${files.length} screenshots in ${SCREENSHOTS_DIR}`);

  for (const f of files) {
    await testFile(path.join(SCREENSHOTS_DIR, f), "image");
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
