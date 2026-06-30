import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsDir = path.join(root, "prisma/migrations");
const initMigrationPath = path.join(migrationsDir, "20260629000000_init/migration.sql");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8"
  });
  if (result.status !== 0 && !options.allowFailure) {
    const stderr = result.stderr ? `\n${result.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stderr}`);
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPostgres() {
  for (let index = 0; index < 30; index += 1) {
    const result = run("docker", ["exec", "pook-dashboard-db", "pg_isready", "-U", "postgres", "-d", "pook_dashboard"], {
      capture: true,
      allowFailure: true
    });
    if (result.status === 0) return;
    await sleep(1000);
  }
  throw new Error("PostgreSQL did not become ready in time.");
}

function hasUsersTable() {
  const result = run(
    "docker",
    ["exec", "pook-dashboard-db", "psql", "-U", "postgres", "-d", "pook_dashboard", "-tAc", "select to_regclass('public.users') is not null;"],
    { capture: true, allowFailure: true }
  );
  return result.stdout.trim() === "t";
}

function hasColumn(tableName, columnName) {
  const result = run(
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
      `select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = '${tableName}' and column_name = '${columnName}');`
    ],
    { capture: true, allowFailure: true }
  );
  return result.stdout.trim() === "t";
}

function applyMigration(migrationPath) {
  const containerPath = `/tmp/${path.basename(path.dirname(migrationPath))}.sql`;
  run("docker", ["cp", migrationPath, `pook-dashboard-db:${containerPath}`]);
  run("docker", ["exec", "pook-dashboard-db", "psql", "-U", "postgres", "-d", "pook_dashboard", "-v", "ON_ERROR_STOP=1", "-f", containerPath]);
}

function applyPendingCompatibilityMigrations() {
  const migrations = readdirSync(migrationsDir)
    .filter((name) => /^\d+_/.test(name))
    .sort()
    .map((name) => path.join(migrationsDir, name, "migration.sql"))
    .filter((migrationPath) => migrationPath !== initMigrationPath && existsSync(migrationPath));

  const needsUploadMigration = !hasColumn("source_files", "is_active_version");
  const needsAlertMigration = !hasColumn("alert_events", "alert_type");
  for (const migrationPath of migrations) {
    const name = path.basename(path.dirname(migrationPath));
    const shouldApply = (needsUploadMigration && name.includes("upload_preview_versions")) || (needsAlertMigration && name.includes("alert_center_workflow"));
    if (shouldApply) {
      console.log(`Applying compatibility migration ${name}...`);
      applyMigration(migrationPath);
    }
  }
  if (!needsUploadMigration && !needsAlertMigration) console.log("Compatibility migrations already applied.");
}

async function main() {
  if (!existsSync(initMigrationPath)) {
    throw new Error(`Missing migration file: ${initMigrationPath}`);
  }

  run("npx", ["prisma", "generate"]);
  run("docker", ["compose", "up", "-d", "db"]);
  await waitForPostgres();

  if (hasUsersTable()) {
    console.log("Database schema already exists; skipping migration.sql.");
  } else {
    applyMigration(initMigrationPath);
  }

  applyPendingCompatibilityMigrations();
  run("npx", ["tsx", "prisma/seed.ts"]);
  console.log("Local database is ready. Login with admin@example.com / admin123456.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
