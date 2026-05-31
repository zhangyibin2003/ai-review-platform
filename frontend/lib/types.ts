export interface User {
  user_id: number;
  username: string;
  role: 'teacher' | 'student';
  token?: string;
}

export interface Course {
  id: number;
  name: string;
  teacher_id: number;
  file_count?: number;
  kp_count?: number;
  note_count?: number;
  question_count?: number;
  created_at: string;
  files?: CourseFile[];
}

export interface CourseFile {
  id: number;
  filename: string;
  page_count: number;
}

export interface KnowledgePoint {
  id: number;
  title: string;
  clean_content: string;
  star_rating: number;
  is_error_prone: boolean;
  difficulty_level: number;
  order_index: number;
  case_count: number;
}

export interface Note {
  id: number;
  lecture_id: string;
  markdown_content: string;
  generated_at: string;
  section_count?: number;
  sections?: NoteSection[];
}

export interface NoteSection {
  id: number;
  section_type: string;
  content: string;
}

export interface Case {
  id: number;
  plain_explanation: string;
  real_life_example: string;
  engineering_example: string;
  usage_scenario: string;
  exam_tips: string;
  created_at: string;
}

export interface Question {
  id: number;
  question_type: string;
  stem: string;
  options: string[] | null;
  answer: string;
  score_points: string;
  difficulty: number;
  course_id?: number;
}

export interface ErrorBookItem {
  error_book_id: number;
  question_id: number;
  question_type: string;
  stem: string;
  options: string[] | null;
  answer: string;
  wrong_count: number;
  last_wrong_at: string;
}

export interface QuizStats {
  total_attempts: number;
  correct_count: number;
  accuracy: number;
  error_book_count: number;
}
