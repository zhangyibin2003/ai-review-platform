'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courses as coursesApi } from '@/lib/api';
import { ArrowLeft, Dumbbell, Loader2, Eye, EyeOff } from 'lucide-react';

interface PracticeProblem {
  id: number;
  lecture_id: string | null;
  stem: string;
  problem_type: string;
  difficulty: number;
  order_index: number;
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadProblems();
  }, [courseId]);

  const loadProblems = async () => {
    try {
      const data = await coursesApi.getPracticeProblems(courseId);
      setProblems(data);
    } catch (err) {
      console.error('Failed to load practice problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (id: number) => {
    setShowAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const difficultyLabel = (d: number) => {
    const labels = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];
    const colors = ['', 'text-green-600', 'text-green-600', 'text-amber-600', 'text-orange-600', 'text-red-600'];
    return { label: labels[d] || '★★★☆☆', color: colors[d] || 'text-amber-600' };
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      calculation: '计算题',
      concept: '概念题',
      proof: '证明题',
      application: '应用题',
      comprehensive: '综合题',
      example: '例题',
    };
    return map[t] || t;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <button
            onClick={() => router.push(`/course/${courseId}`)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回课程
          </button>
          <div className="flex items-center gap-3">
            <Dumbbell className="w-7 h-7 text-green-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">习题集</h1>
              <p className="text-sm text-slate-400">
                共 {problems.length} 道习题 · 不含答案，适合独立练习
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-6">
        {problems.length === 0 ? (
          <div className="text-center py-16">
            <Dumbbell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">暂无习题</p>
            <p className="text-sm text-slate-400 mb-4">
              请先在课程页面生成例题总结，习题集将自动同步（不含答案版本）
            </p>
            <button
              onClick={() => router.push(`/course/${courseId}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              返回课程页面
            </button>
          </div>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-green-700">
                <Dumbbell className="w-5 h-5" />
                <span className="font-semibold">习题模式</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                以下题目默认隐藏答案和详细解法。完成练习后可点击「查看答案」核对。
              </p>
            </div>

            <div className="space-y-6">
              {problems.map((problem, idx) => {
                const diff = difficultyLabel(problem.difficulty);
                return (
                  <div key={problem.id} className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                            {typeLabel(problem.problem_type)}
                          </span>
                          <span className={`text-xs font-medium ${diff.color}`}>{diff.label}</span>
                          {problem.lecture_id && (
                            <span className="text-xs text-slate-400">{problem.lecture_id}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleAnswer(problem.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          showAnswers[problem.id]
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {showAnswers[problem.id] ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            隐藏答案
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            查看答案
                          </>
                        )}
                      </button>
                    </div>

                    {/* Problem content */}
                    <div className="ml-11 prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                      {problem.stem}
                    </div>

                    {/* Answer placeholder / Loading state */}
                    {showAnswers[problem.id] && (
                      <div className="ml-11 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">
                            答案加载中...
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          请前往「例题总结」查看完整答案和详细解法
                        </p>
                        <button
                          onClick={() => router.push(`/course/${courseId}/examples`)}
                          className="mt-2 text-sm text-blue-500 hover:text-blue-600 underline"
                        >
                          前往例题总结 →
                        </button>
                      </div>
                    )}

                    {/* Spacer for answer area */}
                    {!showAnswers[problem.id] && (
                      <div className="ml-11 mt-4 p-4 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                        <p className="text-sm text-slate-300">作答区域</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
