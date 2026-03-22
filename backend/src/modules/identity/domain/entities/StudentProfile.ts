
export class StudentProfile {
  readonly userId: string;
  readonly major: string;

  // Được cập nhật bởi event từ Quiz Attempt Context, không do
  // Identity Context trực tiếp thay đổi.
  readonly averageScore: number;
  readonly completedQuizAttempts: number;

  constructor(params: {
    userId: string;
    major: string;
    averageScore: number;
    completedQuizAttempts: number;
  }) {
    this.userId = params.userId;
    this.major = params.major;
    this.averageScore = params.averageScore;
    this.completedQuizAttempts = params.completedQuizAttempts;
  }
}