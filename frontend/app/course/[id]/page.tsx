'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courses as coursesApi } from '@/lib/api';
import { Course } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import {
  BookOpen, FileText, Brain, PenLine, ArrowLeft,
  Sparkles, Loader2, BookMarked, CheckCircle,
} from 'lucide-react';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'cases' | 'quiz'>('overview');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCourse = useCallback(async () => {
    try {
      const data = await coursesApi.get(courseId);
      setCourse(data);
      return data;
    } catch (err) {
      console.error('Failed to load course:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleUpload = async (file: File) => {
    await coursesApi.upload(courseId, file);
    await loadCourse();
  };

  const startPolling = (checkFn: (course: Course) => boolean) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const data = await loadCourse();
      if (data && checkFn(data)) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setGeneratingNotes(false);
        setGeneratingQuestions(false);
      }
    }, 3000);
  };

  const handleGenerateNotes = async () => {
    setGeneratingNotes(true);
    try {
      const prevNoteCount = course?.note_count || 0;
      await coursesApi.generateNotes(courseId);
      // Start polling until note_count increases
      startPolling((c) => (c.note_count || 0) > prevNoteCount);
    } catch (err: any) {
      alert(err.message || '生成失败');
      setGeneratingNotes(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      const prevQCount = course?.question_count || 0;
      await coursesApi.generateQuestions(courseId);
      // Start polling until question_count increases
      startPolling((c) => (c.question_count || 0) > prevQCount);
    } catch (err: any) {
      alert(err.message || '生成失败');
      setGeneratingQuestions(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">课程不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回课程列表
          </button>
          <h1 className="text-3xl font-bold text-slate-800">{course.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-slate-500">
            <span>{course.files?.length || 0} 个课件</span>
            <span>{course.kp_count || 0} 个知识点</span>
            <span>{course.question_count || 0} 道题目</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="flex gap-1 bg-slate-200 rounded-xl p-1 mb-8">
          {[
            { key: 'overview', label: '概览', icon: BookOpen },
            { key: 'notes', label: '精品笔记', icon: FileText },
            { key: 'cases', label: '案例解析', icon: Brain },
            { key: 'quiz', label: '刷题练习', icon: PenLine },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Upload */}
            <FileUpload onUpload={handleUpload} />

            {/* Uploaded files */}
            {course.files && course.files.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">已上传课件</h3>
                <div className="space-y-2">
                  {course.files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-slate-700 flex-1">{f.filename}</span>
                      <span className="text-xs text-slate-400">{f.page_count} 页</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate buttons */}
            {course.files && course.files.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleGenerateNotes}
                  disabled={generatingNotes}
                  className={`p-6 bg-white rounded-xl border transition-all text-left group ${
                    generatingNotes
                      ? 'border-blue-300 shadow-lg bg-blue-50/50'
                      : 'border-slate-200 hover:shadow-lg hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      generatingNotes ? 'bg-blue-200' : 'bg-blue-100 group-hover:bg-blue-200'
                    }`}>
                      {generatingNotes ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">
                        {generatingNotes ? '后台生成中...' : '生成精品笔记'}
                      </span>
                      {generatingNotes && (
                        <p className="text-xs text-blue-500 mt-0.5">AI 正在处理，请耐心等待 2-5 分钟</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 pl-13">
                    AI 自动提取知识点，生成结构化复习笔记
                  </p>
                </button>

                <button
                  onClick={handleGenerateQuestions}
                  disabled={generatingQuestions || (course?.kp_count || 0) === 0}
                  className={`p-6 bg-white rounded-xl border transition-all text-left group ${
                    generatingQuestions
                      ? 'border-purple-300 shadow-lg bg-purple-50/50'
                      : (course?.kp_count || 0) === 0
                      ? 'border-slate-200 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 hover:shadow-lg hover:border-purple-300'
                  }`}
                  title={(course?.kp_count || 0) === 0 ? '请先生成笔记，获得知识点后再出题' : ''}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      generatingQuestions ? 'bg-purple-200' : 'bg-purple-100 group-hover:bg-purple-200'
                    }`}>
                      {generatingQuestions ? (
                        <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                      ) : (
                        <Brain className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">
                        {generatingQuestions ? '后台生成中...' : '生成题库'}
                      </span>
                      {generatingQuestions && (
                        <p className="text-xs text-purple-500 mt-0.5">AI 正在出题，请耐心等待 1-2 分钟</p>
                      )}
                      {(course?.kp_count || 0) === 0 && !generatingQuestions && (
                        <p className="text-xs text-amber-500 mt-0.5">需要先生成笔记获取知识点</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    AI 根据知识点自动生成考试题库
                  </p>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            {course.note_count && course.note_count > 0 ? (
              <button
                onClick={() => router.push(`/course/${courseId}/notes`)}
                className="w-full p-6 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <BookMarked className="w-6 h-6 text-blue-500" />
                  <div>
                    <p className="font-semibold text-slate-800">查看精品笔记</p>
                    <p className="text-sm text-slate-400">共 {course.note_count} 节笔记</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">还没有笔记，请在概览页面上传课件并生成</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cases' && (
          <div>
            <button
              onClick={() => router.push(`/course/${courseId}/cases`)}
              className="w-full p-6 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-purple-300 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="font-semibold text-slate-800">查看案例解析</p>
                  <p className="text-sm text-slate-400">每个知识点的通俗解释和实际应用案例</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div>
            <button
              onClick={() => router.push(`/course/${courseId}/quiz`)}
              className="w-full p-6 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-green-300 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <PenLine className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-semibold text-slate-800">开始刷题</p>
                  <p className="text-sm text-slate-400">
                    {course.question_count ? `共 ${course.question_count} 道题目` : '请先生成题库'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
