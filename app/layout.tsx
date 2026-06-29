import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "太樾 & 绿雪芽项目经营管理看板",
  description: "财务、销售、推广、库存、采购与预警一体化经营驾驶舱"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
