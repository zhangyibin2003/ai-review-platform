'use client';

import { FileText, Star } from 'lucide-react';

interface NoteCardProps {
  id: number;
  lectureId: string;
  generatedAt: string;
  sectionCount: number;
  contentPreview: string;
  onClick: () => void;
}

export default function NoteCard({ lectureId, generatedAt, sectionCount, contentPreview, onClick }: NoteCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              {lectureId}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {sectionCount} 个知识点 · {generatedAt ? new Date(generatedAt).toLocaleDateString('zh-CN') : ''}
            </p>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-500 line-clamp-3 mt-2">{contentPreview}</p>
    </div>
  );
}
