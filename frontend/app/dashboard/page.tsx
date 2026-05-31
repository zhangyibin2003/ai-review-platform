'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { courses as coursesApi } from '@/lib/api';
import { Course } from '@/lib/types';
import { BookOpen, Plus, Sparkles, LogOut, Upload } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await coursesApi.list();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!courseName.trim()) return;
    setCreating(true);
    try {
      await coursesApi.create(courseName, 1);
      setCourseName('');
      setShowCreate(false);
      await loadCourses();
    } catch (err) {
      console.error('Failed to create course:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <Sparkles className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-lg text-slate-800">AI 智能复习</span>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <LogOut className="w-4 h-4" />
          退出
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">课程列表</h1>
            <p className="text-slate-500 mt-1">管理你的课程和复习资料</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建课程
          </button>
        </div>

        {/* Create dialog */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">创建新课程</h2>
              <input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="输入课程名称，如：机器学习"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-blue-400 focus:outline-none mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !courseName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
                >
                  {creating ? '创建中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Course grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">加载中...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">还没有课程，创建你的第一门课程吧</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              创建课程
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => router.push(`/course/${course.id}`)}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 group-hover:text-blue-600 transition-colors mb-2">
                  {course.name}
                </h3>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>{course.file_count || 0} 个文件</span>
                  <span>{course.kp_count || 0} 个知识点</span>
                </div>
                <p className="text-xs text-slate-300 mt-3">
                  创建于 {course.created_at ? new Date(course.created_at).toLocaleDateString('zh-CN') : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
