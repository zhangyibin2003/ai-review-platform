'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { courses as coursesApi, getApiBase } from '@/lib/api';
import { Note } from '@/lib/types';
import MarkdownViewer from '@/components/MarkdownViewer';
import { ArrowLeft, FileText, Loader2, Download, Trash2, GraduationCap } from 'lucide-react';

export default function NotesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = Number(params.id);
  const initialType = searchParams.get('type') || 'per-ppt';

  const [notes, setNotes] = useState<Note[]>([]);
  const [examReviewNote, setExamReviewNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<'per-ppt' | 'exam-review'>(initialType as 'per-ppt' | 'exam-review');

  useEffect(() => {
    loadNotes();
  }, [courseId]);

  const loadNotes = async () => {
    try {
      const data: Note[] = await coursesApi.getNotes(courseId);
      // Separate exam review note from per-PPT notes
      const examReview = data.find((n) => n.lecture_id === '课程总复习');
      const perPptNotes = data.filter((n) => n.lecture_id !== '课程总复习');
      setNotes(perPptNotes);
      if (examReview) {
        setExamReviewNote(examReview);
      }

      // Auto-select based on view mode
      if (initialType === 'exam-review' && examReview) {
        setViewMode('exam-review');
        const detail = await coursesApi.getNoteDetail(courseId, examReview.id);
        setExamReviewNote(detail);
      } else if (perPptNotes.length > 0 && !selectedNote) {
        const detail = await coursesApi.getNoteDetail(courseId, perPptNotes[0].id);
        setSelectedNote(detail);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNote = async (noteId: number) => {
    try {
      const detail = await coursesApi.getNoteDetail(courseId, noteId);
      setSelectedNote(detail);
    } catch (err) {
      console.error('Failed to load note detail:', err);
    }
  };

  const handleExportPdf = () => {
    const target = viewMode === 'exam-review' ? examReviewNote : selectedNote;
    if (!target) return;
    window.open(`${getApiBase()}/courses/${courseId}/notes/${target.id}/pdf`, '_blank');
  };

  const handleDeleteNotes = async () => {
    if (!confirm('确定要删除本课程所有笔记和知识点吗？此操作不可撤销。')) return;
    try {
      await fetch(`/api/courses/${courseId}/notes`, { method: 'DELETE' });
      setNotes([]);
      setSelectedNote(null);
      setExamReviewNote(null);
    } catch (err) {
      alert('删除失败');
    }
  };

  const switchViewMode = async (mode: 'per-ppt' | 'exam-review') => {
    setViewMode(mode);
    if (mode === 'exam-review' && examReviewNote && !examReviewNote.markdown_content) {
      const detail = await coursesApi.getNoteDetail(courseId, examReviewNote.id);
      setExamReviewNote(detail);
    }
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
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/course/${courseId}`)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            返回课程
          </button>

          {/* View mode toggle */}
          <div className="flex gap-1 bg-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => switchViewMode('per-ppt')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'per-ppt'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              各PPT复习重点
            </button>
            <button
              onClick={() => switchViewMode('exam-review')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'exam-review'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4 inline mr-1" />
              课程总复习重点
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {((viewMode === 'per-ppt' && selectedNote) || (viewMode === 'exam-review' && examReviewNote)) && (
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              导出 PDF
            </button>
          )}
          {(notes.length > 0 || examReviewNote) && (
            <button
              onClick={handleDeleteNotes}
              className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              清除笔记
            </button>
          )}
        </div>
      </div>

      {viewMode === 'per-ppt' ? (
        /* Per-PPT notes view with sidebar */
        <div className="flex h-[calc(100vh-57px)]">
          <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto p-4">
            <h2 className="font-semibold text-slate-800 mb-4">笔记大纲</h2>
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 mb-2">暂无各PPT笔记</p>
                <button
                  onClick={() => router.push(`/course/${courseId}`)}
                  className="text-xs text-blue-500 hover:text-blue-600"
                >
                  返回课程页面生成
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleSelectNote(note.id)}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                      selectedNote?.id === note.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{note.lecture_id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <main className="flex-1 overflow-y-auto p-8">
            {selectedNote ? (
              <MarkdownViewer content={selectedNote.markdown_content} />
            ) : (
              <div className="text-center py-16 text-slate-400">
                选择左侧笔记查看内容
              </div>
            )}
          </main>
        </div>
      ) : (
        /* Course-wide exam review view - full width */
        <div className="max-w-4xl mx-auto p-8">
          {examReviewNote ? (
            <div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-amber-700">
                  <GraduationCap className="w-5 h-5" />
                  <span className="font-semibold">课程总复习重点（考试重点）</span>
                </div>
                <p className="text-sm text-amber-600 mt-1">
                  综合所有PPT内容生成，聚焦期末高频考点、知识串联和应试技巧
                </p>
              </div>
              <MarkdownViewer content={examReviewNote.markdown_content} />
            </div>
          ) : (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">暂无课程总复习重点</p>
              <button
                onClick={() => router.push(`/course/${courseId}`)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
              >
                返回课程页面生成
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
