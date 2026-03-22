
export class TeacherProfile {
  readonly userId: string;
  readonly department: string;

  // Counter được cập nhật từ Quiz Context qua event, không do
  // Identity Context trực tiếp thay đổi.
  readonly quizzesCreated: number;

  constructor(params: {
    userId: string;
    department: string;
    quizzesCreated: number;
  }) {
    this.userId = params.userId;
    this.department = params.department;
    this.quizzesCreated = params.quizzesCreated;
  }
}