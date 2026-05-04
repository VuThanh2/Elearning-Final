import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GetPublishedQuizListUseCase } from "../src/modules/quiz/application/use-cases/GetPublishedQuizListUseCase";
import { QuizPerformanceQuery } from "../src/modules/analytic/application/queries/QuizPerformanceQuery";
import { AtRiskStudentQuery } from "../src/modules/analytic/application/queries/AtRiskStudentQuery";

const cache = {
  get: async () => null,
  set: async () => undefined,
};

const assignedAcademicService = {
  isTeacherAssignedToSection: async () => true,
};

const date = new Date("2026-05-04T00:00:00.000Z");

function publishedQuiz(maxAttempts = 3) {
  return {
    quizId: "quiz-1",
    sectionId: "section-1",
    title: "Attempt limit quiz",
    description: "Checks attempt availability",
    timeLimit: { minutes: 30 },
    deadline: { value: date },
    maxAttempts: { value: maxAttempts },
    maxScore: { value: 100 },
    questions: [{ questionId: "q1" }, { questionId: "q2" }],
    createdAt: date,
  };
}

test("published quiz list includes per-student attempt availability", async () => {
  const quizRepository = {
    findPublishedBySection: async () => [publishedQuiz(3)],
  };
  const attemptRepository = {
    countByStudentAndQuiz: async (studentId: string, quizId: string) => {
      assert.equal(studentId, "student-1");
      assert.equal(quizId, "quiz-1");
      return 2;
    },
  };

  const useCase: any = new GetPublishedQuizListUseCase(
    quizRepository as any,
    attemptRepository as any,
  );

  const [quiz] = await useCase.execute("student-1", "section-1");

  assert.equal(quiz.attemptsUsed, 2);
  assert.equal(quiz.attemptsRemaining, 1);
  assert.equal(quiz.canStart, true);
});

test("teacher quiz performance prefers Oracle projection and keeps maxScore", async () => {
  const oracleRepo = {
    findQuizPerformanceBySection: async () => [
      {
        quizId: "quiz-1",
        sectionId: "section-1",
        quizTitle: "Oracle truth",
        sectionName: "Section A",
        totalAttempts: 1,
        attemptedStudents: 1,
        totalStudents: 2,
        maxScore: 100,
        averageScore: 80,
        highestScore: 80,
        lowestScore: 80,
        completionRate: 0.5,
        lastUpdatedAt: date,
      },
    ],
  };
  const badMongoFallback = {
    find: () => ({
      lean: () => ({
        exec: async () => [
          {
            quizId: "quiz-1",
            quizTitle: "Mongo fallback should not win",
            sectionId: "section-1",
            studentId: "student-1",
            score: 100,
            maxScore: 100,
          },
        ],
      }),
    }),
  };

  const query = new QuizPerformanceQuery(
    oracleRepo as any,
    assignedAcademicService as any,
    badMongoFallback,
    cache as any,
  );

  const [performance] = await query.bySection("teacher-1", "section-1");

  assert.equal(performance?.quizTitle, "Oracle truth");
  assert.equal(performance?.completionRate, 0.5);
  assert.equal(performance?.totalStudents, 2);
  assert.equal((performance as any)?.maxScore, 100);
});

test("at-risk query preserves Oracle student names and both risk dimensions", async () => {
  const oracleRepo = {
    findAtRiskStudentsBySection: async () => [
      {
        sectionId: "section-1",
        sectionName: "Section A",
        studentId: "student-1",
        studentFullname: "Low Score Student",
        totalQuizzes: 2,
        attemptedQuizzes: 1,
        quizParticipationRate: 0.5,
        averageScore: 42,
        lowestScore: 42,
        participationRiskLevel: "MEDIUM",
        averageScoreRiskLevel: "HIGH",
        lastUpdatedAt: date,
      },
    ],
  };
  const badMongoFallback = {
    find: () => ({
      lean: () => ({
        exec: async () => [
          {
            sectionId: "section-1",
            studentId: "student-1",
            score: 100,
          },
        ],
      }),
    }),
  };

  const query = new AtRiskStudentQuery(
    oracleRepo as any,
    assignedAcademicService as any,
    badMongoFallback,
    cache as any,
  );

  const report = await query.bySection("teacher-1", "section-1");
  const [student] = report.students;

  assert.equal(student?.studentFullname, "Low Score Student");
  assert.equal(student?.quizParticipationRate, 0.5);
  assert.equal(student?.participationRiskLevel, "MEDIUM");
  assert.equal(student?.averageScoreRiskLevel, "HIGH");
});

test("at-risk score risk compares percentage of max score instead of raw points", () => {
  const source = readFileSync(
    new URL(
      "../src/modules/analytic/infrastructure/projectors/QuizAttemptSubmittedProjector.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /AVERAGE_SCORE_RATE/,
    "At-risk projection should calculate a normalized score rate for risk thresholds.",
  );
  assert.doesNotMatch(
    source,
    /NVL\(best_stats\.AVERAGE_SCORE,\s*0\)\s*<\s*50/,
    "At-risk projection must not compare raw points to 50 because quizzes can have maxScore 20, 10, etc.",
  );
});
