const ref = (schemaName: string) => ({
  $ref: `#/components/schemas/${schemaName}`,
});

const responseRef = (responseName: string) => ({
  $ref: `#/components/responses/${responseName}`,
});

const arrayOf = (schema: Record<string, unknown>) => ({
  type: "array",
  items: schema,
});

const jsonContent = (schema: Record<string, unknown>) => ({
  "application/json": {
    schema,
  },
});

const successResponse = (
  description: string,
  schema: Record<string, unknown>,
) => ({
  description,
  content: jsonContent(schema),
});

const emptyResponse = (description: string) => ({
  description,
});

const pathParam = (name: string, description: string) => ({
  in: "path",
  name,
  required: true,
  description,
  schema: { type: "string" },
});

const queryParam = (
  name: string,
  description: string,
  schema: Record<string, unknown>,
  required = false,
) => ({
  in: "query",
  name,
  required,
  description,
  schema,
});

const requestBody = (
  schema: Record<string, unknown>,
  description?: string,
  required = true,
) => ({
  required,
  ...(description ? { description } : {}),
  content: jsonContent(schema),
});

const objectSchema = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({
  type: "object",
  properties,
  ...(required.length > 0 ? { required } : {}),
});

const stringEnum = (values: string[]) => ({
  type: "string",
  enum: values,
});

