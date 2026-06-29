import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form action="/api/auth/login" method="post" className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-cockpit">
        <h1 className="text-xl font-semibold text-ink">经营看板登录</h1>
        <p className="mt-1 text-sm text-slate-500">默认管理员请先运行 seed 初始化。</p>
        <label className="mt-6 block text-sm font-medium text-slate-700">
          邮箱
          <input name="email" type="email" defaultValue="admin@example.com" className="mt-2 w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          密码
          <input name="password" type="password" defaultValue="admin123456" className="mt-2 w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="mt-6 w-full rounded bg-navy px-4 py-2 font-medium text-white">登录</button>
      </form>
    </main>
  );
}
