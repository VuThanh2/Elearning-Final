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
import { useNotification } from '../../shared';
import PageShell from '../../shared/components/PageShell';
import { analyticsService } from '../services/analyticsService';
import { StudentAnswer, Question } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';

interface AnswerReview {
  question: Question;
  studentAnswer: StudentAnswer;
}

export default function QuizResultsPage() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  // Get sectionId from navigation state
  const sectionId = (location.state as any)?.sectionId || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [answers, setAnswers] = useState<AnswerReview[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId && !quizId) return;

      try {
        setLoading(true);
        console.log('[QuizResultsPage] ENTRY: attemptId=', attemptId, 'quizId=', quizId, 'sectionId=', sectionId);

        let finalAttemptId = attemptId;

        // If no attemptId, fetch the latest attempt for this quiz
        if (!finalAttemptId && quizId) {
          console.log('[QuizResultsPage] No attemptId, fetching latest attempt for quizId=', quizId);
          const results = await analyticsService.getMyQuizResults(quizId);
          if (results.length === 0) {
            setError('No attempts found for this quiz');
            return;
          }
          // Use the latest attempt
          finalAttemptId = results[0].attemptId;
          console.log('[QuizResultsPage] Using latest attempt:', finalAttemptId);
        }

        if (!finalAttemptId) {
          setError('Unable to determine attempt');
          return;
        }

        // Check if submission response was passed via navigation state
        const submissionResponse = (location.state as any)?.submissionResponse;
        if (submissionResponse) {
          console.log('[QuizResultsPage] Using submission response from state');
          // Use the immediate submission response (most accurate)
          setScore(submissionResponse.score || 0);
          setMaxScore(submissionResponse.maxScore || 0);
          setAnswers(submissionResponse.answers || []);
          setLoading(false);
          return;
        }

        const result = await analyticsService.getAnswerReview(finalAttemptId);
        console.log('[QuizResultsPage] Got answer review for attemptId:', finalAttemptId);
        console.log('[QuizResultsPage] Full result:', result);
        console.log('[QuizResultsPage] Result keys:', Object.keys(result || {}));
        console.log('[QuizResultsPage] answerReview:', result?.answerReview);
        console.log('[QuizResultsPage] answers:', result?.answers);
        console.log('[QuizResultsPage] Result:', { score: result?.score, maxScore: result?.maxScore, answerReviewCount: result?.answerReview?.length || 0, answersCount: result?.answers?.length || 0 });

        setScore(result?.score || result?.totalScore || 0);
        setMaxScore(result?.maxScore || 0);
        // Use answerReview if available (new structure), otherwise fallback to answers
        const answers = result?.answerReview || result?.answers || [];
        console.log('[QuizResultsPage] Final answers to set:', answers, 'length:', answers?.length);
        setAnswers(answers);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to load results';
        console.error('[QuizResultsPage] Error loading results:', errMsg);
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const passed = percentage >= 60; // Assume 60% is passing

  return (
    <PageShell title="Quiz Results" subtitle="Review your attempt and answer breakdown">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => {
          if (sectionId) navigate(`/student/sections/${sectionId}/analytics`);
          else navigate(-1);
        }}>
          Back to Analytics
        </Button>
        <Button variant="text" onClick={() => navigate(-2)}>Back to Quizzes</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card sx={{ mb: 4, borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', background: passed ? 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>{passed ? <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} /> : <CancelIcon sx={{ fontSize: 60, color: 'error.main' }} />}</Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{formatters.formatScore(score, maxScore)}</Typography>
              <Typography variant="h6" sx={{ color: passed ? 'success.dark' : 'error.dark', fontWeight: 700 }}>{passed ? 'PASSED' : 'NOT PASSED'}</Typography>
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

      <Typography variant="h5" sx={{ mb: 2, fontWeight: 800 }}>Answer Review</Typography>
      {answers.length === 0 ? (
        <Alert severity="info">No answers to review</Alert>
      ) : (
        <Stack spacing={3}>
          {answers.filter((review) => review.question).map((review, index) => (
            <Card key={review.question.id} sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', borderLeft: `6px solid ${review.studentAnswer.isCorrect ? '#10b981' : '#ef4444'}` }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Question {index + 1}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>{review.question.content}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip icon={review.studentAnswer.isCorrect ? <CheckCircleIcon /> : <CancelIcon />} label={review.studentAnswer.isCorrect ? 'Correct' : 'Incorrect'} color={review.studentAnswer.isCorrect ? 'success' : 'error'} size="small" />
                    <Typography variant="body2" color="text.secondary">{review.studentAnswer.earnedPoints}/{review.question.answerOptions?.length || 0} points</Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {review.question.answerOptions?.map((opt) => {
                      const isSelected = review.studentAnswer.selectedOptionIds.includes(opt.id);
                      const isCorrect = opt.isCorrect;
                      const rowColor = isCorrect ? '#ecfdf5' : isSelected ? '#fef2f2' : '#f8fafc';
                      return (
                        <Box key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 3, bgcolor: rowColor, border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: review.question.questionType === 'SINGLE_CHOICE' ? '50%' : '4px', border: '2px solid', borderColor: isCorrect ? '#10b981' : isSelected ? '#ef4444' : '#cbd5e1', display: 'grid', placeItems: 'center', color: '#fff', bgcolor: isSelected ? (isCorrect ? '#10b981' : '#ef4444') : 'transparent', fontSize: 12, fontWeight: 700 }}>
                            {isSelected ? (isCorrect ? '✓' : '✗') : ''}
                          </Box>
                          <Typography variant="body2" sx={{ flex: 1, fontWeight: isSelected ? 700 : 500, color: isCorrect ? '#047857' : isSelected ? '#b91c1c' : 'text.primary' }}>{opt.content}</Typography>
                          {isCorrect && !review.studentAnswer.isCorrect && <Chip label="Correct answer" size="small" variant="outlined" color="success" />}
                          {isSelected && <Chip label={review.studentAnswer.isCorrect ? 'Your answer' : 'Your answer'} size="small" variant="outlined" color={review.studentAnswer.isCorrect ? 'success' : 'error'} />}
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

      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button variant="contained" onClick={() => navigate(-1)}>Retry Quiz</Button>
      </Box>
    </PageShell>
  );
}
