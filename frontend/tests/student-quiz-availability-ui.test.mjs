import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

function readSource(relativeUrl) {
  return readFileSync(fileURLToPath(new URL(relativeUrl, import.meta.url)), 'utf8');
}

test('section detail UI uses remaining attempts for ready count and start action', () => {
  const source = readSource('../src/modules/student/pages/SectionDetailsPage.tsx');

  assert.match(
    source,
    /attemptsRemaining/,
    'SectionDetailsPage should compute Ready to Start from attemptsRemaining instead of total published quizzes',
  );
  assert.match(
    source,
    /canStart/,
    'SectionDetailsPage should hide or disable Start Quiz when the backend says the student cannot start',
  );
  assert.doesNotMatch(
    source,
    /Ready to Start[\s\S]{0,500}\{quizzes\.length\}/,
    'Ready to Start must not be a direct copy of quizzes.length',
  );
});

test('quiz results page does not navigate through browser history back to the attempt', () => {
  const source = readSource('../src/modules/student/pages/QuizResultsPage.tsx');

  assert.doesNotMatch(
    source,
    /navigate\(-2\)/,
    'Back to quizzes must use an explicit route, not navigate(-2), because the history stack can contain the attempt page',
  );
  assert.match(
    source,
    /canRetry/,
    'Retry Quiz should be conditional on remaining attempts instead of always sending the student back into the attempt page',
  );
});

test('admin hierarchical report maps section cards from section summary metrics', () => {
  const source = readSource('../src/modules/admin/services/analyticsService.ts');

  assert.match(
    source,
    /const sMetrics = section\.summary \|\| \{\}/,
    'Section report nodes should read average/completion from section.summary, not the parent course summary',
  );
  assert.doesNotMatch(
    source,
    /level: 'SECTION' as const,[\s\S]{0,220}averageScore: cMetrics\.averageScore/,
    'Section averageScore must not reuse course-level metrics',
  );
});

test('teacher at-risk cards label participation and score instead of showing an ambiguous slash pair', () => {
  const source = readSource('../src/modules/teacher/pages/TeacherAnalyticsPage.tsx');

  assert.match(
    source,
    /Participation/,
    'At-risk cards should label participation percentage so 100% is not mistaken for score risk',
  );
  assert.match(
    source,
    /Avg score/,
    'At-risk cards should label the raw average score separately',
  );
  assert.doesNotMatch(
    source,
    /formatPercentage\(student\.participationRate[\s\S]{0,120}\/[\s\S]{0,120}formatNumber\(student\.averageScore/,
    'At-risk cards should not render participation and score as an unlabeled "100% / 20" pair',
  );
});

test('teacher dashboard does not render the suggested next step card', () => {
  const source = readSource('../src/modules/teacher/pages/TeacherDashboard.tsx');

  assert.doesNotMatch(
    source,
    /Suggested next step/,
    'Teacher dashboard should not show the suggested next step card from the spec screenshot',
  );
  assert.doesNotMatch(
    source,
    /Open quiz management/,
    'Removing the card should also remove its shortcut button copy',
  );
});

test('teacher analytics reads score distribution and question failure report DTOs from backend', () => {
  const source = readSource('../src/modules/teacher/pages/TeacherAnalyticsPage.tsx');

  assert.match(
    source,
    /scoreRanges/,
    'Score distribution endpoint returns scoreRanges, not the legacy buckets field',
  );
  assert.doesNotMatch(
    source,
    /scoreData\.buckets/,
    'Teacher analytics must not drop ScoreDistributionView by reading scoreData.buckets',
  );
  assert.match(
    source,
    /questionData\.questions/,
    'Question failure endpoint returns an object with a questions array',
  );
  assert.match(
    source,
    /selectedQuizId/,
    'Teacher analytics should let the teacher choose which quiz drives ScoreDistributionView and QuestionFailureRateView.',
  );
  assert.match(
    source,
    /getScoreDistribution\(sectionId, selectedQuizId\)/,
    'Score distribution should use the selected quiz, not only the first quiz in the performance table.',
  );
  assert.match(
    source,
    /getQuestionFailureRate\(sectionId, selectedQuizId\)/,
    'Question failure report should use the selected quiz, not only the first quiz in the performance table.',
  );
  assert.match(
    source,
    /Most missed/,
    'Teacher analytics should identify the question with the highest failure rate.',
  );
  assert.match(
    source,
    /Wrong \/ Attempts/,
    'Teacher analytics should show wrong answers against total attempts for each question.',
  );
  assert.match(
    source,
    /mostSelectedWrongOptionContent/,
    'Teacher analytics should expose the distractor students selected most often.',
  );
});

test('teacher quiz performance table exposes the extra performance attributes', () => {
  const source = readSource('../src/modules/teacher/pages/TeacherAnalyticsPage.tsx');

  assert.match(source, /attemptedStudents/, 'QuizPerformance should show attempted students.');
  assert.match(source, /totalStudents/, 'QuizPerformance should show total students.');
  assert.match(source, /highestScore/, 'QuizPerformance should show highest score.');
  assert.match(source, /lowestScore/, 'QuizPerformance should show lowest score.');
});

test('admin report average score is displayed as a score number, not a percentage', () => {
  const source = readSource('../src/modules/admin/pages/AdminDashboard.tsx');

  assert.doesNotMatch(
    source,
    /Average Score[\s\S]{0,260}\.toFixed\(1\)\}%/,
    'Admin report summary average score should not append a percent sign.',
  );
  assert.doesNotMatch(
    source,
    /Avg Score[\s\S]{0,260}\.toFixed\(1\)\}%/,
    'Admin report tree average score should not append a percent sign.',
  );
});

