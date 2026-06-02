// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import SessionGuard from "./components/SessionGuard"; // 引入我们的保安组件

export const metadata: Metadata = {
  title: "syy刷题",
  description: "快点背吧。。。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className="antialiased">
        <SessionGuard /> {/* 装载隐形防多开保安 */}
        {children}
      </body>
    </html>
  );
}