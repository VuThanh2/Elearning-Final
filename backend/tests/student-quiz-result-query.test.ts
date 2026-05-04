import assert from "node:assert/strict";
import test from "node:test";

import { StudentQuizResultQuery } from "../src/modules/analytic/application/queries/StudentQuizResultQuery";

function createQueryWithMongoDocs(docs: any[]) {
  const oracleRepo = {
    findStudentResultsBySection: async () => [],
    findStudentResultsByQuiz: async () => [],
  };
  const mongoModel = {
    find: () => ({
      sort: () => ({
        lean: async () => docs,
      }),
    }),
  };
  const cache = {
    get: async () => null,
    set: async () => undefined,
  };

  return new StudentQuizResultQuery(oracleRepo as any, mongoModel, cache as any);
}

test("student quiz result query preserves EXPIRED status from Mongo analytics documents", async () => {
  const query = createQueryWithMongoDocs([
    {
      _id: "attempt-1",
      quizId: "quiz-1",
      sectionId: "section-1",
      quizTitle: "Timed quiz",
      score: 10,
      maxScore: 10,
      percentage: 1,
      startedAt: new Date("2026-05-03T10:00:00.000Z"),
      submittedAt: new Date("2026-05-03T10:01:05.000Z"),
      durationSeconds: 65,
      attemptNumber: 1,
      status: "EXPIRED",
    },
  ]);

  const results = await query.byQuiz("student-1", "quiz-1");

  assert.equal(results.length, 1);
  assert.equal(results[0]?.status, "EXPIRED");
});
