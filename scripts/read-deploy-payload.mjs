import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const payloadPath = path.join(__dirname, "..", "deploy-edge-payload.json");
const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
console.log(JSON.stringify(payload));