test('student analytics average result is displayed as a score number instead of a percent', () => {
  const source = readSource('../src/modules/student/pages/StudentAnalyticsPage.tsx');

  assert.match(
    source,
    /formatResultScore\(averageRatio \* 100\)/,
    'Average result card should show a plain 0-100 score number, not a percentage.',
  );
  assert.match(
    source,
    /Best result \$\{formatResultScore\(bestRatio \* 100\)\}/,
    'Average result detail should also show the best result as a plain score number.',
  );
  assert.doesNotMatch(
    source,
    /'Average result'[\s\S]{0,140}formatRatio\(averageRatio/,
    'Average result card must not append a percent sign.',
  );
});

test('shared score formatter rounds score UI values to one decimal without long floats', () => {
  const source = readSource('../src/modules/shared/utils/formatters.ts');

  assert.doesNotMatch(
    source,
    /return `\$\{score\}\/\$\{maxScore\}`/,
    'Score UI should not render raw floating-point values such as 66.6666666667/100.',
  );
  assert.match(
    source,
    /formatScoreValue\(score\)[\s\S]{0,80}formatScoreValue\(maxScore\)/,
    'Both score and maxScore should pass through the same one-decimal UI formatter.',
  );
  assert.match(
    source,
    /toFixed\(1\)/,
    'Score UI should round fractional values to one decimal place.',
  );
});

test('student section benchmark explains that rank and average use the same section score basis', () => {
  const source = readSource('../src/modules/student/pages/StudentAnalyticsPage.tsx');

  assert.match(
    source,
    /Rank basis: section average/,
    'Student benchmark should make clear that section rank is based on the section average shown below.',
  );
  assert.match(
    source,
    /Better than \{percentileProgress\}% of ranked students by section average/,
    'The percentile label should explicitly use the same section-average basis as the ranking.',
  );
});

test('teacher analytics score formatting strips unnecessary .0 in score/maxScore values', () => {
  const source = readSource('../src/modules/teacher/pages/TeacherAnalyticsPage.tsx');

  assert.match(
    source,
    /formatCompactNumber/,
    'Teacher analytics should use compact score formatting so 100/100 does not become 100.0/100.0.',
  );
  assert.doesNotMatch(
    source,
    /const formatScoreValue[\s\S]{0,140}formatters\.formatNumber\(safeNumber\(value\), 1\)/,
    'Teacher analytics score formatting should not force one decimal place for every score.',
  );
});

test('teacher score distribution chart uses score ranges and whole-student y-axis ticks', () => {
  const source = readSource('../src/modules/teacher/pages/TeacherAnalyticsPage.tsx');

  assert.match(
    source,
    /scoreRangeLabel/,
    'Score Distribution x-axis should show numeric score ranges instead of Vietnamese bucket names.',
  );
  assert.match(
    source,
    /<XAxis dataKey="scoreRangeLabel"/,
    'Score Distribution x-axis should bind to the numeric score-range label.',
  );
  assert.match(
    source,
    /allowDecimals=\{false\}/,
    'Score Distribution y-axis should display whole student counts only.',
  );
  assert.match(
    source,
    /Students by score range/,
    'Score Distribution chart should label the metric clearly.',
  );
  assert.match(
    source,
    /<Bar dataKey="studentCount"[\s\S]{0,120}isAnimationActive=\{false\}/,
    'Score Distribution bars should render immediately and reliably in browser validation screenshots.',
  );
});

test('teacher question difficulty chart labels failure-rate units and avoids horizontal table scroll', () => {
  const source = readSource('../src/modules/teacher/pages/TeacherAnalyticsPage.tsx');

  assert.match(
    source,
    /Failure rate by question \(%\)/,
    'Question Difficulty should label failure-rate units clearly.',
  );
  assert.match(
    source,
    /tickFormatter=\{\(value\) => formatters\.formatPercentage\(Number\(value\), 0\)\}/,
    'Question Difficulty y-axis should render percentages, not raw decimals like 0.5.',
  );
  assert.match(
    source,
    /tableLayout: 'fixed'/,
    'Question Difficulty table should fit its card instead of requiring horizontal scrolling.',
  );
  assert.doesNotMatch(
    source,
    /minWidth: 720/,
    'Question Difficulty table should not force a horizontal scrollbar.',
  );
  assert.match(
    source,
    /<Bar dataKey="failureRate"[\s\S]{0,120}isAnimationActive=\{false\}/,
    'Question Difficulty bars should render immediately and reliably in browser validation screenshots.',
  );
});

test('teacher quiz performance table does not hide score columns behind a horizontal scroll', () => {
  const source = readSource('../src/modules/teacher/pages/TeacherAnalyticsPage.tsx');

  assert.doesNotMatch(
    source,
    /minWidth: 860/,
    'Teacher Quiz Performance should fit the available card width instead of hiding Highest/Lowest behind a horizontal scrollbar.',
  );
  assert.match(
    source,
    /tableLayout: 'fixed'/,
    'Teacher Quiz Performance should use a fixed table layout so all score columns stay visible.',
  );
});
