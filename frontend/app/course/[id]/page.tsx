'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courses as coursesApi } from '@/lib/api';
import { Course } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import {
  BookOpen, FileText, Brain, PenLine, ArrowLeft,
  Sparkles, Loader2, BookMarked, CheckCircle,
  GraduationCap, Dumbbell, Lightbulb,
} from 'lucide-react';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [generatingExamReview, setGeneratingExamReview] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [includeExamplesNotes, setIncludeExamplesNotes] = useState(false);
  const [includeExamplesExam, setIncludeExamplesExam] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'examples' | 'practice' | 'cases' | 'quiz'>('overview');
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

  const startPolling = (checkFn: (course: Course) => boolean, extraCheck?: (course: Course) => boolean) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const data = await loadCourse();
      if (data && checkFn(data)) {
        // If we also need to wait for examples, keep polling
        if (extraCheck && !extraCheck(data)) {
          return;
        }
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setGeneratingNotes(false);
        setGeneratingExamReview(false);
        setGeneratingQuestions(false);
      }
    }, 3000);
  };

  const handleGenerateNotes = async () => {
    setGeneratingNotes(true);
    try {
      const prevNoteCount = course?.note_count || 0;
      const prevExampleCount = course?.example_count || 0;
      await coursesApi.generateNotes(courseId, includeExamplesNotes);
      startPolling(
        (c) => (c.note_count || 0) > prevNoteCount,
        includeExamplesNotes ? (c) => (c.example_count || 0) > prevExampleCount : undefined,
      );
    } catch (err: any) {
      alert(err.message || '生成失败');
      setGeneratingNotes(false);
    }
  };

  const handleGenerateExamReview = async () => {
    setGeneratingExamReview(true);
    try {
      const prevNoteCount = course?.note_count || 0;
      const prevExampleCount = course?.example_count || 0;
      await coursesApi.generateExamReview(courseId, includeExamplesExam);
      startPolling(
        (c) => (c.note_count || 0) > prevNoteCount,
        includeExamplesExam ? (c) => (c.example_count || 0) > prevExampleCount : undefined,
      );
    } catch (err: any) {
      alert(err.message || '生成失败');
      setGeneratingExamReview(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      const prevQCount = course?.question_count || 0;
      await coursesApi.generateQuestions(courseId);
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

  const hasFiles = course.files && course.files.length > 0;
  const hasKps = (course.kp_count || 0) > 0;

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
            <span>{course.example_count || 0} 道例题</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="flex gap-1 bg-slate-200 rounded-xl p-1 mb-8 overflow-x-auto">
          {[
            { key: 'overview', label: '概览', icon: BookOpen },
            { key: 'review', label: '复习重点', icon: GraduationCap },
            { key: 'examples', label: '例题总结', icon: Lightbulb },
            { key: 'practice', label: '习题集', icon: Dumbbell },
            { key: 'cases', label: '案例解析', icon: Brain },
            { key: 'quiz', label: '刷题练习', icon: PenLine },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
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
            {hasFiles && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">已上传课件</h3>
                <div className="space-y-2">
                  {course.files!.map((f) => (
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
            {hasFiles && (
              <div className="space-y-4">
                {/* Per-PPT notes generation */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">生成各PPT复习重点</h3>
                  <p className="text-sm text-slate-500 mb-4">为每个PPT课件单独生成一份结构化复习笔记</p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeExamplesNotes}
                        onChange={(e) => setIncludeExamplesNotes(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">包含例题总结（从PPT中提取例题并附带详细解法）</span>
                    </label>
                    <button
                      onClick={handleGenerateNotes}
                      disabled={generatingNotes}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        generatingNotes
                          ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {generatingNotes ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          后台生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          生成精品笔记
                        </>
                      )}
                    </button>
                  </div>
                  {generatingNotes && (
                    <p className="text-xs text-blue-500 mt-3">
                      AI 正在处理{includeExamplesNotes ? '（含例题提取）' : ''}，请耐心等待 2-5 分钟
                    </p>
                  )}
                </div>

                {/* Course-wide exam review generation */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">生成课程总复习重点（考试重点）</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    综合所有PPT内容，生成一份期末考前提纲，包含考点聚焦、知识串联和应试技巧
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeExamplesExam}
                        onChange={(e) => setIncludeExamplesExam(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                      />
                      <span className="text-sm text-slate-600">包含课程总例题总结（从所有PPT中挑选典型例题）</span>
                    </label>
                    <button
                      onClick={handleGenerateExamReview}
                      disabled={generatingExamReview}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        generatingExamReview
                          ? 'bg-amber-100 text-amber-600 cursor-not-allowed'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      {generatingExamReview ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          后台生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          生成考试重点
                        </>
                      )}
                    </button>
                  </div>
                  {generatingExamReview && (
                    <p className="text-xs text-amber-500 mt-3">
                      AI 正在整合所有PPT内容{includeExamplesExam ? '（含例题提取）' : ''}，请耐心等待 3-6 分钟
                    </p>
                  )}
                </div>

                {/* Generate questions */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">生成题库</h3>
                  <p className="text-sm text-slate-500 mb-4">AI 根据知识点自动生成考试题库（需先生成笔记获取知识点）</p>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={generatingQuestions || !hasKps}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      generatingQuestions
                        ? 'bg-purple-100 text-purple-600 cursor-not-allowed'
                        : !hasKps
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
                    title={!hasKps ? '请先生成笔记，获得知识点后再出题' : ''}
                  >
                    {generatingQuestions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        后台生成中...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        生成题库
                      </>
                    )}
                  </button>
                  {!hasKps && (
                    <p className="text-xs text-amber-500 mt-2">需要先生成笔记获取知识点</p>
                  )}
                  {generatingQuestions && (
                    <p className="text-xs text-purple-500 mt-2">AI 正在出题，请耐心等待 1-2 分钟</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'review' && (
          <div>
            <div className="grid grid-cols-2 gap-4">
              {/* Per-PPT notes */}
              <button
                onClick={() => router.push(`/course/${courseId}/notes`)}
                className="p-6 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-lg">各PPT复习重点</p>
                    <p className="text-sm text-slate-400">
                      {course.note_count && course.note_count > 0
                        ? `共 ${course.note_count} 节笔记（不含总复习）`
                        : '还没有笔记'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-3">每个PPT对应的独立复习笔记，详细讲解各章节内容</p>
              </button>

              {/* Course-wide exam review */}
              <button
                onClick={() => router.push(`/course/${courseId}/notes?type=exam-review`)}
                className="p-6 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-amber-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                    <GraduationCap className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-lg">课程总复习重点</p>
                    <p className="text-sm text-slate-400">
                      考试重点提纲、考点串联、应试技巧
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-3">
                  综合所有PPT的期末考前提纲，聚焦高频考点和知识串联
                </p>
              </button>
            </div>
            {(!course.note_count || course.note_count === 0) && (
              <div className="text-center py-16 mt-8">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">暂无复习笔记</p>
                <p className="text-sm text-slate-400">请在「概览」页面上传课件并生成</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'examples' && (
          <div>
            {(course.example_count || 0) > 0 ? (
              <button
                onClick={() => router.push(`/course/${courseId}/examples`)}
                className="w-full p-6 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-amber-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Lightbulb className="w-6 h-6 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-800">查看例题总结</p>
                    <p className="text-sm text-slate-400">
                      共 {course.example_count} 道例题（含详细解法）
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="text-center py-16">
                <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">暂无例题总结</p>
                <p className="text-sm text-slate-400">请在「概览」页面生成时勾选「包含例题总结」</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'practice' && (
          <div>
            {(course.example_count || 0) > 0 ? (
              <button
                onClick={() => router.push(`/course/${courseId}/practice`)}
                className="w-full p-6 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-green-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Dumbbell className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-semibold text-slate-800">进入习题集</p>
                    <p className="text-sm text-slate-400">
                      共 {course.example_count} 道习题（不含答案，适合练习）
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="text-center py-16">
                <Dumbbell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">暂无习题</p>
                <p className="text-sm text-slate-400">请先生成例题总结，习题集将自动同步（不含答案版本）</p>
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
