import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  const ROOT = process.cwd();
  const buf = fs.readFileSync(path.join(ROOT, "test-data", "excel-small", "input.xlsx"));
  const form = new FormData();
  form.append("kind", "xlsx");
  form.append("file", new Blob([buf]), "input.xlsx");

  const resp = await fetch("http://localhost:3000/api/extract", { method: "POST", body: form });
  const d = await resp.json();
  if (d.holdings) {
    console.log("Keys:", Object.keys(d.holdings[0]));
    if (d.holdings.length > 0) console.log("First:", JSON.stringify(d.holdings[0], null, 2));
    console.log("Count:", d.holdings.length);
  } else {
    console.log("Status:", resp.status, JSON.stringify(d, null, 2));
  }
}
main();
