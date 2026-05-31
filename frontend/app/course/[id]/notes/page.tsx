'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courses as coursesApi, getApiBase } from '@/lib/api';
import { Note } from '@/lib/types';
import MarkdownViewer from '@/components/MarkdownViewer';
import { ArrowLeft, FileText, Loader2, Download, Trash2 } from 'lucide-react';

export default function NotesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    loadNotes();
  }, [courseId]);

  const loadNotes = async () => {
    try {
      const data = await coursesApi.getNotes(courseId);
      setNotes(data);
      if (data.length > 0 && !selectedNote) {
        const detail = await coursesApi.getNoteDetail(courseId, data[0].id);
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
    if (!selectedNote) return;
    // Open the backend PDF export endpoint in a new tab, which auto-triggers print
    window.open(`${getApiBase()}/courses/${courseId}/notes/${selectedNote.id}/pdf`, '_blank');
  };

  const handleDeleteNotes = async () => {
    if (!confirm('确定要删除本课程所有笔记和知识点吗？此操作不可撤销。')) return;
    try {
      await fetch(`/api/courses/${courseId}/notes`, { method: 'DELETE' });
      setNotes([]);
      setSelectedNote(null);
    } catch (err) {
      alert('删除失败');
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
        <button
          onClick={() => router.push(`/course/${courseId}`)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          返回课程
        </button>
        <div className="flex items-center gap-2">
          {selectedNote && (
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              导出 PDF
            </button>
          )}
          {notes.length > 0 && (
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

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto p-4">
          <h2 className="font-semibold text-slate-800 mb-4">笔记大纲</h2>
          {notes.length === 0 ? (
            <p className="text-sm text-slate-400">暂无笔记</p>
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

        {/* Main content */}
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
    </div>
  );
}
