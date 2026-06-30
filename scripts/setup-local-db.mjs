import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(root, "prisma/migrations/20260629000000_init/migration.sql");

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

async function main() {
  if (!existsSync(migrationPath)) {
    throw new Error(`Missing migration file: ${migrationPath}`);
  }

  run("npx", ["prisma", "generate"]);
  run("docker", ["compose", "up", "-d", "db"]);
  await waitForPostgres();

  if (hasUsersTable()) {
    console.log("Database schema already exists; skipping migration.sql.");
  } else {
    run("docker", ["cp", migrationPath, "pook-dashboard-db:/tmp/migration.sql"]);
    run("docker", ["exec", "pook-dashboard-db", "psql", "-U", "postgres", "-d", "pook_dashboard", "-v", "ON_ERROR_STOP=1", "-f", "/tmp/migration.sql"]);
  }

  run("npx", ["tsx", "prisma/seed.ts"]);
  console.log("Local database is ready. Login with admin@example.com / admin123456.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
