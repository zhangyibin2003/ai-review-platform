'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courses, knowledge } from '@/lib/api';
import { KnowledgePoint, Case } from '@/lib/types';
import StarRating from '@/components/StarRating';
import { ArrowLeft, Brain, Sparkles, ChevronDown, ChevronUp, Lightbulb, BookOpen, Wrench, Target } from 'lucide-react';

export default function CasesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [kps, setKps] = useState<KnowledgePoint[]>([]);
  const [cases, setCases] = useState<Record<number, Case[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<number, boolean>>({});
  const [expandedKp, setExpandedKp] = useState<number | null>(null);

  useEffect(() => {
    loadKps();
  }, [courseId]);

  const loadKps = async () => {
    try {
      const data: KnowledgePoint[] = await courses.listKnowledgePoints(courseId);
      setKps(data);
      // Load existing cases
      const casesMap: Record<number, Case[]> = {};
      await Promise.all(
        data.map(async (kp: KnowledgePoint) => {
          try {
            const c = await knowledge.getCases(kp.id);
            if (c.length > 0) casesMap[kp.id] = c;
          } catch {
            // no existing cases
          }
        })
      );
      setCases(casesMap);
    } catch (err) {
      console.error('Failed to load knowledge points:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCase = async (kpId: number) => {
    setGenerating((prev) => ({ ...prev, [kpId]: true }));
    try {
      const result = await knowledge.generateCase(kpId);
      setCases((prev) => ({
        ...prev,
        [kpId]: [...(prev[kpId] || []), result],
      }));
    } catch (err) {
      console.error('Failed to generate case:', err);
    } finally {
      setGenerating((prev) => ({ ...prev, [kpId]: false }));
    }
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

      <main className="max-w-4xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">案例解析</h1>

        {kps.length === 0 ? (
          <div className="text-center py-16">
            <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">暂无知识点，请先生成笔记</p>
          </div>
        ) : (
          <div className="space-y-4">
            {kps.map((kp) => {
              const kpCases = cases[kp.id] || [];
              const isExpanded = expandedKp === kp.id;

              return (
                <div key={kp.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Header */}
                  <div
                    onClick={() => setExpandedKp(isExpanded ? null : kp.id)}
                    className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-slate-800">{kp.title}</h3>
                          <StarRating rating={kp.star_rating} />
                          {kp.is_error_prone && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600">
                              易错
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{kp.clean_content}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {kpCases.length === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateCase(kp.id);
                            }}
                            disabled={generating[kp.id]}
                            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-xs font-medium flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            {generating[kp.id] ? '生成中...' : '生成案例'}
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded case */}
                  {isExpanded && kpCases.length > 0 && (
                    <div className="border-t border-slate-200 p-5 space-y-4">
                      {kpCases.map((c) => (
                        <div key={c.id} className="space-y-3">
                          <CaseSection icon={<Lightbulb className="w-4 h-4" />} title="通俗解释" color="text-yellow-600" bg="bg-yellow-50" border="border-yellow-200">
                            {c.plain_explanation}
                          </CaseSection>
                          <CaseSection icon={<BookOpen className="w-4 h-4" />} title="生活案例" color="text-green-600" bg="bg-green-50" border="border-green-200">
                            {c.real_life_example}
                          </CaseSection>
                          <CaseSection icon={<Wrench className="w-4 h-4" />} title="工程案例" color="text-blue-600" bg="bg-blue-50" border="border-blue-200">
                            {c.engineering_example}
                          </CaseSection>
                          <CaseSection icon={<Target className="w-4 h-4" />} title="使用场景 & 考试提示" color="text-purple-600" bg="bg-purple-50" border="border-purple-200">
                            <p className="mb-2">{c.usage_scenario}</p>
                            <p>{c.exam_tips}</p>
                          </CaseSection>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CaseSection({
  icon,
  title,
  color,
  bg,
  border,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  bg: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${bg} ${border} border rounded-lg p-4`}>
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-sm text-slate-600">{children}</p>
    </div>
  );
}
