import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GetPublishedQuizListUseCase } from "../src/modules/quiz/application/use-cases/GetPublishedQuizListUseCase";
import { QuizPerformanceQuery } from "../src/modules/analytic/application/queries/QuizPerformanceQuery";
import { AtRiskStudentQuery } from "../src/modules/analytic/application/queries/AtRiskStudentQuery";
import { ScoreDistributionQuery } from "../src/modules/analytic/application/queries/ScoreDistributionQuery";
import { QuestionFailureRateQuery } from "../src/modules/analytic/application/queries/QuestionFailureRateQuery";
import { QuizAttemptSubmittedProjector } from "../src/modules/analytic/infrastructure/projectors/QuizAttemptSubmittedProjector";

const cache = {
  get: async () => null,
  set: async () => undefined,
};

const assignedAcademicService = {
  isTeacherAssignedToSection: async () => true,
};

const date = new Date("2099-05-04T00:00:00.000Z");

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

test("quiz performance projection averages all finalized attempts", () => {
  const source = readFileSync(
    new URL(
      "../src/modules/analytic/infrastructure/projectors/QuizAttemptSubmittedProjector.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /ROUND\(\(SELECT AVG\(SCORE\) FROM finalized\), 2\) AS AVERAGE_SCORE/,
    "A quiz with attempts 0/100 and 100/100 should report average score near 50, not the best attempt.",
  );
  assert.match(
    source,
    /\(SELECT MAX\(SCORE\) FROM finalized\) AS HIGHEST_SCORE/,
    "Highest score should reflect the best finalized attempt score.",
  );
  assert.match(
    source,
    /\(SELECT MIN\(SCORE\) FROM finalized\) AS LOWEST_SCORE/,
    "Lowest score should reflect the weakest finalized attempt score.",
  );
  assert.doesNotMatch(
    source,
    /ROUND\(\(SELECT AVG\(BEST_SCORE\) FROM student_best\), 2\) AS AVERAGE_SCORE/,
    "Teacher quiz performance must not hide retry failures by averaging bestScore per student.",
  );
});

test("student class ranking benchmark averages attempts within each quiz before section ranking", () => {
  const source = readFileSync(
    new URL(
      "../src/modules/analytic/infrastructure/projectors/QuizAttemptSubmittedProjector.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /quiz_attempt_avgs AS/,
    "Student benchmark should calculate per-quiz attempt averages before computing section averages.",
  );
  assert.match(
    source,
    /GROUP BY STUDENT_ID, QUIZ_ID/,
    "Student benchmark should keep quizzes equally weighted instead of over-weighting quizzes with more retries.",
  );
  assert.match(
    source,
    /ROUND\(AVG\(QUIZ_AVERAGE_SCORE\), 2\)\s+AS AVERAGE_SCORE/,
    "A student's section average should be the average of each quiz's attempt average.",
  );
  assert.doesNotMatch(
    source,
    /AVG\(best\.BEST_SCORE\)/,
    "Student section benchmark must not keep using bestScore-only averages.",
  );
});

test("student class ranking percentile counts students below the same section-average score", () => {
  const source = readFileSync(
    new URL(
      "../src/modules/analytic/infrastructure/projectors/QuizAttemptSubmittedProjector.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /lower_scores\.AVERAGE_SCORE < ss\.AVERAGE_SCORE/,
    "Percentile should mean students below this student's section average, so #1 of 2 shows better than 50%, not 100%.",
  );
  assert.doesNotMatch(
    source,
    /PERCENT_RANK\(\) OVER \(ORDER BY AVERAGE_SCORE\)/,
    "Percentile must not use ascending PERCENT_RANK because it makes #1 of 2 look better than 100% of ranked students.",
  );
});

test("student class ranking cache invalidates every student ranking in the section", async () => {
  const invalidatedKeys: string[] = [];
  const invalidatedPatterns: string[] = [];
  const cacheSpy = {
    get: async () => null,
    set: async () => undefined,
    invalidate: async (keys: string[]) => {
      invalidatedKeys.push(...keys);
    },
    invalidatePattern: async (pattern: string) => {
      invalidatedPatterns.push(pattern);
    },
  };
  const projector = new QuizAttemptSubmittedProjector(
    {} as any,
    {} as any,
    {} as any,
    cacheSpy as any,
  );

  await (projector as any).invalidateCacheAfterWrite({
    quizId: "quiz-1",
    sectionId: "section-1",
    studentId: "student-2",
  });

  assert.ok(
    invalidatedKeys.includes("analytics:rank_stu:student-2:section-1"),
    "The submitting student's exact ranking cache key should still be invalidated.",
  );
  assert.ok(
    invalidatedPatterns.includes("analytics:rank_stu:*:section-1"),
    "Any finalized attempt can change every student's rank, totalRankedStudents, highest, and lowest benchmark values.",
  );
});

test("score distribution query prefers Oracle projection over legacy Mongo fallback", async () => {
  const oracleRepo = {
    findScoreDistribution: async () => ({
      quizId: "quiz-1",
      sectionId: "section-1",
      quizTitle: "Oracle histogram",
      sectionName: "Section A",
      maxScore: 100,
      totalRankedStudents: 2,
      lastUpdatedAt: date,
      scoreRanges: [
        {
          label: "Oracle 0-50",
          rangeStartPct: 0,
          rangeEndPct: 0.5,
          rangeStart: 0,
          rangeEnd: 50,
          isUpperBoundInclusive: false,
          studentCount: 1,
          percentage: 0.5,
        },
      ],
    }),
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

  const query = new ScoreDistributionQuery(
    oracleRepo as any,
    assignedAcademicService as any,
    badMongoFallback,
    cache as any,
  );

  const report = await query.execute("teacher-1", "TEACHER", "quiz-1", "section-1");

  assert.equal(report?.quizTitle, "Oracle histogram");
  assert.equal(report?.scoreRanges[0]?.label, "Oracle 0-50");
});

test("question failure rate query returns the most missed question first", async () => {
  const mongoRepo = {
    findQuestionFailureRate: async () => ({
      quizId: "quiz-1",
      sectionId: "section-1",
      quizTitle: "Misconception quiz",
      sectionName: "Section A",
      totalSubmittedAttempts: 6,
      lastUpdatedAt: date,
      questions: [
        {
          questionId: "easy-question",
          questionContent: "Easy question",
          questionType: "single_choice",
          totalQuestionAttempts: 6,
          correctAnswers: 5,
          wrongAnswers: 1,
          unansweredCount: 0,
          failureRate: 0.1667,
          wrongOptionCounts: {},
          mostSelectedWrongOptionId: null,
          mostSelectedWrongOptionContent: null,
        },
        {
          questionId: "hard-question",
          questionContent: "Hard question",
          questionType: "single_choice",
          totalQuestionAttempts: 6,
          correctAnswers: 1,
          wrongAnswers: 5,
          unansweredCount: 0,
          failureRate: 0.8333,
          wrongOptionCounts: { option_b: 5 },
          mostSelectedWrongOptionId: "option_b",
          mostSelectedWrongOptionContent: "Common distractor",
        },
      ],
      processedAttemptIds: [],
    }),
  };
  const query = new QuestionFailureRateQuery(
    mongoRepo as any,
    assignedAcademicService as any,
    cache as any,
  );

  const report = await query.execute("teacher-1", "quiz-1", "section-1");

  assert.equal(report?.questions[0]?.questionId, "hard-question");
  assert.equal(report?.questions[0]?.mostSelectedWrongOptionContent, "Common distractor");
  assert.equal(report?.questions[0]?.wrongAnswers, 5);
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
