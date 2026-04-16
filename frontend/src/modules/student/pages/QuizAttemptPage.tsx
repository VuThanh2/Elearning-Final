import React, { useEffect, useState } from 'react';
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
  const sectionId = (location.state as any)?.sectionId || null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => {
    const initializeAttempt = async () => {
      if (!quizId) return;
      try {
        setLoading(true);
        const quizData = await quizService.getQuizForAttempt(quizId);
        setQuiz(quizData);
        const attemptData = await attemptService.startAttempt(quizId);
        setAttemptId(attemptData.id);
        const answersMap = new Map<string, string[]>();
        quizData.questions.forEach((q) => answersMap.set(q.id, []));
        setAnswers(answersMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start quiz');
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

  const handleSubmitClick = () => setShowSubmitConfirm(true);

  const handleSubmit = async () => {
    if (!attemptId || !quiz) return;
    try {
      setSubmitting(true);
      const submitData: SubmitAttemptRequest = {
        answers: quiz.questions.map((q) => ({ questionId: q.id, selectedOptionIds: answers.get(q.id) || [] })),
      };
      const submitResponse = await attemptService.submitAttempt(attemptId, submitData);
      showNotification('Quiz submitted successfully!', 'success');
      setShowSubmitConfirm(false);
      setTimeout(() => {
        navigate(`/student/quiz/${quizId}/results/${attemptId}`, { state: { submissionResponse: submitResponse, sectionId } });
      }, 300);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to submit quiz', 'error');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageShell title="Quiz Attempt" subtitle="Answer questions carefully before time runs out"><Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box></PageShell>;
  }

  if (!quiz || !attemptId) {
    return <PageShell title="Quiz Attempt" subtitle="Answer questions carefully before time runs out"><Alert severity="error">{error || 'Failed to load quiz'}</Alert><Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button></PageShell>;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = quiz.questions.length > 0 ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 : 0;

  if (!currentQuestion) {
    return <PageShell title="Quiz Attempt" subtitle="Answer questions carefully before time runs out"><Alert severity="error">Question not found. Please try again.</Alert><Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button></PageShell>;
  }

  return (
    <PageShell title={quiz.title} subtitle={quiz.description || 'Quiz in progress'}>
      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{quiz.title}</Typography>
                <Typography variant="body2" color="text.secondary">{quiz.description}</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`${quiz.questions.length} questions`} variant="outlined" />
                <Chip label={`${quiz.timeLimitMinutes} minutes`} color="primary" variant="outlined" />
                <Chip label={timeExpired ? 'Time expired' : 'In progress'} color={timeExpired ? 'error' : 'success'} variant="outlined" />
              </Stack>
            </Box>
            {!timeExpired && <QuizTimer initialSeconds={quiz.timeLimitMinutes * 60} onTimeExpired={handleTimeExpired} />}
            {timeExpired && <Alert severity="error">⏰ Time expired! Your quiz has been auto-submitted.</Alert>}
            <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 999 }} />
            <Typography variant="body2" color="text.secondary">Question {currentQuestionIndex + 1} of {quiz.questions.length}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', mb: 3 }}>
        <CardContent>
          <QuestionDisplay questionNumber={currentQuestionIndex + 1} totalQuestions={quiz.questions.length} question={currentQuestion} selectedAnswers={answers.get(currentQuestion.id) || []} onChange={(selectedOptionIds) => handleAnswerChange(currentQuestion.id, selectedOptionIds)} />
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0 || submitting}>← Previous</Button>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{currentQuestionIndex + 1} / {quiz.questions.length}</Typography>
        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button variant="contained" color="success" onClick={handleSubmitClick} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Quiz'}</Button>
        ) : (
          <Button variant="contained" onClick={handleNextQuestion} disabled={submitting}>Next →</Button>
        )}
      </Box>

      <Dialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)}>
        <DialogTitle>Submit Quiz?</DialogTitle>
        <DialogContent><Typography>Are you sure you want to submit your quiz? You won't be able to make changes after submitting.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="success" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
