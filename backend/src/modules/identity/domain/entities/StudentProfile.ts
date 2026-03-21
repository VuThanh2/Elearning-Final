import { FullName } from "../value-objects/Fullname";

export class StudentProfile {
  readonly userId: string;
  readonly fullName: FullName;
  readonly major: string;

  // Được cập nhật bởi event từ Quiz Attempt Context, không do
  // Identity Context trực tiếp thay đổi.
  readonly averageScore: number;
  readonly completedQuizAttempts: number;

  constructor(params: {
    userId: string;
    fullName: FullName;
    major: string;
    averageScore: number;
    completedQuizAttempts: number;
  }) {
    this.userId = params.userId;
    this.fullName = params.fullName;
    this.major = params.major;
    this.averageScore = params.averageScore;
    this.completedQuizAttempts = params.completedQuizAttempts;
  }
}