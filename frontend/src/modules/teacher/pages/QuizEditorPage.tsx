import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useNotification } from '../../shared';
import PageShell from '../../shared/components/PageShell';
import { quizService } from '../services/quizService';
import { Quiz } from '../../shared/types';
import QuestionEditor from '../components/QuestionEditor';

export default function QuizEditorPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const sectionId = searchParams.get('sectionId');
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(!!quizId);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [maxScore, setMaxScore] = useState(100);
  const [deadlineAt, setDeadlineAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const [isDirty, setIsDirty] = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [hideDialog, setHideDialog] = useState(false);

  useEffect(() => {
    if (quizId) {
      const loadQuiz = async () => {
        try {
          setLoading(true);
          const data = await quizService.getQuiz(quizId);
          setQuiz({
            ...data,
            questions: data.questions.map((q) => ({
              ...q,
              fromBackend: true,
              __original: JSON.stringify({
                content: q.content,
                questionType: q.questionType,
                answerOptions: q.answerOptions.map((o) => ({ content: o.content, isCorrect: o.isCorrect })),
              }),
            })),
          });
          setTitle(data.title);
          setDescription(data.description);
          setTimeLimitMinutes(data.timeLimitMinutes);
          setMaxAttempts(data.maxAttempts);
          setMaxScore(data.maxScore);
          setDeadlineAt(new Date(data.deadlineAt).toISOString().split('T')[0]);
        } catch (err) {
          showNotification(err instanceof Error ? err.message : 'Failed to load quiz', 'error');
          navigate(-1);
        } finally {
          setLoading(false);
        }
      };
      loadQuiz();
    } else if (!sectionId) {
      showNotification('Section ID is required to create a quiz', 'error');
      navigate(-1);
    } else if (!quiz) {
      setQuiz({
        id: '',
        quizId: '',
        teacherId: '',
        sectionId,
        title: '',
        description: '',
        timeLimitMinutes: 30,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxAttempts: 3,
        maxScore: 100,
        status: 'DRAFT',
        questions: [],
      });
      setLoading(false);
    }
  }, [quizId, sectionId, navigate, showNotification, quiz]);

  const handleAddQuestion = () => {
    if (!quiz) return;
    const newQuestionId = Math.random().toString(36).substring(7);
    const newQuestion = {
      id: newQuestionId,
      questionId: newQuestionId,
      content: '',
      questionType: 'MULTIPLE_CHOICE' as const,
      answerOptions: [
        { id: '1', optionId: '1', content: 'Option 1', isCorrect: true },
        { id: '2', optionId: '2', content: 'Option 2', isCorrect: false },
      ],
      fromBackend: false,
    };
    setQuiz({ ...quiz, questions: [...quiz.questions, newQuestion] });
    setIsDirty(true);
  };

  const handleUpdateQuestion = (index: number, updatedQuestion: any) => {
    if (!quiz) return;
    const next = [...quiz.questions];
    next[index] = updatedQuestion;
    setQuiz({ ...quiz, questions: next });
    setIsDirty(true);
  };

  const handleDeleteQuestion = (index: number) => {
    if (!quiz) return;
    setQuiz({ ...quiz, questions: quiz.questions.filter((_, i) => i !== index) });
    setIsDirty(true);
  };

  const isQuestionModified = (question: any): boolean => {
    if (!question.__original) return false;
    try {
      const original = JSON.parse(question.__original);
      const current = {
        content: question.content,
        questionType: question.questionType,
        answerOptions: question.answerOptions.map((o: any) => ({ content: o.content, isCorrect: o.isCorrect })),
      };
      return JSON.stringify(original) !== JSON.stringify(current);
    } catch {
      return false;
    }
  };

  const validateQuiz = (): boolean => {
    if (!title.trim()) {
      showNotification('Quiz title is required', 'error');
      return false;
    }
    if (!quiz || quiz.questions.length === 0) {
      showNotification('Quiz must have at least 1 question', 'error');
      return false;
    }
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      if (!q.content.trim()) return showNotification(`Question ${i + 1} content is required`, 'error'), false;
      if (q.answerOptions.length < 2) return showNotification(`Question ${i + 1} must have at least 2 options`, 'error'), false;
      if (!q.answerOptions.some((opt) => opt.isCorrect)) return showNotification(`Question ${i + 1} must have at least 1 correct answer`, 'error'), false;
      if (q.answerOptions.some((opt) => !opt.content.trim())) return showNotification(`Question ${i + 1} has an empty option`, 'error'), false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateQuiz()) return;
    try {
      setSaving(true);
      if (quizId) {
        await quizService.updateQuiz(quizId, { title, description, timeLimitMinutes, maxAttempts, maxScore, deadlineAt: `${deadlineAt}T23:59:59Z` });
        for (const question of quiz!.questions) {
          if (question.fromBackend) {
            if (isQuestionModified(question)) {
              await quizService.deleteQuestion(quizId, question.questionId);
              await quizService.addQuestion(quizId, {
                content: question.content,
                questionType: question.questionType,
                answerOptions: question.answerOptions.map((opt) => ({ content: opt.content, isCorrect: opt.isCorrect })),
              });
            }
            continue;
          }
          await quizService.addQuestion(quizId, {
            content: question.content,
            questionType: question.questionType,
            answerOptions: question.answerOptions.map((opt) => ({ content: opt.content, isCorrect: opt.isCorrect })),
          });
        }
      } else {
        const newQuiz = await quizService.createQuiz(sectionId!, { title, description, timeLimitMinutes, maxAttempts, maxScore, deadlineAt: `${deadlineAt}T23:59:59Z` });
        for (const question of quiz!.questions) {
          await quizService.addQuestion(newQuiz.quizId || newQuiz.id || '', {
            content: question.content,
            questionType: question.questionType,
            answerOptions: question.answerOptions.map((opt) => ({ content: opt.content, isCorrect: opt.isCorrect })),
          });
        }
      }
      showNotification('Quiz saved successfully!', 'success');
      setIsDirty(false);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to save quiz', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!quizId) return showNotification('Save quiz first before publishing', 'error');
    try {
      setSaving(true);
      await quizService.publishQuiz(quizId);
      setPublishDialog(false);
      setQuiz(await quizService.getQuiz(quizId));
      showNotification('Quiz published successfully!', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to publish quiz', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleHide = async () => {
    if (!quizId) return;
    try {
      setSaving(true);
      await quizService.hideQuiz(quizId);
      setHideDialog(false);
      setQuiz(await quizService.getQuiz(quizId));
      showNotification('Quiz hidden successfully!', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to hide quiz', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!quizId) return;
    try {
      setSaving(true);
      await quizService.deleteQuiz(quizId);
      setDeleteDialog(false);
      navigate(-1);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to delete quiz', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell title="Quiz Editor" subtitle="Design and publish assessment content">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      </PageShell>
    );
  }

  return (
    <PageShell title={quizId ? 'Edit Quiz' : 'Create New Quiz'} subtitle="Build questions, configure settings, and publish when ready">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: '#fff' }}><ArrowBackIcon /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>{quizId ? 'Edit Quiz' : 'Create New Quiz'}</Typography>
          <Typography variant="body2" color="text.secondary">{sectionId ? `Section ${sectionId}` : 'Quiz setup'}</Typography>
        </Box>
        {isDirty && <Chip label="Unsaved changes" color="warning" variant="outlined" />}
      </Box>

      {quiz && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Quiz Information</Typography>
                  <TextField fullWidth label="Quiz Title" value={title} onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }} />
                  <TextField fullWidth label="Description" value={description} onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }} multiline rows={3} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}><TextField fullWidth label="Time Limit (minutes)" type="number" value={timeLimitMinutes} onChange={(e) => { setTimeLimitMinutes(parseInt(e.target.value) || 30); setIsDirty(true); }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField fullWidth label="Max Attempts" type="number" value={maxAttempts} onChange={(e) => { setMaxAttempts(parseInt(e.target.value) || 1); setIsDirty(true); }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField fullWidth label="Max Score" type="number" value={maxScore} onChange={(e) => { setMaxScore(parseInt(e.target.value) || 100); setIsDirty(true); }} /></Grid>
                  </Grid>
                  <TextField label="Deadline Date" type="date" value={deadlineAt} onChange={(e) => { setDeadlineAt(e.target.value); setIsDirty(true); }} InputLabelProps={{ shrink: true }} />
                </Stack>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Questions</Typography>
                <Typography variant="body2" color="text.secondary">Create and organize quiz questions below.</Typography>
              </Box>
              <Button startIcon={<AddIcon />} variant="contained" onClick={handleAddQuestion}>Add Question</Button>
            </Box>

            {quiz.questions.length === 0 ? (
              <Alert severity="info">No questions yet. Add one to get started!</Alert>
            ) : (
              <Stack spacing={2}>
                {quiz.questions.map((question, index) => (
                  <QuestionEditor key={question.id} question={question} onUpdate={(updated) => handleUpdateQuestion(index, updated)} onDelete={() => handleDeleteQuestion(index)} />
                ))}
              </Stack>
            )}
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ position: 'sticky', top: 96, borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Actions</Typography>
                  <Typography variant="body2" color="text.secondary">Save your draft, publish it, or hide it from students.</Typography>
                  <Divider />
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveDraft} disabled={saving || !isDirty} fullWidth>{saving ? 'Saving...' : 'Save Draft'}</Button>
                  {quizId && (
                    <>
                      {(!quiz.status || quiz.status === 'Draft' || quiz.status === 'DRAFT' || quiz.status === 'Hidden' || quiz.status === 'HIDDEN') && <Button startIcon={<DeleteIcon />} variant="outlined" color="error" onClick={() => setDeleteDialog(true)} disabled={saving} fullWidth>Delete Quiz</Button>}
                      {(!quiz.status || quiz.status === 'Draft' || quiz.status === 'DRAFT') && <Button startIcon={<PublishIcon />} variant="contained" color="success" onClick={() => setPublishDialog(true)} disabled={saving} fullWidth>Publish</Button>}
                      {(quiz.status === 'Published' || quiz.status === 'PUBLISHED') && <Button startIcon={<VisibilityOffIcon />} variant="outlined" color="warning" onClick={() => setHideDialog(true)} disabled={saving} fullWidth>Hide Quiz</Button>}
                      {(quiz.status === 'Hidden' || quiz.status === 'HIDDEN') && <Button startIcon={<PublishIcon />} variant="contained" color="success" onClick={() => setPublishDialog(true)} disabled={saving} fullWidth>Publish Again</Button>}
                    </>
                  )}
                  <Button variant="text" onClick={() => navigate(-1)} fullWidth>Cancel</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={publishDialog} onClose={() => setPublishDialog(false)}>
        <DialogTitle>Publish Quiz?</DialogTitle>
        <DialogContent>
          <Typography>Once published, students will be able to see and take this quiz. Make sure everything is correct.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialog(false)}>Cancel</Button>
          <Button onClick={handlePublish} variant="contained" color="success" disabled={saving}>{saving ? 'Publishing...' : 'Publish'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hideDialog} onClose={() => setHideDialog(false)}>
        <DialogTitle>Hide Quiz?</DialogTitle>
        <DialogContent>
          <Typography>Students will not be able to see this quiz anymore. Existing attempts will still be graded.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHideDialog(false)}>Cancel</Button>
          <Button onClick={handleHide} variant="contained" color="warning" disabled={saving}>{saving ? 'Hiding...' : 'Hide'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Quiz?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone. All questions and responses will be permanently deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
