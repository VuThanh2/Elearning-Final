// Auth Types
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface StudentProfile {
  id: string;
  userId: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  studentProfile?: StudentProfile;
  teacherProfile?: TeacherProfile;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Academic Types
export type AcademicLevel = 'FACULTY' | 'COURSE' | 'SECTION';

export interface AcademicUnit {
  id: string;
  name: string;
  parentId?: string;
  level: AcademicLevel;
  children?: AcademicUnit[];
  createdAt?: string;
  updatedAt?: string;
}

// Section DTO from backend includes full context (course, faculty names)
export interface Section {
  sectionId: string;           // Backend returns sectionId, not id
  sectionName: string;
  sectionCode: string;
  courseName: string;
  courseCode: string;
  facultyName: string;
  facultyCode: string;
  term?: string;               // Optional fields from TeachingSectionDTO
  academicYear?: string;
  level?: AcademicLevel;       // Keep for compatibility
}

// For backward compatibility, add a helper
export interface SectionForDisplay extends Section {
  id?: string;  // Alias for sectionId
  name?: string;  // Alias for sectionName
}

// Quiz Types
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'MultipleChoice';
export type QuizStatus = 'DRAFT' | 'Draft' | 'PUBLISHED' | 'Published' | 'HIDDEN' | 'Hidden' | 'EXPIRED' | 'Expired';

export interface AnswerOption {
  optionId: string;   // Backend returns optionId, normalization ensures this exists
  id: string;         // Normalized field for compatibility
  content: string;
  isCorrect: boolean;
}

export interface Question {
  questionId: string; // Backend returns questionId, normalization ensures this exists
  id: string;         // Normalized field for compatibility
  content: string;
  questionType: QuestionType;
  answerOptions: AnswerOption[];
  points?: number;    // Backend includes this
  fromBackend?: boolean;  // Flag to track if this is from backend (for edit mode)
  __original?: string;    // JSON string of original data for change detection
}

export interface Quiz {
  quizId: string;     // Backend returns quizId, normalization ensures this exists
  id: string;         // Normalized field for compatibility
  teacherId: string;
  sectionId: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  deadlineAt: string; // ISO date
  maxAttempts: number;
  maxScore: number;
  status: QuizStatus;
  questions: Question[];
  hiddenReason?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  totalQuestions?: number;   // Backend includes this
  questionPoints?: number;   // Backend includes this
}

export interface CreateQuizRequest {
  title: string;
  description: string;
  timeLimitMinutes: number;
  deadlineAt: string;
  maxAttempts: number;
  maxScore: number;
}

export interface UpdateQuizRequest extends Partial<CreateQuizRequest> {}

export interface AddQuestionRequest {
  content: string;
  questionType: QuestionType;
  answerOptions?: Array<{
    content: string;
    isCorrect: boolean;
  }>;
}

export interface UpdateQuestionRequest extends Partial<AddQuestionRequest> {}

export interface AddAnswerOptionRequest {
  content: string;
  isCorrect: boolean;
}

export interface UpdateAnswerOptionRequest extends Partial<AddAnswerOptionRequest> {}

// Quiz Attempt Types
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface StudentAnswer {
  questionId: string;
  selectedOptionIds: string[];
  earnedPoints: number;
  isCorrect: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  sectionId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string;
  score: number;
  maxScore: number;
  answers?: StudentAnswer[];
}

export interface StartAttemptRequest {
  quizId: string;
}

export interface SubmitAttemptRequest {
  answers: Array<{
    questionId: string;
    selectedOptionIds: string[];
  }>;
}

// Analytics Types
export interface QuizPerformance {
  quizId: string;
  quizTitle: string;
  sectionId: string;
  totalAttempts: number;
  completionRate: number;
  averageScore: number;
  maxScore: number;
}

export interface StudentQuizResult {
  attemptId: string;
  studentId: string;
  studentName: string;
  quizId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  completionRate: number;
  submittedAt: string;
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  participationRate: number;
  averageScore: number;
  lastAttemptDate?: string;
}

export interface AtRiskStudentsResponse {
  sectionId: string;
  sectionName: string;
  totalStudents: number;
  rankedStudents: number;
  students: AtRiskStudent[];
}

export interface StudentClassRanking {
  studentId: string;
  studentName: string;
  rank: number;
  score: number;
  percentile: number;
}

export interface ScoreDistributionBucket {
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

export interface ScoreDistribution {
  quizId: string;
  quizTitle: string;
  maxScore: number;
  buckets: ScoreDistributionBucket[];
}

export interface QuestionFailureRate {
  questionId: string;
  questionContent: string;
  failureRate: number;
  totalAttempts: number;
  correctCount: number;
}

export interface HierarchicalReportNode {
  id: string;
  name: string;
  level: AcademicLevel;
  totalQuizzes?: number;           // Optional - may not be present in all responses
  averageScore?: number;           // Optional - may not be present in all responses
  completionRate?: number;         // Optional - may not be present in all responses
  children?: HierarchicalReportNode[];
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

// API Error Response
export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}
