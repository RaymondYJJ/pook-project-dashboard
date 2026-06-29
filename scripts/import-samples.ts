import path from "node:path";
import { readdir } from "node:fs/promises";
import { parseAndImportFile } from "../lib/data/importer";
import { prisma } from "../lib/prisma";

async function main() {
  const dir = path.join(process.cwd(), "sample-files");
  const files = (await readdir(dir)).filter((name) => /\.(xlsx|html?)$/i.test(name));
  for (const name of files) {
    const fullPath = path.join(dir, name);
    const result = await parseAndImportFile(fullPath, name);
    console.log(JSON.stringify({ name, imported: result.imported, error: result.error, summary: result.parsed.summary }, null, 2));
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
