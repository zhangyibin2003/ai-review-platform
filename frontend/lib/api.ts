// Production backend on Render, local dev uses Next.js proxy
const PROD_API = 'https://ai-review-backend-7iw2.onrender.com/api';
const LOCAL_API = '/api';

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on localhost
    return window.location.hostname === 'localhost' ? LOCAL_API : PROD_API;
  }
  // Server-side: use env var if set, otherwise production
  return process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : PROD_API;
}

const API_BASE = getApiUrl();

export function getApiBase(): string {
  return API_BASE;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// Auth
export const auth = {
  register: (data: { username: string; email: string; password: string; role: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
};

// Courses
export const courses = {
  list: () => request('/courses'),
  get: (id: number) => request(`/courses/${id}`),
  create: (name: string, teacher_id: number) =>
    request('/courses', { method: 'POST', body: JSON.stringify({ name, teacher_id }) }),
  deleteFile: (courseId: number, fileId: number) =>
    request(`/courses/${courseId}/files/${fileId}`, { method: 'DELETE' }),
  upload: async (courseId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/courses/${courseId}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  generateNotes: (courseId: number, includeExamples?: boolean) =>
    request(`/courses/${courseId}/generate-notes${includeExamples ? '?include_examples=true' : ''}`, { method: 'POST' }),
  getNotes: (courseId: number) => request(`/courses/${courseId}/notes`),
  getNoteDetail: (courseId: number, noteId: number) =>
    request(`/courses/${courseId}/notes/${noteId}`),
  listKnowledgePoints: (courseId: number) =>
    request(`/courses/${courseId}/knowledge-points`),
  generateQuestions: (courseId: number) =>
    request(`/courses/${courseId}/generate-questions`, { method: 'POST' }),
  listQuestions: (courseId: number, type?: string, diff?: number) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (diff) params.set('diff', String(diff));
    const qs = params.toString();
    return request(`/courses/${courseId}/questions${qs ? `?${qs}` : ''}`);
  },
  generateExamReview: (courseId: number, includeExamples?: boolean) =>
    request(`/courses/${courseId}/generate-exam-review${includeExamples ? '?include_examples=true' : ''}`, { method: 'POST' }),
  getExamples: (courseId: number, lectureId?: string) =>
    request(`/courses/${courseId}/examples${lectureId ? `?lecture_id=${encodeURIComponent(lectureId)}` : ''}`),
  getPracticeProblems: (courseId: number) =>
    request(`/courses/${courseId}/examples/practice`),
  deleteExamples: (courseId: number) =>
    request(`/courses/${courseId}/examples`, { method: 'DELETE' }),
};

// Knowledge & Cases
export const knowledge = {
  search: (q: string) => request(`/knowledge/search?q=${encodeURIComponent(q)}`),
  generateCase: (kpId: number) =>
    request(`/knowledge/${kpId}/generate-case`, { method: 'POST' }),
  getCases: (kpId: number) => request(`/knowledge/${kpId}/cases`),
};

// Quiz
export const quiz = {
  submit: (userId: number, questionId: number, userAnswer: string) =>
    request('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, question_id: questionId, user_answer: userAnswer }),
    }),
  getErrorBook: (userId: number = 1) => request(`/quiz/error-book?user_id=${userId}`),
  generateWeakness: (userId: number = 1) =>
    request(`/quiz/generate-weakness?user_id=${userId}`, { method: 'POST' }),
  getStats: (userId: number = 1) => request(`/quiz/stats?user_id=${userId}`),
};
