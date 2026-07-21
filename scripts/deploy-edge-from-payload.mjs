import fs from "node:fs";

/** Prints deploy-edge-payload.json to stdout for MCP / manual deploy. */
const path = new URL("../deploy-edge-payload.json", import.meta.url);
const payload = JSON.parse(fs.readFileSync(path, "utf8"));
process.stdout.write(JSON.stringify(payload));
