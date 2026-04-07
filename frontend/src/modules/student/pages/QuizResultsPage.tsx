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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {answers
                .filter((review) => review.question) // Filter out reviews without question
                .map((review, index) => (
                  review.question && (
                    <Card
                      key={review.question.id}
                      sx={{
                        padding: 3,
                        borderLeft: `5px solid ${
                          review.studentAnswer.isCorrect ? '#4caf50' : '#f44336'
                        }`,
                        backgroundColor: review.studentAnswer.isCorrect ? '#f1f8f6' : '#fef5f5',
                      }}
                    >
                      {/* Question Number and Content */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ color: 'textSecondary', fontWeight: 600 }}>
                          Question {index + 1}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, mb: 1 }}>
                          {review.question.content}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            icon={
                              review.studentAnswer.isCorrect ? (
                                <CheckCircleIcon />
                              ) : (
                                <CancelIcon />
                              )
                            }
                            label={review.studentAnswer.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                            color={review.studentAnswer.isCorrect ? 'success' : 'error'}
                            size="small"
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              fontWeight: 700,
                              color: review.studentAnswer.isCorrect ? 'success.main' : 'error.main',
                            }}
                          >
                            {review.studentAnswer.earnedPoints}/{review.question.answerOptions?.length || 0} points
                          </Typography>
                        </Box>
                      </Box>

                      {/* All Answer Options (Form-like display) */}
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            mb: 1.5,
                            color: 'textSecondary',
                            textTransform: 'uppercase',
                            fontSize: '0.8rem',
                          }}
                        >
                          Options
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {review.question.answerOptions?.map((opt) => {
                            const isSelected = review.studentAnswer.selectedOptionIds.includes(opt.id);
                            const isCorrect = opt.isCorrect;
                            const showAsCorrect = isCorrect && review.studentAnswer.isCorrect;
                            const showAsIncorrect = isSelected && !isCorrect && !review.studentAnswer.isCorrect;

                            return (
                              <Box
                                key={opt.id}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  p: 1.5,
                                  border: '1px solid',
                                  borderColor: showAsCorrect ? '#4caf50' : showAsIncorrect ? '#f44336' : '#e0e0e0',
                                  backgroundColor: showAsCorrect
                                    ? '#e8f5e9'
                                    : showAsIncorrect
                                    ? '#ffebee'
                                    : isCorrect && !review.studentAnswer.isCorrect
                                    ? '#f1f8f6'
                                    : '#fafafa',
                                  borderRadius: 1,
                                  cursor: 'default',
                                }}
                              >
                                {/* Checkbox/Radio indicator */}
                                <Box
                                  sx={{
                                    width: 20,
                                    height: 20,
                                    border: '2px solid',
                                    borderColor: showAsCorrect
                                      ? '#4caf50'
                                      : showAsIncorrect
                                      ? '#f44336'
                                      : '#bdbdbd',
                                    borderRadius: review.question.questionType === 'SINGLE_CHOICE' ? '50%' : '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isSelected ? '#1976d2' : 'transparent',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                  }}
                                >
                                  {isSelected && (isCorrect ? '✓' : isCorrect === false ? '✗' : '✓')}
                                </Box>

                                {/* Option content */}
                                <Typography
                                  variant="body2"
                                  sx={{
                                    flex: 1,
                                    fontWeight: isSelected ? 600 : 500,
                                    color: showAsCorrect
                                      ? '#2e7d32'
                                      : showAsIncorrect
                                      ? '#c62828'
                                      : 'textPrimary',
                                  }}
                                >
                                  {opt.content}
                                </Typography>

                                {/* Status indicator */}
                                {isSelected && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 700,
                                      color: 'textSecondary',
                                      textTransform: 'uppercase',
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    {review.studentAnswer.isCorrect ? 'YOUR ANSWER' : 'YOUR ANSWER (WRONG)'}
                                  </Typography>
                                )}

                                {!isSelected && isCorrect && !review.studentAnswer.isCorrect && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 700,
                                      color: '#2e7d32',
                                      textTransform: 'uppercase',
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    CORRECT ANSWER
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>

                      {/* Explanation or summary */}
                      {review.studentAnswer.isCorrect && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          Great job! You selected the correct answer(s).
                        </Alert>
                      )}
                      {!review.studentAnswer.isCorrect && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          This answer is incorrect. Review the correct answer(s) above and try again on your next attempt.
                        </Alert>
                      )}
                    </Card>
                  )
              ))}
            </Box>
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
