'use client';

import { useState, useEffect } from 'react';
import { Question } from '@/lib/types';
import { quiz } from '@/lib/api';
import { Check, X, ChevronRight, RotateCcw } from 'lucide-react';

interface QuizPlayerProps {
  questions: Question[];
  userId?: number;
  onComplete?: (stats: { correct: number; total: number }) => void;
}

export default function QuizPlayer({ questions, userId = 1, onComplete }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, { isCorrect: boolean; explanation: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter((r) => r.isCorrect).length;

  const handleSubmit = async () => {
    if (!currentQuestion || !answers[currentQuestion.id] || submitting) return;

    setSubmitting(true);
    try {
      const result = await quiz.submit(userId, currentQuestion.id, answers[currentQuestion.id]);
      setResults((prev) => ({
        ...prev,
        [currentQuestion.id]: { isCorrect: result.is_correct, explanation: result.explanation },
      }));
      setShowAnswer(true);
    } catch (err) {
      // Local grading fallback
      const isCorrect = answers[currentQuestion.id].trim().toLowerCase() ===
        currentQuestion.answer.trim().toLowerCase();
      setResults((prev) => ({
        ...prev,
        [currentQuestion.id]: { isCorrect, explanation: currentQuestion.score_points || '' },
      }));
      setShowAnswer(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setShowAnswer(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onComplete) {
      onComplete({ correct: correctCount, total: totalQuestions });
    }
  };

  const handleAnswerSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">暂无题目</p>
      </div>
    );
  }

  const result = results[currentQuestion.id];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          <span>第 {currentIndex + 1} / {totalQuestions} 题</span>
          <span>正确率：{answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
            {currentQuestion.question_type === 'single_choice' ? '单选题' :
             currentQuestion.question_type === 'multiple_choice' ? '多选题' :
             currentQuestion.question_type === 'fill_blank' ? '填空题' :
             currentQuestion.question_type === 'calculation' ? '计算题' : '简答题'}
          </span>
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            currentQuestion.difficulty <= 2 ? 'bg-green-100 text-green-700' :
            currentQuestion.difficulty <= 3 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {currentQuestion.difficulty <= 2 ? '简单' : currentQuestion.difficulty <= 3 ? '中等' : '困难'}
          </span>
        </div>

        <h3 className="text-lg font-medium text-slate-800 mb-6">{currentQuestion.stem}</h3>

        {/* Options */}
        {currentQuestion.options ? (
          <div className="space-y-3">
            {currentQuestion.options.map((opt, i) => {
              const isSelected = answers[currentQuestion.id] === opt;
              const isCorrectAnswer = showAnswer && result && currentQuestion.answer === opt;
              const isWrongSelected = showAnswer && result && isSelected && !result.isCorrect;

              return (
                <button
                  key={i}
                  disabled={showAnswer}
                  onClick={() => handleAnswerSelect(opt)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isCorrectAnswer
                      ? 'border-green-400 bg-green-50'
                      : isWrongSelected
                      ? 'border-red-400 bg-red-50'
                      : isSelected
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCorrectAnswer ? 'bg-green-500 text-white' :
                      isWrongSelected ? 'bg-red-500 text-white' :
                      isSelected ? 'bg-blue-500 text-white' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-slate-700">{opt}</span>
                    {isCorrectAnswer && <Check className="w-4 h-4 text-green-600 ml-auto" />}
                    {isWrongSelected && <X className="w-4 h-4 text-red-600 ml-auto" />}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-400 focus:outline-none min-h-[100px]"
            placeholder="输入你的答案..."
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerSelect(e.target.value)}
            disabled={showAnswer}
          />
        )}

        {/* Answer result */}
        {showAnswer && result && (
          <div className={`mt-4 p-4 rounded-lg ${result.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.isCorrect ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {result.isCorrect ? '回答正确！' : '回答错误'}
              </span>
            </div>
            {!result.isCorrect && (
              <p className="text-sm text-slate-600 mb-1">
                正确答案：<span className="font-medium text-green-700">{currentQuestion.answer}</span>
              </p>
            )}
            {result.explanation && (
              <p className="text-sm text-slate-500 mt-1">{result.explanation}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          disabled={!answers[currentQuestion.id]}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          {showAnswer ? '隐藏答案' : '查看答案'}
        </button>
        <div className="flex gap-2">
          {!showAnswer && (
            <button
              onClick={handleSubmit}
              disabled={!answers[currentQuestion.id] || submitting}
              className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {submitting ? '提交中...' : '提交答案'}
            </button>
          )}
          {showAnswer && (
            <button
              onClick={handleNext}
              className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-1"
            >
              {currentIndex < questions.length - 1 ? (
                <>下一题 <ChevronRight className="w-4 h-4" /></>
              ) : (
                '完成'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
