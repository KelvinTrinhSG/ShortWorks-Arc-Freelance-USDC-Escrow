// Copies the compiled ABI into the app (src/data/arcEscrowAbi.json). Run after `forge build`:
//   npm run export-abi
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const { abi } = JSON.parse(await readFile(path.join(root, "out/ShortWorksEscrow.sol/ShortWorksEscrow.json"), "utf8"));
const target = path.join(root, "../src/data/arcEscrowAbi.json");
await writeFile(target, JSON.stringify(abi, null, 2) + "\n");
console.log(`✓ ${abi.length} ABI entries -> ${path.relative(process.cwd(), target)}`);
