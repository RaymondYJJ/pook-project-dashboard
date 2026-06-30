"use client";

import { Area, AreaChart, BarChart, Bar, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="太樾" stroke="#173b63" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="绿雪芽" stroke="#0f5132" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChannelBarChart({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#173b63" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyTrendChart({ data }: { data: Array<{ name: string; sales: number | null; profit: number | null }> }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => formatChartNumber(value)} />
          <Line type="monotone" dataKey="sales" name="销售" stroke="#173b63" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="profit" name="利润" stroke="#0f5132" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProfitStructureChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const colors = ["#173b63", "#0f5132", "#b7791f", "#64748b", "#991b1b", "#0e7490"];
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={2}>
            {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => formatChartNumber(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InventoryRiskChart({ data }: { data: Array<{ name: string; value: number; tone: "risk" | "warn" | "ok" }> }) {
  const color = { risk: "#b91c1c", warn: "#b7791f", ok: "#0f5132" };
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid stroke="#e2e8f0" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={88} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((row) => <Cell key={row.name} fill={color[row.tone]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashflowTrendChart({ data }: { data: Array<{ name: string; operatingCashflow: number | null; endingCash: number | null }> }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => formatChartNumber(value)} />
          <Area type="monotone" dataKey="endingCash" name="期末现金" stroke="#173b63" fill="#dbeafe" connectNulls />
          <Line type="monotone" dataKey="operatingCashflow" name="经营现金流" stroke="#0f5132" strokeWidth={2} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatChartNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "待上传";
  if (Math.abs(number) >= 100000000) return `${(number / 100000000).toFixed(2)}亿`;
  if (Math.abs(number) >= 10000) return `${(number / 10000).toFixed(1)}万`;
  return number.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}
