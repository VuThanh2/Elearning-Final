import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import PageShell from '../../shared/components/PageShell';
import { useNotification } from '../../shared';
import { Section, QuestionType, Quiz } from '../../shared/types';
import { academicService } from '../../student/services/academicService';
import { quizService } from '../services/quizService';
import QuestionEditor from '../components/QuestionEditor';

const createDraftQuestion = (questionType: QuestionType) => {
  const questionId = Math.random().toString(36).slice(2, 9);

  return {
    id: questionId,
    questionId,
    content: '',
    questionType,
    answerOptions: [
      {
        id: `${questionId}-a`,
        optionId: `${questionId}-a`,
        content: '',
        isCorrect: true,
      },
      {
        id: `${questionId}-b`,
        optionId: `${questionId}-b`,
        content: '',
        isCorrect: false,
      },
    ],
    fromBackend: false,
  };
};

const isDraftStatus = (status?: string) => {
  const normalizedStatus = String(status || 'DRAFT').toUpperCase();
  return normalizedStatus === 'DRAFT';
};

const isHiddenStatus = (status?: string) => {
  const normalizedStatus = String(status || '').toUpperCase();
  return normalizedStatus === 'HIDDEN';
};

const isPublishedStatus = (status?: string) => {
  const normalizedStatus = String(status || '').toUpperCase();
  return normalizedStatus === 'PUBLISHED';
};

const getWorkspacePath = (sectionId?: string | null) =>
  sectionId ? `/teacher/sections/${sectionId}` : '/teacher/dashboard';

