import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useAuth, Navbar, useNotification } from '../../shared';
import { quizService } from '../services/quizService';
import { attemptService } from '../services/attemptService';
import { Quiz, SubmitAttemptRequest } from '../../shared/types';
import QuizTimer from '../components/QuizTimer';
import QuestionDisplay from '../components/QuestionDisplay';

export default function QuizAttemptPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  // Get sectionId from navigation state (passed from SectionDetailsPage)
  const sectionId = (location.state as any)?.sectionId || null;

  // State
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz answer tracking
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());

  // Dialogs
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);

  // Initialize attempt
  useEffect(() => {
    const initializeAttempt = async () => {
      if (!quizId) return;

      try {
        setLoading(true);
        console.log('[QuizAttempt] Starting initialization for quizId:', quizId);

        // Fetch quiz using student-accessible endpoint
        console.log('[QuizAttempt] Fetching quiz from /quizzes/:quizId/attempt...');
        const quizData = await quizService.getQuizForAttempt(quizId);
        console.log('[QuizAttempt] Quiz data received:', quizData);
        setQuiz(quizData);

        // Start attempt
        console.log('[QuizAttempt] Starting attempt...');
        const attemptData = await attemptService.startAttempt(quizId);
        console.log('[QuizAttempt] Attempt started:', attemptData);
        setAttemptId(attemptData.id);

        // Initialize empty answers map
        const answersMap = new Map<string, string[]>();
        quizData.questions.forEach((q) => {
          answersMap.set(q.id, []);
        });
        setAnswers(answersMap);
        console.log('[QuizAttempt] Initialization complete');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to start quiz';
        console.error('[QuizAttempt] Error during initialization:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    initializeAttempt();
  }, [quizId]);

  const handleTimeExpired = async () => {
    setTimeExpired(true);
    await handleSubmit();
  };

  const handleAnswerChange = (questionId: string, selectedOptionIds: string[]) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, selectedOptionIds);
    setAnswers(newAnswers);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const handleSubmit = async () => {
    if (!attemptId || !quiz) return;

    try {
      setSubmitting(true);

      // Build submission data
      const submitData: SubmitAttemptRequest = {
        answers: quiz.questions.map((q) => ({
          questionId: q.id,
          selectedOptionIds: answers.get(q.id) || [],
        })),
      };

      console.log('[QuizAttempt] Submitting answers (expanded):', JSON.stringify(submitData, null, 2));

      // Log each question with all its options and which one is correct
      console.log('[QuizAttempt] Question details:');
      quiz.questions.forEach((q, idx) => {
        console.log(`  Q${idx + 1}: ${q.content}`);
        console.log(`    ID: ${q.id}`);
        console.log(`    Your selection: ${answers.get(q.id)?.join(', ') || '(none)'}`);
        q.answerOptions.forEach((opt, optIdx) => {
          const isSelected = answers.get(q.id)?.includes(opt.id) ? '✓ SELECTED' : '';
          const isCorrect = opt.isCorrect ? '✓✓ CORRECT' : '';
          console.log(`      Opt ${optIdx + 1}: "${opt.content}" (ID: ${opt.id}) ${isCorrect} ${isSelected}`);
        });
      });

      // Submit attempt
      const submitResponse = await attemptService.submitAttempt(attemptId, submitData);

      showNotification('Quiz submitted successfully!', 'success');
      setShowSubmitConfirm(false);

      // Redirect to results with submission data
      setTimeout(() => {
        navigate(`/student/quiz/${quizId}/results/${attemptId}`, {
          state: { submissionResponse: submitResponse, sectionId }
        });
      }, 500);
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Failed to submit quiz',
        'error'
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    console.log('[QuizAttempt] Still loading...');
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

  console.log('[QuizAttempt] Render state:', { quiz: !!quiz, attemptId: !!attemptId, error, loading });

  if (!quiz || !attemptId) {
    console.error('[QuizAttempt] Missing quiz or attemptId:', { quiz: !!quiz, attemptId: !!attemptId, error });
    return (
      <>
        <Navbar />
        <Container maxWidth="lg">
          <Box sx={{ py: 4 }}>
            <Alert severity="error">{error || 'Failed to load quiz'}</Alert>
            <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
              Go Back
            </Button>
          </Box>
        </Container>
      </>
    );
  }

  console.log('[QuizAttempt] Rendering quiz content. currentQuestionIndex:', currentQuestionIndex, 'Total questions:', quiz.questions.length);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const timeWarnColors = timeExpired ? '#d32f2f' : 'inherit';

  if (!currentQuestion) {
    console.error('[QuizAttempt] Current question not found!', { currentQuestionIndex, totalQuestions: quiz.questions.length });
    return (
      <>
        <Navbar />
        <Container maxWidth="lg">
          <Box sx={{ py: 4 }}>
            <Alert severity="error">Question not found. Please try again.</Alert>
            <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
              Go Back
            </Button>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          {/* Quiz Title */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {quiz.title}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {quiz.description}
            </Typography>
          </Box>

          {/* Timer */}
          {!timeExpired && (
            <Box sx={{ mb: 3 }}>
              <QuizTimer
                initialSeconds={quiz.timeLimitMinutes * 60}
                onTimeExpired={handleTimeExpired}
              />
            </Box>
          )}

          {timeExpired && (
            <Alert severity="error" sx={{ mb: 3 }}>
              ⏰ Time expired! Your quiz has been auto-submitted.
            </Alert>
          )}

          {/* Question Display */}
          <Box sx={{ mb: 3 }}>
            <QuestionDisplay
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={quiz.questions.length}
              question={currentQuestion}
              selectedAnswers={answers.get(currentQuestion.id) || []}
              onChange={(selectedOptionIds) =>
                handleAnswerChange(currentQuestion.id, selectedOptionIds)
              }
            />
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
            {/* Previous Button */}
            <Button
              variant="outlined"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0 || submitting}
            >
              ← Previous
            </Button>

            {/* Question Progress */}
            <Typography variant="body2" sx={{ alignSelf: 'center', fontWeight: 600 }}>
              {currentQuestionIndex + 1} / {quiz.questions.length}
            </Typography>

            {/* Next/Submit Button */}
            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <Button
                variant="contained"
                color="success"
                onClick={handleSubmitClick}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : '✓ Submit Quiz'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNextQuestion}
                disabled={submitting}
              >
                Next →
              </Button>
            )}
          </Box>

          {/* Submit Confirmation Dialog */}
          <Dialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)}>
            <DialogTitle>Submit Quiz?</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to submit your quiz? You won't be able to make changes
                after submitting.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                color="success"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </>
  );
}
