import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth, Navbar, useNotification } from '../../shared';
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
  const { state } = useAuth();
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
        console.log('[QuizResultsPage] Result:', { score: result.score, maxScore: result.maxScore, answersCount: result.answers?.length || 0 });

        setScore(result.score || 0);
        setMaxScore(result.maxScore || 0);
        setAnswers(result.answers || []);
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
      <>
        <Navbar />
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const passed = percentage >= 60; // Assume 60% is passing

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          {/* Back Button */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => {
              console.log('[QuizResultsPage] Back button clicked');
              console.log('[QuizResultsPage] sectionId:', sectionId);
              if (sectionId) {
                console.log('[QuizResultsPage] Navigating to analytics:', `/student/sections/${sectionId}/analytics`);
                navigate(`/student/sections/${sectionId}/analytics`);
              } else {
                console.log('[QuizResultsPage] No sectionId, using navigate(-1)');
                navigate(-1);
              }
            }}
            sx={{ mb: 3 }}
          >
            Back to Analytics
          </Button>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Score Card */}
          <Card sx={{ mb: 4, backgroundColor: passed ? '#e8f5e9' : '#ffebee' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {/* Icon */}
                <Box sx={{ textAlign: 'center' }}>
                  {passed ? (
                    <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
                  ) : (
                    <CancelIcon sx={{ fontSize: 60, color: 'error.main' }} />
                  )}
                </Box>

                {/* Score Details */}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatters.formatScore(score, maxScore)}
                  </Typography>
                  <Typography variant="h6" sx={{ color: passed ? 'success.dark' : 'error.dark' }}>
                    {passed ? '✓ PASSED' : '✗ NOT PASSED'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ height: 8, borderRadius: 1 }}
                        color={passed ? 'success' : 'error'}
                      />
                    </Box>
                    <Chip
                      label={`${formatters.formatPercentage(percentage, 1)}`}
                      color={passed ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Answer Review Section */}
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
            Answer Review
          </Typography>

          {answers.length === 0 ? (
            <Alert severity="info">No answers to review</Alert>
          ) : (
            <Grid container spacing={3}>
              {answers
                .filter((review) => review.question) // Filter out reviews without question
                .map((review, index) => (
                  review.question && (
                    <Grid item xs={12} key={review.question.id}>
                      <Card>
                        <CardContent>
                          {/* Question Number and Content */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: 'textSecondary' }}>
                              Question {index + 1}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5 }}>
                              {review.question.content}
                            </Typography>
                          </Box>

                          {/* Student Answer */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                              Your Answer:
                            </Typography>
                            {review.studentAnswer.selectedOptionIds.length === 0 ? (
                              <Typography variant="body2" sx={{ color: 'warning.main' }}>
                                ⚠️ No answer selected
                              </Typography>
                            ) : (
                              review.question.answerOptions &&
                              review.question.answerOptions
                                .filter((opt) =>
                                  review.studentAnswer.selectedOptionIds.includes(opt.id)
                                )
                                .map((opt) => (
                              <Typography
                                key={opt.id}
                                variant="body2"
                                sx={{
                                  p: 1,
                                  mb: 0.5,
                                  backgroundColor: review.studentAnswer.isCorrect
                                    ? '#e8f5e9'
                                    : '#ffebee',
                                  borderLeft: `4px solid ${
                                    review.studentAnswer.isCorrect ? '#4caf50' : '#f44336'
                                  }`,
                                  borderRadius: '0 4px 4px 0',
                                }}
                              >
                                {opt.content}
                              </Typography>
                            ))
                        )}
                      </Box>

                      {/* Correct Answer (if student was wrong) */}
                      {!review.studentAnswer.isCorrect && review.question.answerOptions && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            ✓ Correct Answer:
                          </Typography>
                          {review.question.answerOptions
                            .filter((opt) => opt.isCorrect)
                            .map((opt) => (
                              <Typography
                                key={opt.id}
                                variant="body2"
                                sx={{
                                  p: 1,
                                  mb: 0.5,
                                  backgroundColor: '#e8f5e9',
                                  borderLeft: '4px solid #4caf50',
                                  borderRadius: '0 4px 4px 0',
                                }}
                              >
                                {opt.content}
                              </Typography>
                            ))}
                        </Box>
                      )}

                      {/* Result Badge */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          icon={
                            review.studentAnswer.isCorrect ? (
                              <CheckCircleIcon />
                            ) : (
                              <CancelIcon />
                            )
                          }
                          label={review.studentAnswer.isCorrect ? 'Correct' : 'Incorrect'}
                          color={review.studentAnswer.isCorrect ? 'success' : 'error'}
                          variant="outlined"
                        />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: review.studentAnswer.isCorrect ? 'success.main' : 'error.main',
                          }}
                        >
                          {review.question.answerOptions && formatters.formatPercentage(
                            (review.studentAnswer.earnedPoints /
                              review.question.answerOptions.length) *
                              100,
                            0
                          )}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                  )
              ))}
            </Grid>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate(-2)}>
              ← Back to Quizzes
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(-1)}
            >
              Retry Quiz
            </Button>
          </Box>
        </Box>
      </Container>
    </>
  );
}
