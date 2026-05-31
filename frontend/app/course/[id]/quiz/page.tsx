'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courses } from '@/lib/api';
import { Question } from '@/lib/types';
import QuizPlayer from '@/components/QuizPlayer';
import ErrorBook from '@/components/ErrorBook';
import { ArrowLeft, Filter, Play, AlertCircle } from 'lucide-react';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [filterType, setFilterType] = useState('');
  const [filterDiff, setFilterDiff] = useState<number | null>(null);

  useEffect(() => {
    loadQuestions();
  }, [courseId]);

  useEffect(() => {
    applyFilters();
  }, [questions, filterType, filterDiff]);

  const loadQuestions = async () => {
    try {
      const data = await courses.listQuestions(courseId);
      setQuestions(data);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...questions];
    if (filterType) {
      filtered = filtered.filter((q) => q.question_type === filterType);
    }
    if (filterDiff) {
      filtered = filtered.filter((q) => q.difficulty === filterDiff);
    }
    setFilteredQuestions(filtered);
  };

  const handleComplete = (s: { correct: number; total: number }) => {
    setStats(s);
    setFinished(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-4">
        <button
          onClick={() => router.push(`/course/${courseId}`)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          返回课程
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-8 py-8">
        {!started ? (
          <div>
            {/* Start screen */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">刷题练习</h1>
              <p className="text-slate-500">共 {questions.length} 道题目</p>
            </div>

            {/* Error book */}
            <div className="mb-8">
              <ErrorBook />
            </div>

            {/* Filter */}
            {questions.length > 0 && (
              <div className="flex gap-3 mb-6 flex-wrap">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400"
                >
                  <option value="">全部题型</option>
                  <option value="single_choice">单选题</option>
                  <option value="multiple_choice">多选题</option>
                  <option value="fill_blank">填空题</option>
                  <option value="short_answer">简答题</option>
                  <option value="calculation">计算题</option>
                </select>
                <select
                  value={filterDiff ?? ''}
                  onChange={(e) => setFilterDiff(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400"
                >
                  <option value="">全部难度</option>
                  <option value="1">简单</option>
                  <option value="2">较易</option>
                  <option value="3">中等</option>
                  <option value="4">较难</option>
                  <option value="5">困难</option>
                </select>

                <button
                  onClick={() => setStarted(true)}
                  disabled={filteredQuestions.length === 0}
                  className="ml-auto px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  开始刷题 ({filteredQuestions.length} 题)
                </button>
              </div>
            )}

            {questions.length === 0 && (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">还没有题目，请在课程概览页面生成题库</p>
                <button
                  onClick={() => router.push(`/course/${courseId}`)}
                  className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  前往生成题库
                </button>
              </div>
            )}
          </div>
        ) : finished ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              {stats.correct / stats.total >= 0.8 ? '🎉' : stats.correct / stats.total >= 0.6 ? '👍' : '💪'}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">练习完成！</h2>
            <p className="text-lg text-slate-500 mb-2">
              正确率：{Math.round((stats.correct / stats.total) * 100)}%
            </p>
            <p className="text-sm text-slate-400 mb-8">
              {stats.correct} / {stats.total} 题正确
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setStarted(false); setFinished(false); }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                返回题目列表
              </button>
              <button
                onClick={() => { setFinished(false); }}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                重新练习
              </button>
            </div>
          </div>
        ) : (
          <QuizPlayer
            questions={filteredQuestions}
            userId={1}
            onComplete={handleComplete}
          />
        )}
      </main>
    </div>
  );
}
