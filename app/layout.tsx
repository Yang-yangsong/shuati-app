import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "syy刷题",
  description: "使劲背。。。",
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