const bearerSecurity = [{ bearerAuth: [] }];

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "E-Learning LMS API",
    version: "1.0.0",
    description:
      "Swagger UI for testing the Elearning backend. Use `POST /auth/login` first, then paste the returned `accessToken` into the Authorize dialog as a Bearer token.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "System", description: "Health and service metadata" },
    { name: "Identity", description: "Authentication and password reset" },
    { name: "Academic", description: "Teacher and student section listings" },
    { name: "Quiz", description: "Teacher quiz CRUD and publishing flow" },
    { name: "Quiz Attempt", description: "Student attempt lifecycle" },
    { name: "Analytics - Teacher", description: "Teacher analytics endpoints" },
    { name: "Analytics - Student", description: "Student analytics endpoints" },
    { name: "Analytics - Admin", description: "Admin hierarchical report endpoints" },
  ],
  security: bearerSecurity,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    responses: {
      BadRequest: successResponse("Validation error.", ref("ErrorResponse")),
      Unauthorized: successResponse("Authentication failed or token missing.", ref("ErrorResponse")),
      Forbidden: successResponse("Authenticated but not allowed to perform this action.", ref("ErrorResponse")),
      NotFound: successResponse("Requested resource was not found.", ref("ErrorResponse")),
      Conflict: successResponse("Resource state does not allow the requested action.", ref("ErrorResponse")),
      UnprocessableEntity: successResponse("Business rule violation.", ref("ErrorResponse")),
      ServiceUnavailable: successResponse("Infrastructure dependency is unavailable.", ref("ErrorResponse")),
      InternalServerError: successResponse("Unexpected server error.", ref("ErrorResponse")),
    },
    schemas: {
      ErrorResponse: objectSchema(
        {
          message: {
            type: "string",
            example: "ValidationError: Quiz title is required.",
          },
        },
        ["message"],
      ),
      MessageResponse: objectSchema(
        {
          message: {
            type: "string",
            example: "Đăng xuất thành công.",
          },
        },
        ["message"],
      ),
      LoginRequest: objectSchema(
        {
          email: { type: "string", format: "email", example: "admin@school.edu.vn" },
          password: { type: "string", format: "password", example: "Admin@123" },
        },
        ["email", "password"],
      ),
      ResetPasswordRequest: objectSchema(
        {
          email: { type: "string", format: "email", example: "admin@school.edu.vn" },
          newPassword: { type: "string", example: "NewPassword@123" },
          confirmPassword: { type: "string", example: "NewPassword@123" },
        },
        ["email", "newPassword", "confirmPassword"],
      ),
      AuthTokenResponse: objectSchema(
        {
          accessToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          userId: { type: "string", example: "USR001" },
          roleName: { type: "string", example: "Admin" },
        },
        ["accessToken", "userId", "roleName"],
      ),
      Section: objectSchema(
        {
          sectionId: { type: "string", example: "SEC001" },
          sectionName: { type: "string", example: "SE-A" },
          sectionCode: { type: "string", example: "SE-A" },
          courseName: { type: "string", example: "Software Engineering" },
          courseCode: { type: "string", example: "SE101" },
          facultyName: { type: "string", example: "Information Technology" },
          facultyCode: { type: "string", example: "IT" },
          term: { type: "string", example: "HK1" },
          academicYear: { type: "string", example: "2024-2025" },
        },
        [
          "sectionId",
          "sectionName",
          "sectionCode",
          "courseName",
          "courseCode",
          "facultyName",
          "facultyCode",
          "term",
          "academicYear",
        ],
      ),
      QuestionType: stringEnum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]),
      QuizStatus: stringEnum(["Draft", "Published", "Hidden", "Expired"]),
      AttemptStatus: stringEnum(["InProgress", "Submitted", "Expired"]),
      RiskLevel: stringEnum(["HIGH", "MEDIUM", "LOW"]),
      HierarchicalLevel: stringEnum(["FACULTY", "COURSE", "SECTION"]),
      AnswerOptionInput: objectSchema(
        {
          content: { type: "string", example: "Asymmetrical Tonal Equilibrium" },
          isCorrect: { type: "boolean", example: true },
        },
        ["content", "isCorrect"],
      ),
      AnswerOptionPatchRequest: objectSchema({
        content: { type: "string", example: "Updated option text" },
        isCorrect: { type: "boolean", example: false },
      }),
      AnswerOptionResponse: objectSchema(
        {
          optionId: { type: "string", example: "OPT001" },
          id: { type: "string", example: "OPT001" },
          content: { type: "string", example: "Asymmetrical Tonal Equilibrium" },
          isCorrect: { type: "boolean", example: true },
        },
        ["optionId", "content", "isCorrect"],
      ),
      QuestionInput: objectSchema(
        {
          content: {
            type: "string",
            example: "Identify the fundamental principle of architectural balance used in this masterclass.",
          },
          questionType: ref("QuestionType"),
          answerOptions: arrayOf(ref("AnswerOptionInput")),
        },
        ["content", "questionType"],
      ),
      QuestionUpdateRequest: objectSchema(
        {
          content: { type: "string", example: "Updated question prompt" },
        },
        ["content"],
      ),
      QuestionResponse: objectSchema(
        {
          questionId: { type: "string", example: "QUE001" },
          id: { type: "string", example: "QUE001" },
          content: {
            type: "string",
            example: "Identify the fundamental principle of architectural balance used in this masterclass.",
          },
          questionType: ref("QuestionType"),
          answerOptions: arrayOf(ref("AnswerOptionResponse")),
          options: arrayOf(ref("AnswerOptionResponse")),
          points: { type: "number", example: 10 },
        },
        ["questionId", "content", "questionType", "answerOptions", "points"],
      ),
      QuizCreateRequest: objectSchema(
        {
          sectionId: { type: "string", example: "SEC001" },
          title: { type: "string", example: "Advanced Curriculum Design" },
          description: {
            type: "string",
            example: "Short assessment for the current teaching unit.",
          },
          timeLimitMinutes: { type: "number", example: 45 },
          deadlineAt: { type: "string", format: "date-time", example: "2026-04-28T23:59:59Z" },
          maxAttempts: { type: "number", example: 3 },
          maxScore: { type: "number", example: 100 },
        },
        [
          "sectionId",
          "title",
          "description",
          "timeLimitMinutes",
          "deadlineAt",
          "maxAttempts",
          "maxScore",
        ],
      ),
      QuizUpdateRequest: objectSchema({
        title: { type: "string", example: "Updated quiz title" },
        description: { type: "string", example: "Updated quiz description" },
        timeLimitMinutes: { type: "number", example: 60 },
        maxAttempts: { type: "number", example: 2 },
        maxScore: { type: "number", example: 80 },
      }),
      UpdateDeadlineRequest: objectSchema(
        {
          deadlineAt: { type: "string", format: "date-time", example: "2026-05-01T23:59:59Z" },
        },
        ["deadlineAt"],
      ),
      HideQuizRequest: objectSchema({
        reason: { type: "string", example: "Scheduled revision before republishing." },
      }),
      QuizSummary: objectSchema(
        {
          quizId: { type: "string", example: "QUIZ001" },
          sectionId: { type: "string", example: "SEC001" },
          title: { type: "string", example: "Advanced Curriculum Design" },
          description: { type: "string", example: "Short assessment for the current teaching unit." },
          timeLimitMinutes: { type: "number", example: 45 },
          deadlineAt: { type: "string", format: "date-time", example: "2026-04-28T23:59:59Z" },
          maxAttempts: { type: "number", example: 3 },
          maxScore: { type: "number", example: 100 },
          status: ref("QuizStatus"),
          totalQuestions: { type: "number", example: 10 },
          createdAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
          updatedAt: { type: "string", format: "date-time", nullable: true, example: "2026-04-21T12:00:00Z" },
        },
        [
          "quizId",
          "sectionId",
          "title",
          "description",
          "timeLimitMinutes",
          "deadlineAt",
          "maxAttempts",
          "maxScore",
          "status",
          "totalQuestions",
          "createdAt",
        ],
      ),
      PublishedQuizSummary: objectSchema(
        {
          quizId: { type: "string", example: "QUIZ001" },
          sectionId: { type: "string", example: "SEC001" },
          title: { type: "string", example: "Advanced Curriculum Design" },
          description: { type: "string", example: "Published student-facing quiz." },
          timeLimitMinutes: { type: "number", example: 45 },
          deadlineAt: { type: "string", format: "date-time", example: "2026-04-28T23:59:59Z" },
          maxAttempts: { type: "number", example: 3 },
          maxScore: { type: "number", example: 100 },
          totalQuestions: { type: "number", example: 10 },
          createdAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
        },
        [
          "quizId",
          "sectionId",
          "title",
          "description",
          "timeLimitMinutes",
          "deadlineAt",
          "maxAttempts",
          "maxScore",
          "totalQuestions",
          "createdAt",
        ],
      ),
      QuizDetail: objectSchema(
        {
          quizId: { type: "string", example: "QUIZ001" },
          teacherId: { type: "string", example: "TEA001" },
          sectionId: { type: "string", example: "SEC001" },
          title: { type: "string", example: "Advanced Curriculum Design" },
          description: { type: "string", example: "Short assessment for the current teaching unit." },
          timeLimitMinutes: { type: "number", example: 45 },
          deadlineAt: { type: "string", format: "date-time", example: "2026-04-28T23:59:59Z" },
          maxAttempts: { type: "number", example: 3 },
          maxScore: { type: "number", example: 100 },
          questionPoints: { type: "number", example: 10 },
          status: ref("QuizStatus"),
          hiddenReason: { type: "string", nullable: true, example: null },
          questions: arrayOf(ref("QuestionResponse")),
          totalQuestions: { type: "number", example: 10 },
          createdAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
          updatedAt: { type: "string", format: "date-time", nullable: true, example: "2026-04-21T12:00:00Z" },
        },
        [
          "quizId",
          "teacherId",
          "sectionId",
          "title",
          "description",
          "timeLimitMinutes",
          "deadlineAt",
          "maxAttempts",
          "maxScore",
          "questionPoints",
          "status",
          "hiddenReason",
          "questions",
          "totalQuestions",
          "createdAt",
        ],
      ),
      QuizAttemptViewEnvelope: objectSchema(
        {
          data: objectSchema(
            {
              quiz: ref("QuizDetail"),
            },
            ["quiz"],
          ),
          quiz: ref("QuizDetail"),
        },
        ["data", "quiz"],
      ),
      AttemptAnswerItemInput: objectSchema(
        {
          questionId: { type: "string", example: "QUE001" },
          selectedOptionIds: {
            type: "array",
            items: { type: "string" },
            example: ["OPT001"],
          },
        },
        ["questionId", "selectedOptionIds"],
      ),
      AttemptSubmitRequest: objectSchema(
        {
          answers: arrayOf(ref("AttemptAnswerItemInput")),
        },
        ["answers"],
      ),
      AttemptOption: objectSchema(
        {
          optionId: { type: "string", example: "OPT001" },
          id: { type: "string", example: "OPT001" },
          content: { type: "string", example: "Asymmetrical Tonal Equilibrium" },
        },
        ["optionId", "content"],
      ),
      AttemptQuestion: objectSchema(
        {
          questionId: { type: "string", example: "QUE001" },
          id: { type: "string", example: "QUE001" },
          content: {
            type: "string",
            example: "Identify the fundamental principle of architectural balance used in this masterclass.",
          },
          questionType: { type: "string", example: "MULTIPLE_CHOICE" },
          options: arrayOf(ref("AttemptOption")),
          answerOptions: arrayOf(ref("AttemptOption")),
          points: { type: "number", example: 10 },
        },
        ["questionId", "content", "questionType", "options", "points"],
      ),
      StartAttemptResponse: objectSchema(
        {
          attemptId: { type: "string", example: "ATT001" },
          quizId: { type: "string", example: "QUIZ001" },
          quizTitle: { type: "string", example: "Advanced Curriculum Design" },
          description: { type: "string", example: "Published student-facing quiz." },
          attemptNumber: { type: "number", example: 1 },
          status: ref("AttemptStatus"),
          startedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
          expiresAt: { type: "string", format: "date-time", example: "2026-04-21T10:45:00Z" },
          timeLimitMinutes: { type: "number", example: 45 },
          questions: arrayOf(ref("AttemptQuestion")),
          totalQuestions: { type: "number", example: 10 },
          maxScore: { type: "number", example: 100 },
        },
        [
          "attemptId",
          "quizId",
          "quizTitle",
          "description",
          "attemptNumber",
          "status",
          "startedAt",
          "expiresAt",
          "timeLimitMinutes",
          "questions",
          "totalQuestions",
          "maxScore",
        ],
      ),
      AnswerResult: objectSchema(
        {
          questionId: { type: "string", example: "QUE001" },
          selectedOptionIds: {
            type: "array",
            items: { type: "string" },
            example: ["OPT001"],
          },
          correctOptionIds: {
            type: "array",
            items: { type: "string" },
            example: ["OPT001"],
          },
          isCorrect: { type: "boolean", example: true },
          earnedPoints: { type: "number", example: 10 },
          questionPoints: { type: "number", example: 10 },
        },
        [
          "questionId",
          "selectedOptionIds",
          "correctOptionIds",
          "isCorrect",
          "earnedPoints",
          "questionPoints",
        ],
      ),
      FinalizeAttemptResponse: objectSchema(
        {
          attemptId: { type: "string", example: "ATT001" },
          quizId: { type: "string", example: "QUIZ001" },
          attemptNumber: { type: "number", example: 1 },
          status: ref("AttemptStatus"),
          startedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
          submittedAt: { type: "string", format: "date-time", example: "2026-04-21T10:41:00Z" },
          durationSeconds: { type: "number", example: 2460 },
          score: { type: "number", example: 80 },
          maxScore: { type: "number", example: 100 },
          percentage: { type: "number", example: 0.8 },
          answers: arrayOf(ref("AnswerResult")),
          totalQuestions: { type: "number", example: 10 },
          correctCount: { type: "number", example: 8 },
        },
        [
          "attemptId",
          "quizId",
          "attemptNumber",
          "status",
          "startedAt",
          "submittedAt",
          "durationSeconds",
          "score",
          "maxScore",
          "percentage",
          "answers",
          "totalQuestions",
          "correctCount",
        ],
      ),
      QuizPerformance: objectSchema(
        {
          quizId: { type: "string", example: "QUIZ001" },
          sectionId: { type: "string", example: "SEC001" },
          quizTitle: { type: "string", example: "Advanced Curriculum Design" },
          sectionName: { type: "string", example: "SE-A" },
          totalAttempts: { type: "number", example: 24 },
          attemptedStudents: { type: "number", example: 12 },
          totalStudents: { type: "number", example: 15 },
          averageScore: { type: "number", example: 78.5 },
          highestScore: { type: "number", example: 96 },
          lowestScore: { type: "number", example: 42 },
          completionRate: { type: "number", example: 0.8 },
          lastUpdatedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
        },
        [
          "quizId",
          "sectionId",
          "quizTitle",
          "sectionName",
          "totalAttempts",
          "attemptedStudents",
          "totalStudents",
          "averageScore",
          "highestScore",
          "lowestScore",
          "completionRate",
          "lastUpdatedAt",
        ],
      ),
      AtRiskStudent: objectSchema(
        {
          studentId: { type: "string", example: "STU001" },
          studentFullname: { type: "string", example: "Nguyen Van A" },
          totalQuizzes: { type: "number", example: 6 },
          attemptedQuizzes: { type: "number", example: 3 },
          quizParticipationRate: { type: "number", example: 0.5 },
          averageScore: { type: "number", example: 62.5 },
          lowestScore: { type: "number", example: 41 },
          participationRiskLevel: ref("RiskLevel"),
          averageScoreRiskLevel: ref("RiskLevel"),
        },
        [
          "studentId",
          "studentFullname",
          "totalQuizzes",
          "attemptedQuizzes",
          "quizParticipationRate",
          "averageScore",
          "lowestScore",
          "participationRiskLevel",
          "averageScoreRiskLevel",
        ],
      ),
      AtRiskSectionReport: objectSchema(
        {
          sectionId: { type: "string", example: "SEC001" },
          sectionName: { type: "string", example: "SE-A" },
          totalStudents: { type: "number", example: 15 },
          rankedStudents: { type: "number", example: 12 },
          students: arrayOf(ref("AtRiskStudent")),
        },
        ["sectionId", "sectionName", "totalStudents", "rankedStudents", "students"],
      ),
      ScoreRangeBucket: objectSchema(
        {
          label: { type: "string", example: "Giỏi" },
          rangeStartPct: { type: "number", example: 0.85 },
          rangeEndPct: { type: "number", example: 1 },
          rangeStart: { type: "number", example: 85 },
          rangeEnd: { type: "number", example: 100 },
          isUpperBoundInclusive: { type: "boolean", example: true },
          studentCount: { type: "number", example: 4 },
          percentage: { type: "number", example: 0.33 },
        },
        [
          "label",
          "rangeStartPct",
          "rangeEndPct",
          "rangeStart",
          "rangeEnd",
          "isUpperBoundInclusive",
          "studentCount",
          "percentage",
        ],
      ),
      ScoreDistribution: objectSchema(
        {
          quizId: { type: "string", example: "QUIZ001" },
          sectionId: { type: "string", example: "SEC001" },
          quizTitle: { type: "string", example: "Advanced Curriculum Design" },
          sectionName: { type: "string", example: "SE-A" },
          maxScore: { type: "number", example: 100 },
          totalRankedStudents: { type: "number", example: 12 },
          lastUpdatedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
          scoreRanges: arrayOf(ref("ScoreRangeBucket")),
        },
        [
          "quizId",
          "sectionId",
          "quizTitle",
          "sectionName",
          "maxScore",
          "totalRankedStudents",
          "lastUpdatedAt",
          "scoreRanges",
        ],
      ),
      QuestionFailureStat: objectSchema(
        {
          questionId: { type: "string", example: "QUE001" },
          questionContent: { type: "string", example: "Question content" },
          totalQuestionAttempts: { type: "number", example: 12 },
          correctAnswers: { type: "number", example: 4 },
          wrongAnswers: { type: "number", example: 6 },
          unansweredCount: { type: "number", example: 2 },
          failureRate: { type: "number", example: 0.5 },
          mostSelectedWrongOptionId: { type: "string", nullable: true, example: "OPT003" },
          mostSelectedWrongOptionContent: { type: "string", nullable: true, example: "Radial Dispersion" },
        },
        [
          "questionId",
          "questionContent",
          "totalQuestionAttempts",
          "correctAnswers",
          "wrongAnswers",
          "unansweredCount",
          "failureRate",
          "mostSelectedWrongOptionId",
          "mostSelectedWrongOptionContent",
        ],
      ),
      QuestionFailureRate: objectSchema(
        {
          quizId: { type: "string", example: "QUIZ001" },
          sectionId: { type: "string", example: "SEC001" },
          quizTitle: { type: "string", example: "Advanced Curriculum Design" },
          sectionName: { type: "string", example: "SE-A" },
          totalSubmittedAttempts: { type: "number", example: 12 },
          hasInsufficientData: { type: "boolean", example: false },
          lastUpdatedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
          questions: arrayOf(ref("QuestionFailureStat")),
        },
        [
          "quizId",
          "sectionId",
          "quizTitle",
          "sectionName",
          "totalSubmittedAttempts",
          "hasInsufficientData",
          "lastUpdatedAt",
          "questions",
        ],
      ),
      StudentQuizResult: objectSchema(
        {
          attemptId: { type: "string", example: "ATT001" },
          quizId: { type: "string", example: "QUIZ001" },
          sectionId: { type: "string", example: "SEC001" },
          quizTitle: { type: "string", example: "Advanced Curriculum Design" },
          score: { type: "number", example: 80 },
          maxScore: { type: "number", example: 100 },
          percentage: { type: "number", example: 0.8 },
          startedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
          submittedAt: { type: "string", format: "date-time", example: "2026-04-21T10:41:00Z" },
          durationSeconds: { type: "number", example: 2460 },
          attemptNumber: { type: "number", example: 1 },
          status: stringEnum(["SUBMITTED", "EXPIRED"]),
        },
        [
          "attemptId",
          "quizId",
          "sectionId",
          "quizTitle",
          "score",
          "maxScore",
          "percentage",
          "startedAt",
          "submittedAt",
          "durationSeconds",
          "attemptNumber",
          "status",
        ],
      ),
      StudentQuizAnswerItem: objectSchema(
        {
          questionId: { type: "string", example: "QUE001" },
          questionContent: { type: "string", example: "Question content" },
          selectedOptionIds: { type: "array", items: { type: "string" }, example: ["OPT001"] },
          selectedOptionContents: { type: "array", items: { type: "string" }, example: ["Asymmetrical Tonal Equilibrium"] },
          correctOptionIds: { type: "array", items: { type: "string" }, example: ["OPT001"] },
          correctOptionContents: { type: "array", items: { type: "string" }, example: ["Asymmetrical Tonal Equilibrium"] },
          isCorrect: { type: "boolean", example: true },
          earnedPoints: { type: "number", example: 10 },
          questionPoints: { type: "number", example: 10 },
        },
        [
          "questionId",
          "questionContent",
          "selectedOptionIds",
          "selectedOptionContents",
          "correctOptionIds",
          "correctOptionContents",
          "isCorrect",
          "earnedPoints",
          "questionPoints",
        ],
      ),
      StudentQuizAnswer: objectSchema(
        {
          attemptId: { type: "string", example: "ATT001" },
          quizId: { type: "string", example: "QUIZ001" },
          sectionId: { type: "string", example: "SEC001" },
          totalScore: { type: "number", example: 80 },
          maxScore: { type: "number", example: 100 },
          percentage: { type: "number", example: 0.8 },
          submittedAt: { type: "string", format: "date-time", example: "2026-04-21T10:41:00Z" },
          attemptNumber: { type: "number", example: 1 },
          status: stringEnum(["SUBMITTED", "EXPIRED"]),
          answers: arrayOf(ref("StudentQuizAnswerItem")),
        },
        [
          "attemptId",
          "quizId",
          "sectionId",
          "totalScore",
          "maxScore",
          "percentage",
          "submittedAt",
          "attemptNumber",
          "status",
          "answers",
        ],
      ),
      StudentClassRanking: objectSchema(
        {
          sectionId: { type: "string", example: "SEC001" },
          sectionName: { type: "string", example: "SE-A" },
          studentFullname: { type: "string", example: "Nguyen Van A" },
          averageScore: { type: "number", example: 84.5 },
          totalAttempts: { type: "number", example: 6 },
          rankInSection: { type: "number", example: 2 },
          totalRankedStudents: { type: "number", example: 12 },
          percentile: { type: "number", example: 0.18 },
          sectionAverageScore: { type: "number", example: 72.3 },
          sectionHighestScore: { type: "number", example: 96 },
          sectionLowestScore: { type: "number", example: 41 },
          lastUpdatedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
        },
        [
          "sectionId",
          "sectionName",
          "studentFullname",
          "averageScore",
          "totalAttempts",
          "rankInSection",
          "totalRankedStudents",
          "percentile",
          "sectionAverageScore",
          "sectionHighestScore",
          "sectionLowestScore",
          "lastUpdatedAt",
        ],
      ),
      HierarchicalReportRow: objectSchema(
        {
          facultyId: { type: "string", example: "FAC001" },
          facultyName: { type: "string", example: "Information Technology" },
          facultyCode: { type: "string", example: "IT" },
          courseId: { type: "string", example: "COURSE001" },
          courseName: { type: "string", example: "Software Engineering" },
          courseCode: { type: "string", example: "SE101" },
          sectionId: { type: "string", example: "SEC001" },
          sectionName: { type: "string", example: "SE-A" },
          sectionCode: { type: "string", example: "SE-A" },
          quizId: { type: "string", example: "QUIZ001" },
          quizTitle: { type: "string", example: "Advanced Curriculum Design" },
          totalAttempts: { type: "number", example: 24 },
          attemptedStudents: { type: "number", example: 12 },
          totalStudents: { type: "number", example: 15 },
          completionRate: { type: "number", example: 0.8 },
          averageScore: { type: "number", example: 78.5 },
          lastUpdatedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
        },
        [
          "facultyId",
          "facultyName",
          "facultyCode",
          "courseId",
          "courseName",
          "courseCode",
          "sectionId",
          "sectionName",
          "sectionCode",
          "quizId",
          "quizTitle",
          "totalAttempts",
          "attemptedStudents",
          "totalStudents",
          "completionRate",
          "averageScore",
          "lastUpdatedAt",
        ],
      ),
      HierarchicalSummary: objectSchema(
        {
          totalQuizzes: { type: "number", example: 10 },
          totalAttempts: { type: "number", example: 150 },
          averageScore: { type: "number", example: 74.5 },
          completionRate: { type: "number", example: 0.78 },
        },
        ["totalQuizzes", "totalAttempts", "averageScore", "completionRate"],
      ),
      SectionReport: objectSchema(
        {
          sectionId: { type: "string", example: "SEC001" },
          sectionName: { type: "string", example: "SE-A" },
          sectionCode: { type: "string", example: "SE-A" },
          summary: ref("HierarchicalSummary"),
          quizzes: arrayOf(ref("HierarchicalReportRow")),
        },
        ["sectionId", "sectionName", "sectionCode", "summary", "quizzes"],
      ),
      CourseReport: objectSchema(
        {
          courseId: { type: "string", example: "COURSE001" },
          courseName: { type: "string", example: "Software Engineering" },
          courseCode: { type: "string", example: "SE101" },
          summary: ref("HierarchicalSummary"),
          sections: arrayOf(ref("SectionReport")),
        },
        ["courseId", "courseName", "courseCode", "summary", "sections"],
      ),
      FacultyReport: objectSchema(
        {
          facultyId: { type: "string", example: "FAC001" },
          facultyName: { type: "string", example: "Information Technology" },
          facultyCode: { type: "string", example: "IT" },
          summary: ref("HierarchicalSummary"),
          courses: arrayOf(ref("CourseReport")),
        },
        ["facultyId", "facultyName", "facultyCode", "summary", "courses"],
      ),
      HierarchicalReportTree: objectSchema(
        {
          generatedAt: { type: "string", format: "date-time", example: "2026-04-21T10:00:00Z" },
          faculties: arrayOf(ref("FacultyReport")),
        },
        ["generatedAt", "faculties"],
      ),
      HierarchicalUnitSummary: objectSchema(
        {
          level: ref("HierarchicalLevel"),
          unitId: { type: "string", example: "FAC001" },
          unitName: { type: "string", example: "Information Technology" },
          totalQuizzes: { type: "number", example: 10 },
          totalAttempts: { type: "number", example: 150 },
          averageScore: { type: "number", example: 74.5 },
          completionRate: { type: "number", example: 0.78 },
        },
        ["level", "unitId", "unitName", "totalQuizzes", "totalAttempts", "averageScore", "completionRate"],
      ),
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["System"],
        summary: "Health check",
        security: [],
        responses: {
          "200": successResponse(
            "Backend is running.",
            objectSchema(
              {
                status: { type: "string", example: "ok" },
                timestamp: {
                  type: "string",
                  format: "date-time",
                  example: "2026-04-21T10:00:00.000Z",
                },
              },
              ["status", "timestamp"],
            ),
          ),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Identity"],
        summary: "Login",
        description:
          "Authenticate with email and password. Use one of the seeded accounts from README if your database has already been seeded.",
        security: [],
        requestBody: requestBody(ref("LoginRequest")),
        responses: {
          "200": successResponse("Authenticated successfully.", ref("AuthTokenResponse")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Identity"],
        summary: "Logout",
        responses: {
          "200": successResponse("Token invalidated successfully.", ref("MessageResponse")),
          "401": responseRef("Unauthorized"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Identity"],
        summary: "Reset password",
        security: [],
        requestBody: requestBody(ref("ResetPasswordRequest")),
        responses: {
          "200": successResponse("Password reset successfully.", ref("MessageResponse")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/academic/sections/teaching": {
      get: {
        tags: ["Academic"],
        summary: "List teacher sections",
        description: "Returns the sections assigned to the authenticated teacher.",
        responses: {
          "200": successResponse("Teaching sections loaded.", arrayOf(ref("Section"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/academic/sections/enrolled": {
      get: {
        tags: ["Academic"],
        summary: "List student sections",
        description: "Returns the sections the authenticated student is enrolled in.",
        responses: {
          "200": successResponse("Enrolled sections loaded.", arrayOf(ref("Section"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes": {
      post: {
        tags: ["Quiz"],
        summary: "Create quiz",
        requestBody: requestBody(ref("QuizCreateRequest")),
        responses: {
          "201": successResponse("Quiz created in draft state.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "503": responseRef("ServiceUnavailable"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}": {
      get: {
        tags: ["Quiz"],
        summary: "Get quiz detail",
        parameters: [pathParam("quizId", "Quiz identifier")],
        responses: {
          "200": successResponse("Quiz detail loaded.", ref("QuizDetail")),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
      patch: {
        tags: ["Quiz"],
        summary: "Update quiz metadata",
        parameters: [pathParam("quizId", "Quiz identifier")],
        requestBody: requestBody(ref("QuizUpdateRequest")),
        responses: {
          "200": successResponse("Quiz updated.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
      delete: {
        tags: ["Quiz"],
        summary: "Delete quiz",
        parameters: [pathParam("quizId", "Quiz identifier")],
        responses: {
          "204": emptyResponse("Quiz deleted."),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/attempt": {
      get: {
        tags: ["Quiz"],
        summary: "Get published quiz for attempt view",
        parameters: [pathParam("quizId", "Quiz identifier")],
        responses: {
          "200": successResponse(
            "Published quiz detail for student attempt view.",
            ref("QuizAttemptViewEnvelope"),
          ),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
      post: {
        tags: ["Quiz Attempt"],
        summary: "Start attempt (legacy alias)",
        description:
          "Backward-compatible alias for `POST /quizzes/{quizId}/attempts`. This exists for older frontend flows.",
        parameters: [pathParam("quizId", "Quiz identifier")],
        responses: {
          "201": successResponse("Attempt started.", ref("StartAttemptResponse")),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "409": responseRef("Conflict"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/deadline": {
      patch: {
        tags: ["Quiz"],
        summary: "Update quiz deadline",
        parameters: [pathParam("quizId", "Quiz identifier")],
        requestBody: requestBody(ref("UpdateDeadlineRequest")),
        responses: {
          "200": successResponse("Deadline updated.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/publish": {
      post: {
        tags: ["Quiz"],
        summary: "Publish quiz",
        parameters: [pathParam("quizId", "Quiz identifier")],
        responses: {
          "200": successResponse("Quiz published.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/hide": {
      post: {
        tags: ["Quiz"],
        summary: "Hide quiz",
        parameters: [pathParam("quizId", "Quiz identifier")],
        requestBody: requestBody(ref("HideQuizRequest"), "Optional hidden reason.", false),
        responses: {
          "200": successResponse("Quiz hidden.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/sections/{sectionId}/quizzes": {
      get: {
        tags: ["Quiz"],
        summary: "List teacher quizzes by section",
        parameters: [pathParam("sectionId", "Section identifier")],
        responses: {
          "200": successResponse("Quiz summaries loaded.", arrayOf(ref("QuizSummary"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/sections/{sectionId}/quizzes/published": {
      get: {
        tags: ["Quiz"],
        summary: "List published quizzes by section",
        parameters: [pathParam("sectionId", "Section identifier")],
        responses: {
          "200": successResponse(
            "Published quiz summaries loaded.",
            arrayOf(ref("PublishedQuizSummary")),
          ),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/questions": {
      post: {
        tags: ["Quiz"],
        summary: "Add question",
        parameters: [pathParam("quizId", "Quiz identifier")],
        requestBody: requestBody(ref("QuestionInput")),
        responses: {
          "201": successResponse("Question added.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/questions/{questionId}": {
      patch: {
        tags: ["Quiz"],
        summary: "Update question content",
        parameters: [
          pathParam("quizId", "Quiz identifier"),
          pathParam("questionId", "Question identifier"),
        ],
        requestBody: requestBody(ref("QuestionUpdateRequest")),
        responses: {
          "200": successResponse("Question updated.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
      delete: {
        tags: ["Quiz"],
        summary: "Delete question",
        parameters: [
          pathParam("quizId", "Quiz identifier"),
          pathParam("questionId", "Question identifier"),
        ],
        responses: {
          "200": successResponse("Question removed.", ref("QuizDetail")),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/questions/{questionId}/options": {
      post: {
        tags: ["Quiz"],
        summary: "Add answer option",
        parameters: [
          pathParam("quizId", "Quiz identifier"),
          pathParam("questionId", "Question identifier"),
        ],
        requestBody: requestBody(ref("AnswerOptionInput")),
        responses: {
          "201": successResponse("Answer option added.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/questions/{questionId}/options/{optionId}": {
      patch: {
        tags: ["Quiz"],
        summary: "Update answer option",
        parameters: [
          pathParam("quizId", "Quiz identifier"),
          pathParam("questionId", "Question identifier"),
          pathParam("optionId", "Answer option identifier"),
        ],
        requestBody: requestBody(ref("AnswerOptionPatchRequest")),
        responses: {
          "200": successResponse("Answer option updated.", ref("QuizDetail")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
      delete: {
        tags: ["Quiz"],
        summary: "Delete answer option",
        parameters: [
          pathParam("quizId", "Quiz identifier"),
          pathParam("questionId", "Question identifier"),
          pathParam("optionId", "Answer option identifier"),
        ],
        responses: {
          "200": successResponse("Answer option removed.", ref("QuizDetail")),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/quizzes/{quizId}/attempts": {
      post: {
        tags: ["Quiz Attempt"],
        summary: "Start attempt",
        parameters: [pathParam("quizId", "Quiz identifier")],
        responses: {
          "201": successResponse("Attempt started.", ref("StartAttemptResponse")),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "409": responseRef("Conflict"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/attempts/{attemptId}/submit": {
      post: {
        tags: ["Quiz Attempt"],
        summary: "Submit attempt",
        parameters: [pathParam("attemptId", "Attempt identifier")],
        requestBody: requestBody(ref("AttemptSubmitRequest")),
        responses: {
          "200": successResponse("Attempt submitted and graded.", ref("FinalizeAttemptResponse")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "409": responseRef("Conflict"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/attempts/{attemptId}/expire": {
      post: {
        tags: ["Quiz Attempt"],
        summary: "Expire attempt",
        description:
          "Auto-submit endpoint used when the frontend detects the time limit has been reached.",
        parameters: [pathParam("attemptId", "Attempt identifier")],
        requestBody: requestBody(ref("AttemptSubmitRequest")),
        responses: {
          "200": successResponse("Attempt expired and graded.", ref("FinalizeAttemptResponse")),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "409": responseRef("Conflict"),
          "422": responseRef("UnprocessableEntity"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/sections/{sectionId}/performance": {
      get: {
        tags: ["Analytics - Teacher"],
        summary: "Section quiz performance",
        parameters: [pathParam("sectionId", "Section identifier")],
        responses: {
          "200": successResponse("Performance rows for the section.", arrayOf(ref("QuizPerformance"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/sections/{sectionId}/quizzes/{quizId}/performance": {
      get: {
        tags: ["Analytics - Teacher"],
        summary: "Quiz performance",
        parameters: [
          pathParam("sectionId", "Section identifier"),
          pathParam("quizId", "Quiz identifier"),
        ],
        responses: {
          "200": successResponse(
            "Performance metrics for one quiz. May be null if no finalized attempts exist yet.",
            {
              nullable: true,
              allOf: [ref("QuizPerformance")],
            },
          ),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/sections/{sectionId}/at-risk": {
      get: {
        tags: ["Analytics - Teacher"],
        summary: "At-risk students",
        parameters: [pathParam("sectionId", "Section identifier")],
        responses: {
          "200": successResponse("At-risk report for the section.", ref("AtRiskSectionReport")),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/sections/{sectionId}/quizzes/{quizId}/score-distribution": {
      get: {
        tags: ["Analytics - Teacher"],
        summary: "Score distribution",
        parameters: [
          pathParam("sectionId", "Section identifier"),
          pathParam("quizId", "Quiz identifier"),
        ],
        responses: {
          "200": successResponse(
            "Histogram for quiz scores. May be null if there are no finalized attempts.",
            {
              nullable: true,
              allOf: [ref("ScoreDistribution")],
            },
          ),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/sections/{sectionId}/quizzes/{quizId}/question-failure-rate": {
      get: {
        tags: ["Analytics - Teacher"],
        summary: "Question failure rate",
        parameters: [
          pathParam("sectionId", "Section identifier"),
          pathParam("quizId", "Quiz identifier"),
        ],
        responses: {
          "200": successResponse(
            "Per-question failure analysis. May be null if there is no data yet.",
            {
              nullable: true,
              allOf: [ref("QuestionFailureRate")],
            },
          ),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "404": responseRef("NotFound"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/sections/{sectionId}/my-results": {
      get: {
        tags: ["Analytics - Student"],
        summary: "My results by section",
        parameters: [pathParam("sectionId", "Section identifier")],
        responses: {
          "200": successResponse("Student results for one section.", arrayOf(ref("StudentQuizResult"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/quizzes/{quizId}/my-results": {
      get: {
        tags: ["Analytics - Student"],
        summary: "My results by quiz",
        parameters: [pathParam("quizId", "Quiz identifier")],
        responses: {
          "200": successResponse("Student results for one quiz.", arrayOf(ref("StudentQuizResult"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/attempts/{attemptId}/answer-review": {
      get: {
        tags: ["Analytics - Student"],
        summary: "Answer review by attempt",
        parameters: [pathParam("attemptId", "Attempt identifier")],
        responses: {
          "200": successResponse(
            "Answer review payload. May be null while projection data is still catching up.",
            {
              nullable: true,
              allOf: [ref("StudentQuizAnswer")],
            },
          ),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/quizzes/{quizId}/my-answer-history": {
      get: {
        tags: ["Analytics - Student"],
        summary: "Answer history by quiz",
        parameters: [pathParam("quizId", "Quiz identifier")],
        responses: {
          "200": successResponse("Answer history across attempts.", arrayOf(ref("StudentQuizAnswer"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/sections/{sectionId}/my-ranking": {
      get: {
        tags: ["Analytics - Student"],
        summary: "My class ranking",
        parameters: [pathParam("sectionId", "Section identifier")],
        responses: {
          "200": successResponse(
            "Ranking info for the authenticated student. May be null if the student has no finalized attempts yet.",
            {
              nullable: true,
              allOf: [ref("StudentClassRanking")],
            },
          ),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/hierarchical-report": {
      get: {
        tags: ["Analytics - Admin"],
        summary: "Full hierarchical report tree",
        responses: {
          "200": successResponse("Nested hierarchy report.", ref("HierarchicalReportTree")),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/hierarchical-report/tree": {
      get: {
        tags: ["Analytics - Admin"],
        summary: "Hierarchical report tree",
        responses: {
          "200": successResponse("Nested hierarchy report.", ref("HierarchicalReportTree")),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/hierarchical-report/summary": {
      get: {
        tags: ["Analytics - Admin"],
        summary: "Hierarchical summary by unit",
        parameters: [
          queryParam("level", "Hierarchy level to summarize.", ref("HierarchicalLevel"), true),
          queryParam("unitId", "Identifier of the target faculty, course, or section.", { type: "string" }, true),
        ],
        responses: {
          "200": successResponse(
            "Summary for one hierarchy node. May be null if there is no data in that scope yet.",
            {
              nullable: true,
              allOf: [ref("HierarchicalUnitSummary")],
            },
          ),
          "400": responseRef("BadRequest"),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/hierarchical-report/faculty/{facultyId}": {
      get: {
        tags: ["Analytics - Admin"],
        summary: "Flat report rows by faculty",
        parameters: [pathParam("facultyId", "Faculty identifier")],
        responses: {
          "200": successResponse("Flat report rows scoped to one faculty.", arrayOf(ref("HierarchicalReportRow"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
    "/analytics/hierarchical-report/course/{courseId}": {
      get: {
        tags: ["Analytics - Admin"],
        summary: "Flat report rows by course",
        parameters: [pathParam("courseId", "Course identifier")],
        responses: {
          "200": successResponse("Flat report rows scoped to one course.", arrayOf(ref("HierarchicalReportRow"))),
          "401": responseRef("Unauthorized"),
          "403": responseRef("Forbidden"),
          "500": responseRef("InternalServerError"),
        },
      },
    },
  },
} as const;

export default openApiDocument;
