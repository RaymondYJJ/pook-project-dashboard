import { Shell, PageHeader, Card, StatusPill } from "@/components/ui";
import { prisma } from "@/lib/prisma";

async function getUsers() {
  try {
    return await prisma.user.findMany({ include: { roles: { include: { role: true } }, permissions: { include: { project: true } } } });
  } catch {
    return [];
  }
}

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <Shell>
      <PageHeader title="用户与权限管理" description="角色权限、项目级权限与投资人只读控制" />
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">用户</th><th>角色</th><th>项目权限</th><th>状态</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="py-3"><div className="font-medium">{user.name}</div><div className="text-slate-500">{user.email}</div></td>
                <td>{user.roles.map((item) => item.role.code).join(", ")}</td>
                <td>{user.permissions.map((item) => `${item.project.name}:${item.roleCode}`).join("；") || "全局"}</td>
                <td><StatusPill tone={user.isActive ? "green" : "neutral"}>{user.isActive ? "启用" : "停用"}</StatusPill></td>
              </tr>
            ))}
            {!users.length ? <tr><td className="py-6 text-slate-500" colSpan={4}>暂无用户，或数据库尚未连接。运行 seed 后会创建默认管理员。</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
