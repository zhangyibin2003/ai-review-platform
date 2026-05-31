'use client';

import { useEffect, useState } from 'react';
import { ErrorBookItem, QuizStats } from '@/lib/types';
import { quiz } from '@/lib/api';
import { AlertCircle, TrendingUp, Brain, Trash2 } from 'lucide-react';

export default function ErrorBook() {
  const [errors, setErrors] = useState<ErrorBookItem[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [errorData, statsData] = await Promise.all([
        quiz.getErrorBook(),
        quiz.getStats(),
      ]);
      setErrors(errorData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load error book:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWeakness = async () => {
    try {
      const result = await quiz.generateWeakness();
      alert('已生成专项练习题，请到刷题页面查看');
    } catch (err: any) {
      alert(err.message || '生成失败');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{stats.accuracy}%</p>
            <p className="text-xs text-slate-500 mt-1">正确率</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{stats.error_book_count}</p>
            <p className="text-xs text-slate-500 mt-1">错题数</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <Brain className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{stats.total_attempts}</p>
            <p className="text-xs text-slate-500 mt-1">总答题</p>
          </div>
        </div>
      )}

      {/* Generate weakness questions */}
      {errors.length > 0 && (
        <button
          onClick={handleGenerateWeakness}
          className="w-full py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Brain className="w-4 h-4" />
          生成薄弱点专项练习
        </button>
      )}

      {/* Error list */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">错题列表</h3>
        {errors.length === 0 ? (
          <p className="text-slate-400 text-center py-6">暂无错题，继续保持！</p>
        ) : (
          errors.map((e) => (
            <div key={e.error_book_id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                      {e.question_type === 'single_choice' ? '单选' : e.question_type}
                    </span>
                    <span className="text-xs text-slate-400">
                      错误 {e.wrong_count} 次
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{e.stem}</p>
                  <p className="text-xs text-green-600">
                    正确答案：{e.answer}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {e.last_wrong_at ? new Date(e.last_wrong_at).toLocaleDateString('zh-CN') : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
