import assert from "node:assert/strict";
import test from "node:test";
import { QuizAttempt } from "../src/modules/quiz-attempt/domain/entities/QuizAttempt";
import { AttemptNumber } from "../src/modules/quiz-attempt/domain/value-objects/AttemptNumber";
import { AttemptStatus } from "../src/modules/quiz-attempt/domain/value-objects/AttemptStatus";
const startedAt = new Date("2026-05-03T10:00:00.000Z");
const expiredAt = new Date("2026-05-03T10:01:05.000Z");
const quizGradingData = {
    questions: [
        { questionId: "q1", correctOptionIds: ["q1-correct"] },
        { questionId: "q2", correctOptionIds: ["q2-correct"] },
        { questionId: "q3", correctOptionIds: ["q3-correct"] },
    ],
    pointsPerQuestion: 10,
};
function createAttempt() {
    return QuizAttempt.create({
        quizId: "quiz-1",
        studentId: "student-1",
        sectionId: "section-1",
        attemptNumber: AttemptNumber.create(1),
        maxScore: 30,
        now: startedAt,
    });
}
function answersByQuestion(attempt) {
    return new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
}
test("expired attempt gives zero points to questions the student did not answer", () => {
    const attempt = createAttempt();
    attempt.expire({
        submittedAnswers: new Map([
            ["q1", ["q1-correct"]],
            ["q2", ["q2-wrong"]],
        ]),
        quizGradingData,
        now: expiredAt,
    });
    const answers = answersByQuestion(attempt);
    assert.equal(attempt.status, AttemptStatus.EXPIRED);
    assert.equal(attempt.answers.length, 3);
    assert.equal(attempt.score.value, 10);
    assert.equal(answers.get("q1")?.earnedPoints, 10);
    assert.equal(answers.get("q1")?.isCorrect, true);
    assert.equal(answers.get("q2")?.earnedPoints, 0);
    assert.equal(answers.get("q2")?.isCorrect, false);
    assert.deepEqual(answers.get("q3")?.selectedOptions.optionIds, []);
    assert.equal(answers.get("q3")?.earnedPoints, 0);
    assert.equal(answers.get("q3")?.isCorrect, false);
});
test("expired attempt with no selected answers records every question as unanswered", () => {
    const attempt = createAttempt();
    attempt.expire({
        submittedAnswers: new Map(),
        quizGradingData,
        now: expiredAt,
    });
    assert.equal(attempt.status, AttemptStatus.EXPIRED);
    assert.equal(attempt.answers.length, 3);
    assert.equal(attempt.score.value, 0);
    for (const answer of attempt.answers) {
        assert.deepEqual(answer.selectedOptions.optionIds, []);
        assert.equal(answer.earnedPoints, 0);
        assert.equal(answer.isCorrect, false);
    }
});
//# sourceMappingURL=quiz-attempt-domain.test.js.map