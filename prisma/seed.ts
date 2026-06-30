import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { defaultAlertRules } from "../lib/alerts/engine";

async function main() {
  const roles = [
    ["super_admin", "超级管理员"],
    ["owner", "经营负责人"],
    ["finance", "财务"],
    ["operation", "运营"],
    ["investor", "投资人"],
    ["readonly", "只读"]
  ] as const;

  for (const [code, name] of roles) {
    await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name }
    });
  }

  const taiyue = await prisma.project.upsert({
    where: { code: "taiyue" },
    update: { name: "太樾项目", entityName: "璞樾" },
    create: { code: "taiyue", name: "太樾项目", entityName: "璞樾", description: "太樾项目，对应主体为璞樾。" }
  });
  const luxueya = await prisma.project.upsert({
    where: { code: "luxueya" },
    update: { name: "绿雪芽项目", entityName: "佰茶" },
    create: { code: "luxueya", name: "绿雪芽项目", entityName: "佰茶", description: "绿雪芽项目，对应主体为佰茶。" }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "super_admin" } });
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "系统管理员",
      isActive: true
    },
    create: {
      email: "admin@example.com",
      name: "系统管理员",
      passwordHash: await bcrypt.hash("admin123456", 10),
      roles: { create: { roleId: adminRole.id } }
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id }
  });

  for (const project of [taiyue, luxueya]) {
    await prisma.projectUserPermission.upsert({
      where: { userId_projectId_roleCode: { userId: admin.id, projectId: project.id, roleCode: "super_admin" } },
      update: { canManage: true, canUpload: true },
      create: { userId: admin.id, projectId: project.id, roleCode: "super_admin", canManage: true, canUpload: true }
    });
    for (const rule of defaultAlertRules) {
      await prisma.alertRule.upsert({
        where: { projectId_code: { projectId: project.id, code: rule.code } },
        update: {
          name: rule.name,
          severity: rule.severity,
          metric: rule.metric,
          operator: rule.operator,
          threshold: rule.threshold
        },
        create: {
          projectId: project.id,
          code: rule.code,
          name: rule.name,
          severity: rule.severity,
          metric: rule.metric,
          operator: rule.operator,
          threshold: rule.threshold,
          description: "V1 默认规则，可在后台调整。"
        }
      });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
