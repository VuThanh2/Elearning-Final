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
