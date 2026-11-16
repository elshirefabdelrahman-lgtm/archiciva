import fs from "node:fs";
import crypto from "node:crypto";
import { loadCatalog } from "../src/data/catalog-client.js";
const catalog = await loadCatalog();
const hash = crypto
  .createHash("sha256")
  .update(JSON.stringify(catalog))
  .digest("hex");
const changed =
  !fs.existsSync("catalog-hash.txt") ||
  fs.readFileSync("catalog-hash.txt", "utf8").trim() !== hash;
if (process.env.GITHUB_OUTPUT)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
console.log(
  changed
    ? "Catalog changes require publishing."
    : "Published catalog is current.",
);
