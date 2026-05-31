import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 课程智能复习平台',
  description: '为高校课程构建的 AI 驱动智能复习平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
