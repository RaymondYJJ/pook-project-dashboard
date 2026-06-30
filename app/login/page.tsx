import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

const errorMessages: Record<string, string> = {
  credentials: "邮箱或密码不正确，请确认已运行 npm run setup:local 初始化默认账号。",
  db: "本地数据库暂时无法连接。请先启动 Docker Desktop，再运行 npm run db:up 和 npm run setup:local。",
  "1": "登录失败，请检查账号密码。"
};

export default async function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const error = searchParams?.error ? errorMessages[searchParams.error] : null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form action="/api/auth/login" method="post" className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-cockpit">
        <h1 className="text-xl font-semibold text-ink">经营看板登录</h1>
        <p className="mt-1 text-sm text-slate-500">默认管理员请先运行 seed 初始化。</p>
        {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
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
