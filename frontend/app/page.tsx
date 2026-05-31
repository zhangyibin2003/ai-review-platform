'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Brain, FileText, PenLine, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <span className="font-bold text-xl text-slate-800">AI 课程智能复习平台</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            登录
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            进入平台
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-800 mb-4">
            AI 驱动的智能复习平台
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            上传课件 PDF，AI 自动生成精品笔记、案例解析和题库，让期末复习更高效
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            icon={<FileText className="w-8 h-8 text-blue-500" />}
            title="精品笔记生成"
            description="AI 自动降噪 PPT，提取核心知识点，生成结构化 Markdown 笔记，星级标注重点"
          />
          <FeatureCard
            icon={<Brain className="w-8 h-8 text-purple-500" />}
            title="案例解析"
            description="每个知识点附通俗解释、生活案例、工程案例和考试提示，学以致用"
          />
          <FeatureCard
            icon={<PenLine className="w-8 h-8 text-green-500" />}
            title="智能出题 & 刷题"
            description="AI 根据知识点自动生成题库，支持错题本和薄弱点专项练习"
          />
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-lg font-semibold inline-flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <BookOpen className="w-5 h-5" />
            开始使用
          </button>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all">
      <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