export default function QuizEditorPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const requestedSectionId = searchParams.get('sectionId');

  const [loading, setLoading] = useState(Boolean(quizId));
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [section, setSection] = useState<Section | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [maxScore, setMaxScore] = useState(100);
  const [deadlineAt, setDeadlineAt] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [isDirty, setIsDirty] = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [hideDialog, setHideDialog] = useState(false);

  const activeSectionId = requestedSectionId || quiz?.sectionId || null;
  const workspacePath = getWorkspacePath(activeSectionId);
  const questionCount = quiz?.questions.length || 0;

  const actionSummary = useMemo(
    () => [
      {
        label: 'Questions',
        value: questionCount,
        icon: <QuizRoundedIcon sx={{ fontSize: 18 }} />,
      },
      {
        label: 'Deadline',
        value: deadlineAt,
        icon: <CalendarTodayRoundedIcon sx={{ fontSize: 18 }} />,
      },
      {
        label: 'Setup',
        value: `${timeLimitMinutes} min / ${maxAttempts} attempts`,
        icon: <TuneRoundedIcon sx={{ fontSize: 18 }} />,
      },
    ],
    [deadlineAt, maxAttempts, questionCount, timeLimitMinutes]
  );

  const refreshSectionContext = async (targetSectionId?: string | null) => {
    if (!targetSectionId) {
      setSection(null);
      return;
    }

    try {
      const teachingSections = await academicService.getTeachingSections();
      setSection(
        teachingSections.find((item) => item.sectionId === targetSectionId) || null
      );
    } catch {
      setSection(null);
    }
  };

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const fallbackPath = getWorkspacePath(requestedSectionId);

      if (quizId) {
        try {
          setLoading(true);
          const data = await quizService.getQuiz(quizId);
          if (!active) return;

          const nextQuiz = {
            ...data,
            questions: data.questions.map((question) => ({
              ...question,
              fromBackend: true,
              __original: JSON.stringify({
                content: question.content,
                questionType: question.questionType,
                answerOptions: question.answerOptions.map((option) => ({
                  content: option.content,
                  isCorrect: option.isCorrect,
                })),
              }),
            })),
          };

          setQuiz(nextQuiz);
          setTitle(data.title);
          setDescription(data.description);
          setTimeLimitMinutes(data.timeLimitMinutes);
          setMaxAttempts(data.maxAttempts);
          setMaxScore(data.maxScore);
          setDeadlineAt(new Date(data.deadlineAt).toISOString().split('T')[0]);
          void refreshSectionContext(data.sectionId);
        } catch (err) {
          showNotification(
            err instanceof Error ? err.message : 'Failed to load quiz',
            'error'
          );
          navigate(fallbackPath, { replace: true });
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      if (!requestedSectionId) {
        showNotification('Section ID is required to create a quiz', 'error');
        navigate('/teacher/dashboard', { replace: true });
        return;
      }

      setQuiz({
        id: '',
        quizId: '',
        teacherId: '',
        sectionId: requestedSectionId,
        title: '',
        description: '',
        timeLimitMinutes: 30,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxAttempts: 3,
        maxScore: 100,
        status: 'DRAFT',
        questions: [],
      });
      void refreshSectionContext(requestedSectionId);
      setLoading(false);
    };

    initialize();

    return () => {
      active = false;
    };
  }, [navigate, quizId, requestedSectionId, showNotification]);

  const handleAddQuestion = (questionType: QuestionType) => {
    if (!quiz) return;
    setQuiz({ ...quiz, questions: [...quiz.questions, createDraftQuestion(questionType)] });
    setIsDirty(true);
  };

  const handleUpdateQuestion = (index: number, updatedQuestion: any) => {
    if (!quiz) return;

    const nextQuestions = [...quiz.questions];
    nextQuestions[index] = updatedQuestion;
    setQuiz({ ...quiz, questions: nextQuestions });
    setIsDirty(true);
  };

  const handleDeleteQuestion = (index: number) => {
    if (!quiz) return;
    setQuiz({
      ...quiz,
      questions: quiz.questions.filter((_, questionIndex) => questionIndex !== index),
    });
    setIsDirty(true);
  };

  const isQuestionModified = (question: any): boolean => {
    if (!question.__original) return false;

    try {
      const original = JSON.parse(question.__original);
      const current = {
        content: question.content,
        questionType: question.questionType,
        answerOptions: question.answerOptions.map((option: any) => ({
          content: option.content,
          isCorrect: option.isCorrect,
        })),
      };

      return JSON.stringify(original) !== JSON.stringify(current);
    } catch {
      return false;
    }
  };

  const validateQuiz = () => {
    if (!title.trim()) {
      showNotification('Quiz title is required', 'error');
      return false;
    }

    if (!quiz || quiz.questions.length === 0) {
      showNotification('Quiz must have at least 1 question', 'error');
      return false;
    }

    for (let index = 0; index < quiz.questions.length; index += 1) {
      const question = quiz.questions[index];

      if (!question.content.trim()) {
        showNotification(`Question ${index + 1} content is required`, 'error');
        return false;
      }

      if (question.answerOptions.length < 2) {
        showNotification(
          `Question ${index + 1} must have at least 2 options`,
          'error'
        );
        return false;
      }

      if (!question.answerOptions.some((option) => option.isCorrect)) {
        showNotification(
          `Question ${index + 1} must have at least 1 correct answer`,
          'error'
        );
        return false;
      }

      if (question.answerOptions.some((option) => !option.content.trim())) {
        showNotification(`Question ${index + 1} has an empty option`, 'error');
        return false;
      }
    }

    return true;
  };

  const hydrateQuizState = async (targetQuizId: string) => {
    const refreshedQuiz = await quizService.getQuiz(targetQuizId);
    setQuiz({
      ...refreshedQuiz,
      questions: refreshedQuiz.questions.map((question) => ({
        ...question,
        fromBackend: true,
        __original: JSON.stringify({
          content: question.content,
          questionType: question.questionType,
          answerOptions: question.answerOptions.map((option) => ({
            content: option.content,
            isCorrect: option.isCorrect,
          })),
        }),
      })),
    });
    setTitle(refreshedQuiz.title);
    setDescription(refreshedQuiz.description);
    setTimeLimitMinutes(refreshedQuiz.timeLimitMinutes);
    setMaxAttempts(refreshedQuiz.maxAttempts);
    setMaxScore(refreshedQuiz.maxScore);
    setDeadlineAt(new Date(refreshedQuiz.deadlineAt).toISOString().split('T')[0]);
    void refreshSectionContext(refreshedQuiz.sectionId);
  };

  const handleSaveDraft = async () => {
    if (!validateQuiz()) return;

    try {
      setSaving(true);

      if (quizId) {
        await quizService.updateQuiz(quizId, {
          title,
          description,
          timeLimitMinutes,
          maxAttempts,
          maxScore,
          deadlineAt: `${deadlineAt}T23:59:59Z`,
        });

        for (const question of quiz!.questions) {
          if (question.fromBackend) {
            if (isQuestionModified(question)) {
              await quizService.deleteQuestion(quizId, question.questionId);
              await quizService.addQuestion(quizId, {
                content: question.content,
                questionType: question.questionType,
                answerOptions: question.answerOptions.map((option) => ({
                  content: option.content,
                  isCorrect: option.isCorrect,
                })),
              });
            }
            continue;
          }

          await quizService.addQuestion(quizId, {
            content: question.content,
            questionType: question.questionType,
            answerOptions: question.answerOptions.map((option) => ({
              content: option.content,
              isCorrect: option.isCorrect,
            })),
          });
        }
      } else {
        const newQuiz = await quizService.createQuiz(activeSectionId!, {
          title,
          description,
          timeLimitMinutes,
          maxAttempts,
          maxScore,
          deadlineAt: `${deadlineAt}T23:59:59Z`,
        });

        const createdQuizId = newQuiz.quizId || newQuiz.id || '';

        for (const question of quiz!.questions) {
          await quizService.addQuestion(createdQuizId, {
            content: question.content,
            questionType: question.questionType,
            answerOptions: question.answerOptions.map((option) => ({
              content: option.content,
              isCorrect: option.isCorrect,
            })),
          });
        }

        navigate(
          `/teacher/quiz/${createdQuizId}/edit${
            activeSectionId ? `?sectionId=${activeSectionId}` : ''
          }`,
          { replace: true }
        );
      }

      showNotification('Quiz saved successfully', 'success');
      setIsDirty(false);

      if (quizId) {
        await hydrateQuizState(quizId);
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to save quiz', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!quizId) {
      showNotification('Save the quiz before publishing', 'error');
      return;
    }

    try {
      setSaving(true);
      await quizService.publishQuiz(quizId);
      setPublishDialog(false);
      await hydrateQuizState(quizId);
      setIsDirty(false);
      showNotification('Quiz published successfully', 'success');
      navigate(
        `/teacher/quiz/${quizId}/edit${activeSectionId ? `?sectionId=${activeSectionId}` : ''}`,
        { replace: true }
      );
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Failed to publish quiz',
        'error'
      );
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
      await hydrateQuizState(quizId);
      setIsDirty(false);
      showNotification('Quiz hidden successfully', 'success');
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
      navigate(workspacePath, { replace: true });
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to delete quiz', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {quiz && (
        <Grid container spacing={3.5}>
          <Grid item xs={12} xl={8.5}>
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: { xs: 2.5, md: 4 },
                borderRadius: 6,
                border: '1px solid rgba(30,57,50,0.08)',
                background:
                  'radial-gradient(circle at top right, rgba(0,117,74,0.08), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,242,235,0.96) 100%)',
              }}
            >
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={2}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
                    <Button
                      startIcon={<ArrowBackRoundedIcon />}
                      variant="outlined"
                      onClick={() => navigate(workspacePath)}
                    >
                      Back
                    </Button>
                    <Chip
                      label={quizId ? 'Editing draft' : 'New draft'}
                      size="small"
                      variant="outlined"
                    />
                    {isDirty && (
                      <Chip
                        label="Unsaved changes"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                    {isPublishedStatus(quiz.status) && (
                      <Chip
                        label="Published"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                    {isHiddenStatus(quiz.status) && (
                      <Chip
                        label="Hidden"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {section?.sectionCode && <Chip label={section.sectionCode} variant="outlined" />}
                    {section?.courseCode && <Chip label={section.courseCode} variant="outlined" />}
                    <Chip
                      label={section?.sectionName || activeSectionId || 'Section workspace'}
                      variant="outlined"
                    />
                  </Stack>
                </Stack>

                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: 'var(--academy-green)', letterSpacing: 1.4 }}
                  >
                    Quiz creator
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.75, maxWidth: 720 }}
                  >
                    Build the assessment inside the existing backend workflow. Titles,
                    settings, questions, publish, and hide all stay on the same API flow.
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Enter quiz title"
                  variant="standard"
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      px: 0,
                      py: 0,
                      alignItems: 'flex-start',
                      '& input': {
                        fontSize: { xs: '2rem', md: '3rem' },
                        fontWeight: 700,
                        lineHeight: 1.05,
                        letterSpacing: '-0.03em',
                        color: 'var(--deep-slate)',
                        fontFamily: 'var(--font-serif)',
                      },
                    },
                  }}
                />

                <TextField
                  fullWidth
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Write a short description for students before they start."
                  multiline
                  minRows={2}
                  variant="standard"
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      '& textarea': {
                        fontSize: '1rem',
                        lineHeight: 1.7,
                        color: 'rgba(30,57,50,0.84)',
                      },
                    },
                  }}
                />
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 6,
                border: '1px solid rgba(30,57,50,0.08)',
                backgroundColor: 'rgba(255,255,255,0.96)',
              }}
            >
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: 'column', lg: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', lg: 'center' }}
                  spacing={2}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: 'var(--deep-slate)',
                        fontFamily: 'var(--font-serif)',
                      }}
                    >
                      Question Builder
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      Keep questions readable, mark the right answers, and save when the
                      draft feels complete.
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    <Button
                      startIcon={<AddRoundedIcon />}
                      variant="outlined"
                      onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                    >
                      Add multi-choice
                    </Button>
                    <Button
                      startIcon={<AddRoundedIcon />}
                      variant="outlined"
                      onClick={() => handleAddQuestion('SINGLE_CHOICE')}
                    >
                      Add single-choice
                    </Button>
                  </Stack>
                </Stack>

                {questionCount === 0 ? (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 4,
                      '& .MuiAlert-message': {
                        width: '100%',
                      },
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        No questions yet
                      </Typography>
                      <Typography variant="body2">
                        Start with a multiple-choice question or keep it simple with a
                        single-choice item.
                      </Typography>
                    </Stack>
                  </Alert>
                ) : (
                  <Stack spacing={2.25}>
                    {quiz.questions.map((question, index) => (
                      <QuestionEditor
                        key={question.id}
                        question={question}
                        questionNumber={index + 1}
                        onUpdate={(updatedQuestion) =>
                          handleUpdateQuestion(index, updatedQuestion)
                        }
                        onDelete={() => handleDeleteQuestion(index)}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} xl={3.5}>
            <Stack spacing={2.5} sx={{ position: { xl: 'sticky' }, top: { xl: 104 } }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 6,
                  border: '1px solid rgba(30,57,50,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.98)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 2.25,
                    bgcolor: 'rgba(0,117,74,0.06)',
                    borderBottom: '1px solid rgba(30,57,50,0.08)',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-serif)',
                      color: 'var(--deep-slate)',
                    }}
                  >
                    Settings & Constraints
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Configure the values your backend already expects before you publish.
                  </Typography>
                </Box>

                <Stack spacing={2.25} sx={{ p: 2.5 }}>
                  <TextField
                    fullWidth
                    label="Time limit (minutes)"
                    type="number"
                    value={timeLimitMinutes}
                    onChange={(event) => {
                      setTimeLimitMinutes(parseInt(event.target.value, 10) || 30);
                      setIsDirty(true);
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Max attempts"
                    type="number"
                    value={maxAttempts}
                    onChange={(event) => {
                      setMaxAttempts(parseInt(event.target.value, 10) || 1);
                      setIsDirty(true);
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Max score"
                    type="number"
                    value={maxScore}
                    onChange={(event) => {
                      setMaxScore(parseInt(event.target.value, 10) || 100);
                      setIsDirty(true);
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Deadline date"
                    type="date"
                    value={deadlineAt}
                    onChange={(event) => {
                      setDeadlineAt(event.target.value);
                      setIsDirty(true);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 6,
                  border: '1px solid rgba(30,57,50,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.98)',
                }}
              >
                <Stack spacing={2.25} sx={{ p: 2.5 }}>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-serif)',
                        color: 'var(--deep-slate)',
                      }}
                    >
                      Publish Controls
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Save draft changes first, then publish or hide using the same backend
                      actions you already have.
                    </Typography>
                  </Box>

                  <Stack spacing={1.2}>
                    {actionSummary.map((item) => (
                      <Stack
                        key={item.label}
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        sx={{
                          p: 1.5,
                          borderRadius: 3,
                          bgcolor: 'rgba(246,242,235,0.82)',
                          border: '1px solid rgba(30,57,50,0.06)',
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2.5,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(0,117,74,0.08)',
                            color: 'var(--academy-green)',
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: 'var(--deep-slate)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.value}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>

                  <Divider />

                  <Stack spacing={1.25}>
                    <Button
                      variant="contained"
                      startIcon={<SaveRoundedIcon />}
                      onClick={handleSaveDraft}
                      disabled={saving || !isDirty}
                      fullWidth
                      sx={{ minHeight: 46 }}
                    >
                      {saving ? 'Saving...' : 'Save draft'}
                    </Button>

                    {quizId && isDraftStatus(quiz.status) && (
                      <Button
                        variant="outlined"
                        color="success"
                        startIcon={<PublishRoundedIcon />}
                        onClick={() => setPublishDialog(true)}
                        disabled={saving}
                        fullWidth
                        sx={{ minHeight: 46 }}
                      >
                        Publish quiz
                      </Button>
                    )}

                    {quizId && isPublishedStatus(quiz.status) && (
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<VisibilityOffRoundedIcon />}
                        onClick={() => setHideDialog(true)}
                        disabled={saving}
                        fullWidth
                        sx={{ minHeight: 46 }}
                      >
                        Hide quiz
                      </Button>
                    )}

                    {quizId && isHiddenStatus(quiz.status) && (
                      <Button
                        variant="outlined"
                        color="success"
                        startIcon={<PublishRoundedIcon />}
                        onClick={() => setPublishDialog(true)}
                        disabled={saving}
                        fullWidth
                        sx={{ minHeight: 46 }}
                      >
                        Publish again
                      </Button>
                    )}

                    {quizId && (isDraftStatus(quiz.status) || isHiddenStatus(quiz.status)) && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        onClick={() => setDeleteDialog(true)}
                        disabled={saving}
                        fullWidth
                        sx={{ minHeight: 46 }}
                      >
                        Delete quiz
                      </Button>
                    )}

                    <Button
                      variant="text"
                      onClick={() => navigate(workspacePath)}
                      fullWidth
                      sx={{ minHeight: 42 }}
                    >
                      Return to workspace
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}

      <Dialog open={publishDialog} onClose={() => setPublishDialog(false)}>
        <DialogTitle>Publish quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            Once published, students will be able to see and attempt this quiz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialog(false)}>Cancel</Button>
          <Button
            onClick={handlePublish}
            variant="contained"
            color="success"
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hideDialog} onClose={() => setHideDialog(false)}>
        <DialogTitle>Hide quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            Students will no longer see this quiz, but existing attempts remain available.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHideDialog(false)}>Cancel</Button>
          <Button
            onClick={handleHide}
            variant="contained"
            color="warning"
            disabled={saving}
          >
            {saving ? 'Hiding...' : 'Hide'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            This action cannot be undone. All questions and responses for this quiz will be
            removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={saving}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
