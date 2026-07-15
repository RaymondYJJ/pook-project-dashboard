export type LocalDoctorStatus = "pass" | "warn" | "fail";

export type LocalDoctorCheck = {
  id: string;
  label: string;
  status: LocalDoctorStatus;
  detail: string;
  fix?: string;
};

export type LocalDoctorProbe = {
  hasPackageJson: boolean;
  hasEnvFile: boolean;
  hasEnvExample: boolean;
  hasDatabaseUrl: boolean;
  hasAuthSecret: boolean;
  hasUploadDir: boolean;
  nodeMajor: number | null;
  dockerAvailable: boolean;
  databaseReachable: boolean;
  prismaGenerated: boolean;
  adminUserExists: boolean;
  sampleFileCount: number;
};

export type LocalDoctorReport = {
  ready: boolean;
  summary: string;
  checks: LocalDoctorCheck[];
  nextSteps: string[];
};

function check(status: LocalDoctorStatus, id: string, label: string, detail: string, fix?: string): LocalDoctorCheck {
  return { id, label, status, detail, fix };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function buildNextSteps(checks: LocalDoctorCheck[]) {
  const failedIds = new Set(checks.filter((item) => item.status !== "pass").map((item) => item.id));
  const steps: string[] = [];
  if (failedIds.has("project-root")) steps.push("请先 cd 到项目目录后再运行命令。");
  if (failedIds.has("env-file")) steps.push("cp .env.example .env");
  if (failedIds.has("env-values")) steps.push("按 README 示例补齐 .env。");
  if (failedIds.has("node")) steps.push("请安装 Node.js 18 或更高版本。");
  if (failedIds.has("docker")) steps.push("打开 Docker Desktop，然后运行 npm run db:up。");
  if (failedIds.has("database") || failedIds.has("admin-user")) steps.push("运行 npm run setup:local 初始化数据库和默认管理员。");
  if (failedIds.has("prisma")) steps.push("运行 npm run prisma:generate 或 npm run setup:local。");
  if (failedIds.has("sample-files")) steps.push("确认样本文件已复制到 sample-files/。");
  return unique(steps);
}

export function buildLocalDoctorReport(probe: LocalDoctorProbe): LocalDoctorReport {
  const checks: LocalDoctorCheck[] = [];

  checks.push(
    probe.hasPackageJson
      ? check("pass", "project-root", "项目目录", "已在项目根目录运行。")
      : check("fail", "project-root", "项目目录", "当前目录没有 package.json。", "请先 cd 到项目目录后再运行命令。")
  );

  checks.push(
    probe.hasEnvFile
      ? check("pass", "env-file", "环境变量文件", "已找到 .env。")
      : check(
          "fail",
          "env-file",
          "环境变量文件",
          probe.hasEnvExample ? "缺少 .env，但已找到 .env.example。" : "缺少 .env 和 .env.example。",
          "cp .env.example .env"
        )
  );

  const missingEnvKeys = [
    probe.hasDatabaseUrl ? "" : "DATABASE_URL",
    probe.hasAuthSecret ? "" : "AUTH_SECRET",
    probe.hasUploadDir ? "" : "UPLOAD_DIR"
  ].filter(Boolean);
  checks.push(
    missingEnvKeys.length === 0
      ? check("pass", "env-values", "必要环境变量", "DATABASE_URL、AUTH_SECRET、UPLOAD_DIR 已配置。")
      : check("fail", "env-values", "必要环境变量", `缺少 ${missingEnvKeys.join("、")}。`, "按 README 示例补齐 .env。")
  );

  checks.push(
    probe.nodeMajor && probe.nodeMajor >= 18
      ? check("pass", "node", "Node.js", `当前 Node 主版本为 ${probe.nodeMajor}。`)
      : check("fail", "node", "Node.js", "Node.js 版本过低或无法识别。", "请安装 Node.js 18 或更高版本。")
  );

  checks.push(
    probe.dockerAvailable
      ? check("pass", "docker", "Docker", "Docker CLI 可用。")
      : check("fail", "docker", "Docker", "Docker 暂不可用。", "打开 Docker Desktop，然后运行 npm run db:up。")
  );

  checks.push(
    probe.databaseReachable
      ? check("pass", "database", "本地数据库", "PostgreSQL 可以连接。")
      : check("fail", "database", "本地数据库", "PostgreSQL 暂时无法连接。", "运行 npm run db:up 和 npm run setup:local。")
  );

  checks.push(
    probe.prismaGenerated
      ? check("pass", "prisma", "Prisma Client", "Prisma Client 已生成。")
      : check("warn", "prisma", "Prisma Client", "尚未生成 Prisma Client。", "运行 npm run prisma:generate 或 npm run setup:local。")
  );

  checks.push(
    probe.adminUserExists
      ? check("pass", "admin-user", "默认管理员", "admin@example.com 已初始化。")
      : check("fail", "admin-user", "默认管理员", "尚未找到默认管理员。", "运行 npm run setup:local 初始化数据库和默认管理员。")
  );

  checks.push(
    probe.sampleFileCount > 0
      ? check("pass", "sample-files", "样本文件", `已找到 ${probe.sampleFileCount} 个样本文件。`)
      : check("fail", "sample-files", "样本文件", "sample-files 目录没有可导入样本。", "确认样本文件已复制到 sample-files/。")
  );

  const nextSteps = buildNextSteps(checks);
  const ready = checks.every((item) => item.status !== "fail");

  return {
    ready,
    summary: ready ? "本地环境已就绪，可以运行 npm run dev。" : "本地环境还没完全就绪，请按下方建议处理。",
    checks,
    nextSteps
  };
}
