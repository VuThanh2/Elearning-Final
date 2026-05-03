import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Stack,
  Chip,
  LinearProgress,
} from '@mui/material';
import PageShell from '../../shared/components/PageShell';
import { useNotification } from '../../shared';
import { attemptService } from '../services/attemptService';
import { Quiz, SubmitAttemptRequest } from '../../shared/types';
import QuizTimer from '../components/QuizTimer';
import QuestionDisplay from '../components/QuestionDisplay';

export default function QuizAttemptPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const sectionId = (location.state as any)?.sectionId || null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const submittingRef = useRef(false);
  const expiredRef = useRef(false);
  const initializedRef = useRef(false);
  const initializedQuizIdRef = useRef<string | null>(null);
  const activeAttemptKeyRef = useRef<string | null>(null);

  const getAttemptStorageKey = (id: string) => `student-quiz-attempt:${id}`;

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
  };

  useEffect(() => {
    setQuiz(null);
    setAttemptId(null);
    setAnswers(new Map());
    setCurrentQuestionIndex(0);
    setShowStartConfirm(false);
    setShowLeaveConfirm(false);
    setShowSubmitConfirm(false);
    setTimeExpired(false);
    setHasStarted(false);
    setError(null);
    setLoading(true);
    initializedRef.current = false;
    expiredRef.current = false;
    activeAttemptKeyRef.current = null;

    const initializeAttempt = async () => {
      if (!quizId) return;
      if (initializedRef.current && initializedQuizIdRef.current === quizId) return;
      if (submittingRef.current) return;
      submittingRef.current = true;
      initializedRef.current = true;
      initializedQuizIdRef.current = quizId;
      try {
        setError(null);
        const attemptData = await withTimeout(
          attemptService.startAttempt(quizId),
          8000,
          'Quiz attempt could not be started. Please refresh and try again.'
        );

        if (!attemptData.questions?.length) {
          throw new Error('Quiz attempt started but no questions were returned.');
        }

        setAttemptId(attemptData.attemptId);
        activeAttemptKeyRef.current = attemptData.attemptId;
        window.sessionStorage.setItem(
          getAttemptStorageKey(attemptData.attemptId),
          JSON.stringify({ quizId, startedAt: attemptData.startedAt, expiresAt: attemptData.expiresAt })
        );
        setQuiz({
          id: attemptData.quizId,
          quizId: attemptData.quizId,
          teacherId: '',
          sectionId: '',
          title: attemptData.quizTitle || 'Quiz Attempt',
          description: attemptData.description || '',
          timeLimitMinutes: attemptData.timeLimitMinutes,
          deadlineAt: attemptData.expiresAt,
          maxAttempts: 1,
          maxScore: attemptData.maxScore,
          status: 'PUBLISHED',
          questions: attemptData.questions,
          totalQuestions: attemptData.totalQuestions,
          questionPoints: attemptData.totalQuestions > 0 ? attemptData.maxScore / attemptData.totalQuestions : 0,
        });

        const answersMap = new Map<string, string[]>();
        attemptData.questions.forEach((q) => answersMap.set(q.id, []));
        setAnswers(answersMap);
        setCurrentQuestionIndex(0);
        setShowStartConfirm(true);
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error('Failed to start quiz');
        setError(normalizedError.message);
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
    };

    initializeAttempt();

  }, [quizId]);

  const handleTimeExpired = async () => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    setTimeExpired(true);
    try {
      setSubmitting(true);
      await expireCurrentAttempt();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to submit quiz', 'error');
      setSubmitting(false);
      expiredRef.current = false;
    } finally {
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasStarted || submitting) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveConfirm(true);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasStarted, submitting]);

  const handleAnswerChange = (questionId: string, selectedOptionIds: string[]) => {
    const next = new Map(answers);
    next.set(questionId, selectedOptionIds);
    setAnswers(next);
  };

  const handlePreviousQuestion = () => setCurrentQuestionIndex((i) => Math.max(i - 1, 0));
  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  };

  const handleStartQuiz = () => {
    setHasStarted(true);
    setShowStartConfirm(false);
  };

  const handleLeaveQuiz = async () => {
    setShowLeaveConfirm(false);
    if (hasStarted && !timeExpired) {
      try {
        setSubmitting(true);
        await submitCurrentAttempt();
        return;
      } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Failed to submit quiz', 'error');
        setSubmitting(false);
      }
    }
    setHasStarted(false);
    navigate(-1);
  };

  const handleSubmitClick = () => setShowSubmitConfirm(true);

  const buildSubmitData = (): SubmitAttemptRequest | null => {
    if (!attemptId || !quizId || !quiz) return null;

    return {
      answers: quiz.questions.map((q) => ({ questionId: q.id, selectedOptionIds: answers.get(q.id) || [] })),
    };
  };

  const finishAttempt = (submissionResponse: unknown) => {
    if (!attemptId || !quizId) return;

    setShowSubmitConfirm(false);
    setHasStarted(false);
    initializedRef.current = false;
    if (activeAttemptKeyRef.current) {
      window.sessionStorage.removeItem(getAttemptStorageKey(activeAttemptKeyRef.current));
    }
    activeAttemptKeyRef.current = null;
    navigate(`/student/quiz/${quizId}/results/${attemptId}`, {
      replace: true,
      state: { submissionResponse, sectionId },
    });
  };

  const submitCurrentAttempt = async () => {
    const submitData = buildSubmitData();
    if (!attemptId || !quizId || !submitData) return;

    const submitResponse = await attemptService.submitAttempt(attemptId, submitData);
    showNotification('Quiz submitted successfully!', 'success');
    finishAttempt(submitResponse);
  };

  const expireCurrentAttempt = async () => {
    const submitData = buildSubmitData();
    if (!attemptId || !quizId || !submitData) return;

    const submitResponse = await attemptService.expireAttempt(attemptId, submitData);
    showNotification('Time expired. Quiz auto-submitted.', 'warning');
    finishAttempt(submitResponse);
  };

  const handleSubmit = async () => {
    if (!attemptId || !quiz) return;
    try {
      setSubmitting(true);
      await submitCurrentAttempt();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to submit quiz', 'error');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell title="Quiz Attempt" subtitle="Answer questions carefully before time runs out">
        <Card sx={{ borderRadius: 5, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Loading quiz questions...
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Quiz Attempt" subtitle="Answer questions carefully before time runs out">
        <Card sx={{ borderRadius: 5, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          <CardContent>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                onClick={() => {
                  if (sectionId) navigate(`/student/sections/${sectionId}`, { replace: true });
                  else navigate('/student/dashboard?view=quizzes', { replace: true });
                }}
                variant="outlined"
              >
                Go Back
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!quiz || !attemptId) {
    return (
      <PageShell title="Quiz Attempt" subtitle="Answer questions carefully before time runs out">
        <Card sx={{ borderRadius: 5, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          <CardContent>
            <Alert severity="error">Failed to load quiz</Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
              <Button onClick={() => setShowLeaveConfirm(true)} variant="outlined">
                Go Back
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = quiz.questions.length > 0 ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 : 0;

  if (!currentQuestion) {
    return (
      <PageShell title="Quiz Attempt" subtitle="Answer questions carefully before time runs out">
        <Card sx={{ borderRadius: 5, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          <CardContent>
            <Alert severity="error">Question not found. Please try again.</Alert>
            <Button onClick={() => setShowLeaveConfirm(true)} variant="outlined" sx={{ mt: 2 }}>Go Back</Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={quiz.title} subtitle={quiz.description || 'Quiz in progress'}>
      <Dialog open={showStartConfirm}>
        <DialogTitle>Ready to begin?</DialogTitle>
        <DialogContent>
          <Typography>
            Click Start Quiz to open the quiz. Your timer and questions will appear after you confirm.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStartConfirm(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleStartQuiz} variant="contained">
            Start Quiz
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)}>
        <DialogTitle>Leave quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            If you leave now, the quiz will be auto-submitted and you may not be able to change your answers.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLeaveConfirm(false)} disabled={submitting}>
            Stay
          </Button>
          <Button onClick={handleLeaveQuiz} color="error" variant="contained" disabled={submitting}>
            Leave and submit
          </Button>
        </DialogActions>
      </Dialog>

      {hasStarted && (
        <>
          <Card sx={{ mb: 3, borderRadius: 5, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.06) 0%, #ffffff 100%)' }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Chip label="Quiz in progress" color={timeExpired ? 'error' : 'success'} variant="outlined" size="small" sx={{ mb: 1 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.2 }}>{quiz.title || 'Untitled quiz'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{quiz.description || 'Answer each question carefully before submitting.'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={`${quiz.questions.length} questions`} variant="outlined" />
                    <Chip label={`${quiz.timeLimitMinutes} minutes`} color="primary" variant="outlined" />
                  </Stack>
                </Box>
                {!timeExpired && <QuizTimer initialSeconds={quiz.timeLimitMinutes * 60} onTimeExpired={handleTimeExpired} />}
                {timeExpired && <Alert severity="error">Your time expired and the quiz was auto-submitted.</Alert>}
                <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 999 }} />
                <Typography variant="body2" color="text.secondary">Question {currentQuestionIndex + 1} of {quiz.questions.length}</Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 5, border: '1px solid rgba(148, 163, 184, 0.14)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', mb: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <QuestionDisplay questionNumber={currentQuestionIndex + 1} totalQuestions={quiz.questions.length} question={currentQuestion} selectedAnswers={answers.get(currentQuestion.id) || []} onChange={(selectedOptionIds) => handleAnswerChange(currentQuestion.id, selectedOptionIds)} />
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0 || submitting} sx={{ minHeight: 42 }}>← Previous</Button>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{currentQuestionIndex + 1} / {quiz.questions.length}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {currentQuestionIndex === quiz.questions.length - 1 ? (
                <Button variant="contained" color="success" onClick={handleSubmitClick} disabled={submitting} sx={{ minHeight: 42 }}>{submitting ? 'Submitting...' : 'Submit Quiz'}</Button>
              ) : (
                <Button variant="contained" onClick={handleNextQuestion} disabled={submitting} sx={{ minHeight: 42 }}>Next →</Button>
              )}
            </Stack>
          </Box>
        </>
      )}

      <Dialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)}>
        <DialogTitle>Submit Quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit your quiz? You won't be able to make changes after submitting.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="success" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
