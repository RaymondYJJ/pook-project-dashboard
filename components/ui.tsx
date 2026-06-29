import Link from "next/link";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const nav = [
    ["/dashboard", "总览"],
    ["/uploads", "上传"],
    ["/alerts", "预警"],
    ["/settings/rules", "规则"],
    ["/admin/users", "用户"]
  ];
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-navy" />
            <div>
              <div className="text-sm font-semibold text-ink">太樾 & 绿雪芽</div>
              <div className="text-xs text-slate-500">项目经营管理看板</div>
            </div>
          </Link>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="rounded px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-navy">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-cockpit", className)}>{children}</section>;
}

export function Kpi({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "risk" | "gold" | "green" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold",
          tone === "risk" && "text-risk",
          tone === "gold" && "text-gold",
          tone === "green" && "text-pine",
          tone === "default" && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "red" | "orange" | "green" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "green" && "bg-emerald-50 text-emerald-700"
      )}
    >
      {children}
    </span>
  );
}
