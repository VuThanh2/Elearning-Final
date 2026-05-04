import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageShell from '../../shared/components/PageShell';
import { analyticsService } from '../services/analyticsService';
import { quizService } from '../services/quizService';
import { StudentAnswer, Question } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';

interface AnswerReview {
  question: Question;
  studentAnswer: StudentAnswer;
}

const hasReviewQuestion = (review: unknown): review is AnswerReview =>
  Boolean(
    review &&
      typeof review === 'object' &&
      'question' in review &&
      (review as AnswerReview).question &&
      'studentAnswer' in review &&
      (review as AnswerReview).studentAnswer
  );

export default function QuizResultsPage() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Get sectionId from navigation state
  const sectionId = (location.state as any)?.sectionId || null;
  const analyticsNavigationState = {
    sectionId,
    sectionName: (location.state as any)?.sectionName,
    courseName: (location.state as any)?.courseName,
    facultyName: (location.state as any)?.facultyName,
    term: (location.state as any)?.term,
    academicYear: (location.state as any)?.academicYear,
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [answers, setAnswers] = useState<AnswerReview[]>([]);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId && !quizId) return;

      try {
        setLoading(true);
        setError(null);

        let finalAttemptId = attemptId;

        if (!finalAttemptId && quizId) {
          const results = await analyticsService.getMyQuizResults(quizId);
          if (results.length === 0) {
            setError('No attempts found for this quiz');
            return;
          }
          finalAttemptId = results[0].attemptId;
        }

        if (!finalAttemptId) {
          setError('Unable to determine attempt');
          return;
        }

        const submissionResponse = (location.state as any)?.submissionResponse;
        const result = await analyticsService.getAnswerReview(finalAttemptId);
        const reviewAnswers = Array.isArray(result?.answerReview)
          ? result.answerReview.filter(hasReviewQuestion)
          : [];

        setScore(result?.score ?? result?.totalScore ?? submissionResponse?.score ?? 0);
        setMaxScore(result?.maxScore ?? submissionResponse?.maxScore ?? 0);
        setAnswers(reviewAnswers);

        if (sectionId && quizId) {
          const quizzes = await quizService.getPublishedQuizzes(sectionId);
          const currentQuiz = quizzes.find((quiz) => quiz.quizId === quizId);
          setCanRetry(Boolean(currentQuiz?.canStart && (currentQuiz.attemptsRemaining ?? 0) > 0));
        } else {
          setCanRetry(false);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to load results';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, quizId, location.state]);

  if (loading) {
    return (
      <PageShell title="Quiz Results" subtitle="Review your attempt and answers">
        <Card sx={{ borderRadius: 5, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const passed = percentage >= 60; // Assume 60% is passing

  return (
    <PageShell title="Quiz Results" subtitle="Review your attempt and answer breakdown">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => {
          if (sectionId) navigate(`/student/sections/${sectionId}/analytics`, { state: analyticsNavigationState });
          else navigate('/student/dashboard?view=analytics', { replace: true });
        }} sx={{ minHeight: 42 }}>
          Back to Analytics
        </Button>
        <Button
          variant="text"
          onClick={() => {
            if (sectionId) navigate(`/student/sections/${sectionId}`, { replace: true });
            else navigate('/student/dashboard?view=quizzes', { replace: true });
          }}
          sx={{ minHeight: 42 }}
        >
          Back to Quizzes
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card sx={{ mb: 4, borderRadius: 5, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', background: passed ? 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)' }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center' }}>{passed ? <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main' }} /> : <CancelIcon sx={{ fontSize: 64, color: 'error.main' }} />}</Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{formatters.formatScore(score, maxScore)}</Typography>
              <Typography variant="h6" sx={{ color: passed ? 'success.dark' : 'error.dark', fontWeight: 800 }}>{passed ? 'PASSED' : 'NOT PASSED'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <LinearProgress variant="determinate" value={percentage} sx={{ height: 10, borderRadius: 999 }} color={passed ? 'success' : 'error'} />
                </Box>
                <Chip label={formatters.formatPercentage(percentage / 100, 1)} color={passed ? 'success' : 'error'} variant="outlined" />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h5" sx={{ mb: 2, fontWeight: 900 }}>Answer Review</Typography>
      {answers.length === 0 ? (
        <Alert severity="info">No answers to review</Alert>
      ) : (
        <Stack spacing={3}>
          {answers.filter((review) => review.question).map((review, index) => (
            <Card key={review.question.id} sx={{ borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', borderLeft: `6px solid ${review.studentAnswer.isCorrect ? '#10b981' : '#ef4444'}` }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Question {index + 1}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>{review.question.content}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip icon={review.studentAnswer.isCorrect ? <CheckCircleIcon /> : <CancelIcon />} label={review.studentAnswer.isCorrect ? 'Correct' : 'Incorrect'} color={review.studentAnswer.isCorrect ? 'success' : 'error'} size="small" />
                    <Typography variant="body2" color="text.secondary">
                      {review.studentAnswer.earnedPoints}/{review.question.points ?? review.studentAnswer.earnedPoints} points
                    </Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {review.question.answerOptions?.map((opt) => {
                      const isSelected = review.studentAnswer.selectedOptionIds.includes(opt.id);
                      const isCorrect = opt.isCorrect;
                      const rowColor = isCorrect ? '#ecfdf5' : isSelected ? '#fef2f2' : '#f8fafc';
                      return (
                        <Box key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 3, bgcolor: rowColor, border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                          <Box sx={{ width: 22, height: 22, borderRadius: review.question.questionType === 'SINGLE_CHOICE' ? '50%' : '6px', border: '2px solid', borderColor: isCorrect ? '#10b981' : isSelected ? '#ef4444' : '#cbd5e1', display: 'grid', placeItems: 'center', color: '#fff', bgcolor: isSelected ? (isCorrect ? '#10b981' : '#ef4444') : 'transparent', fontSize: 12, fontWeight: 700 }}>
                            {isSelected ? (isCorrect ? '✓' : '✗') : ''}
                          </Box>
                          <Typography variant="body2" sx={{ flex: 1, fontWeight: isSelected ? 700 : 500, color: isCorrect ? '#047857' : isSelected ? '#b91c1c' : 'text.primary' }}>{opt.content}</Typography>
                          {isCorrect && !review.studentAnswer.isCorrect && <Chip label="Correct answer" size="small" variant="outlined" color="success" />}
                          {isSelected && <Chip label="Your answer" size="small" variant="outlined" color={review.studentAnswer.isCorrect ? 'success' : 'error'} />}
                        </Box>
                      );
                    })}
                  </Stack>
                  <Alert severity={review.studentAnswer.isCorrect ? 'success' : 'error'}>{review.studentAnswer.isCorrect ? 'Great job! You selected the correct answer(s).' : 'This answer is incorrect. Review the correct answer(s) above and try again on your next attempt.'}</Alert>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 4, flexWrap: 'wrap' }}>
        {canRetry && (
          <Button
            variant="contained"
            onClick={() => {
              navigate(`/student/quiz/${quizId}/attempt`, {
                replace: true,
                state: analyticsNavigationState,
              });
            }}
            sx={{ minHeight: 42 }}
          >
            Retry Quiz
          </Button>
        )}
      </Box>
    </PageShell>
  );
}
