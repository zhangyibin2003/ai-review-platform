'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courses as coursesApi } from '@/lib/api';
import { ExampleProblem } from '@/lib/types';
import MarkdownViewer from '@/components/MarkdownViewer';
import { ArrowLeft, Lightbulb, Loader2, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export default function ExamplesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [examples, setExamples] = useState<ExampleProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [filterLecture, setFilterLecture] = useState<string>('all');

  useEffect(() => {
    loadExamples();
  }, [courseId]);

  const loadExamples = async () => {
    try {
      const data = await coursesApi.getExamples(courseId);
      setExamples(data);
      // Auto-expand all solutions
      setExpandedIds(new Set(data.map((e: ExampleProblem) => e.id)));
    } catch (err) {
      console.error('Failed to load examples:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const lectures = Array.from(new Set(examples.map((e) => e.lecture_id).filter(Boolean))) as string[];

  const filteredExamples = filterLecture === 'all'
    ? examples
    : examples.filter((e) => e.lecture_id === filterLecture);

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
            <Lightbulb className="w-7 h-7 text-amber-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">例题总结</h1>
              <p className="text-sm text-slate-400">共 {examples.length} 道例题（含详细解法）</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-6">
        {examples.length === 0 ? (
          <div className="text-center py-16">
            <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">暂未生成例题总结</p>
            <p className="text-sm text-slate-400 mb-4">请在课程页面生成时勾选「包含例题总结」</p>
            <button
              onClick={() => router.push(`/course/${courseId}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              返回课程页面
            </button>
          </div>
        ) : (
          <>
            {/* Lecture filter */}
            {lectures.length > 1 && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <Filter className="w-4 h-4 text-slate-400" />
                <button
                  onClick={() => setFilterLecture('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filterLecture === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  全部 ({examples.length})
                </button>
                {lectures.map((lec) => {
                  const count = examples.filter((e) => e.lecture_id === lec).length;
                  return (
                    <button
                      key={lec}
                      onClick={() => setFilterLecture(lec)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        filterLecture === lec
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {lec} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Example cards */}
            <div className="space-y-4">
              {filteredExamples.map((example, idx) => {
                const diff = difficultyLabel(example.difficulty);
                const isExpanded = expandedIds.has(example.id);
                return (
                  <div key={example.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {/* Problem header */}
                    <button
                      onClick={() => toggleExpand(example.id)}
                      className="w-full text-left p-5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                              {typeLabel(example.problem_type)}
                            </span>
                            <span className={`text-xs font-medium ${diff.color}`}>{diff.label}</span>
                            {example.lecture_id && (
                              <span className="text-xs text-slate-400">{example.lecture_id}</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-800 prose prose-sm max-w-none line-clamp-2">
                            <MarkdownViewer content={example.stem} />
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-slate-400 mt-1">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </button>

                    {/* Solution (expandable) */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-amber-50/30 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">
                            详细解法
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-700">
                          <MarkdownViewer content={example.solution} />
                        </div>
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
