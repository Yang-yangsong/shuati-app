import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "专属刷题神器",
  description: "随时随地，高效刷题",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      {/* 去掉了报错的字体变量，保留了 Tailwind 的抗锯齿基础样式 */}
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}