import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildLocalDoctorReport } from "../lib/local/doctor";

const root = process.cwd();

function commandOk(command: string, args: string[]) {
  const result = spawnSync(command, args, { cwd: root, stdio: "ignore" });
  return result.status === 0;
}

function readEnvFile() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  return Object.fromEntries(
    lines
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      })
  );
}

function nodeMajor() {
  const match = process.versions.node.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function databaseReachable() {
  return commandOk("docker", ["exec", "pook-dashboard-db", "pg_isready", "-U", "postgres", "-d", "pook_dashboard"]);
}

function adminUserExists() {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "pook-dashboard-db",
      "psql",
      "-U",
      "postgres",
      "-d",
      "pook_dashboard",
      "-tAc",
      "select exists(select 1 from users where email = 'admin@example.com');"
    ],
    { cwd: root, encoding: "utf8", stdio: "pipe" }
  );
  return result.status === 0 && result.stdout.trim() === "t";
}

function sampleFileCount() {
  const sampleDir = path.join(root, "sample-files");
  if (!existsSync(sampleDir)) return 0;
  return readdirSync(sampleDir).filter((file) => /\.(xlsx|xls|html?)$/i.test(file)).length;
}

function printReport(report: ReturnType<typeof buildLocalDoctorReport>) {
  console.log("\n太樾 & 绿雪芽项目经营管理看板 - 本地体检\n");
  for (const item of report.checks) {
    const mark = item.status === "pass" ? "OK" : item.status === "warn" ? "WARN" : "FAIL";
    console.log(`[${mark}] ${item.label}: ${item.detail}`);
    if (item.status !== "pass" && item.fix) console.log(`      建议: ${item.fix}`);
  }
  console.log(`\n${report.summary}`);
  if (report.nextSteps.length > 0) {
    console.log("\n建议下一步:");
    report.nextSteps.forEach((step, index) => console.log(`${index + 1}. ${step}`));
  }
}

const env = readEnvFile() as Record<string, string>;
const report = buildLocalDoctorReport({
  hasPackageJson: existsSync(path.join(root, "package.json")),
  hasEnvFile: existsSync(path.join(root, ".env")),
  hasEnvExample: existsSync(path.join(root, ".env.example")),
  hasDatabaseUrl: Boolean(env.DATABASE_URL),
  hasAuthSecret: Boolean(env.AUTH_SECRET),
  hasUploadDir: Boolean(env.UPLOAD_DIR),
  nodeMajor: nodeMajor(),
  dockerAvailable: commandOk("docker", ["version"]),
  databaseReachable: databaseReachable(),
  prismaGenerated: existsSync(path.join(root, "node_modules/.prisma/client")),
  adminUserExists: adminUserExists(),
  sampleFileCount: sampleFileCount()
});

printReport(report);
process.exit(report.ready ? 0 : 1);
