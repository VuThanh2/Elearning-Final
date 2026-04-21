import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import PageShell from '../../shared/components/PageShell';
import { useNotification } from '../../shared';
import { academicService } from '../../student/services/academicService';
import { quizService } from '../services/quizService';
import { Section, Quiz } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';

const getStatusLabel = (status: string) => {
  const normalized = String(status || 'DRAFT').toUpperCase();
  if (normalized === 'PUBLISHED') return 'Published';
  if (normalized === 'HIDDEN') return 'Hidden';
  if (normalized === 'EXPIRED') return 'Expired';
  return 'Draft';
};

const getStatusColor = (
  status: string
): 'default' | 'warning' | 'success' | 'error' => {
  const normalized = String(status || 'DRAFT').toUpperCase();
  if (normalized === 'PUBLISHED') return 'success';
  if (normalized === 'HIDDEN') return 'warning';
  if (normalized === 'EXPIRED') return 'error';
  return 'default';
};

export default function TeacherSectionDetailsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [section, setSection] = useState<Section | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishDialog, setPublishDialog] = useState<{ open: boolean; quizId: string | null }>({
    open: false,
    quizId: null,
  });
  const [hideDialog, setHideDialog] = useState<{ open: boolean; quizId: string | null }>({
    open: false,
    quizId: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; quizId: string | null }>({
    open: false,
    quizId: null,
  });

  const refreshSectionData = async (targetSectionId: string) => {
    const sections = await academicService.getTeachingSections();
    const foundSection = sections.find((item) => item.sectionId === targetSectionId);

    if (!foundSection) {
      throw new Error('Section not found');
    }

    const quizzesData = await quizService.getSectionQuizzes(targetSectionId);
    setSection(foundSection);
    setQuizzes(quizzesData);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!sectionId) {
        setError('No section ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await refreshSectionData(sectionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load section');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sectionId]);

  const handlePublish = async () => {
    if (!publishDialog.quizId || !sectionId) return;

    try {
      await quizService.publishQuiz(publishDialog.quizId);
      showNotification('Quiz published successfully', 'success');
      setPublishDialog({ open: false, quizId: null });
      await refreshSectionData(sectionId);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to publish quiz', 'error');
    }
  };

  const handleHide = async () => {
    if (!hideDialog.quizId || !sectionId) return;

    try {
      await quizService.hideQuiz(hideDialog.quizId);
      showNotification('Quiz hidden successfully', 'success');
      setHideDialog({ open: false, quizId: null });
      await refreshSectionData(sectionId);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to hide quiz', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.quizId || !sectionId) return;

    try {
      await quizService.deleteQuiz(deleteDialog.quizId);
      showNotification('Quiz deleted successfully', 'success');
      setDeleteDialog({ open: false, quizId: null });
      await refreshSectionData(sectionId);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to delete quiz', 'error');
    }
  };

  const publishedCount = quizzes.filter((quiz) => String(quiz.status).toUpperCase() === 'PUBLISHED').length;
  const hiddenCount = quizzes.filter((quiz) => String(quiz.status).toUpperCase() === 'HIDDEN').length;
  const draftCount = quizzes.filter((quiz) => String(quiz.status).toUpperCase() === 'DRAFT').length;

  if (loading) {
    return (
      <PageShell
        title="Section Workspace"
        subtitle="Loading quiz management tools for this section"
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  if (!section) {
    return (
      <PageShell title="Section Workspace" subtitle="Unable to load this teaching section">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Section not found'}
        </Alert>
        <Button onClick={() => navigate('/teacher/dashboard')} variant="contained">
          Back to Dashboard
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={section.sectionName}
      subtitle="Manage quizzes, publishing, and section analytics from one workspace"
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card
        sx={{
          mb: 3,
          borderRadius: 6,
          border: '1px solid rgba(148, 163, 184, 0.14)',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.08) 0%, rgba(255,255,255,0.96) 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
              <Box>
                <Button
                  startIcon={<ArrowBackIcon />}
                  variant="outlined"
                  onClick={() => navigate('/teacher/dashboard')}
                  sx={{ mb: 2 }}
                >
                  Back to dashboard
                </Button>
                <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  {section.sectionName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {section.courseName} / {section.facultyName}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {section.sectionCode && <Chip label={section.sectionCode} variant="outlined" />}
                {section.courseCode && <Chip label={section.courseCode} variant="outlined" />}
                {section.facultyCode && <Chip label={section.facultyCode} variant="outlined" />}
                <Chip
                  label={section.term && section.academicYear ? `${section.term} ${section.academicYear}` : 'Current'}
                  color="primary"
                  variant="outlined"
                />
              </Stack>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Total Quizzes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {quizzes.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Published
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'success.main' }}>
                      {publishedCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Drafts
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {draftCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Hidden
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'warning.main' }}>
                      {hiddenCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Quiz inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create, publish, hide, or delete quizzes without leaving this section workspace.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            onClick={() => navigate(`/teacher/quiz/new?sectionId=${section.sectionId}`)}
          >
            Create quiz
          </Button>
          <Button
            startIcon={<AnalyticsRoundedIcon />}
            variant="outlined"
            onClick={() => navigate(`/teacher/sections/${section.sectionId}/analytics`)}
          >
            Open analytics
          </Button>
        </Stack>
      </Box>

      {quizzes.length === 0 ? (
        <Card
          sx={{
            borderRadius: 5,
            border: '1px solid rgba(148, 163, 184, 0.14)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                No quizzes in this section yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
                Start with a draft quiz for this section, then come back here to publish it or open section analytics after students submit attempts.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/teacher/quiz/new?sectionId=${section.sectionId}`)}
                >
                  Create first quiz
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/teacher/sections/${section.sectionId}/analytics`)}
                >
                  View analytics
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {quizzes.map((quiz) => {
            const normalizedStatus = String(quiz.status || 'DRAFT').toUpperCase();

            return (
              <Grid item xs={12} md={6} xl={4} key={quiz.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 5,
                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
                    border: '1px solid rgba(148, 163, 184, 0.14)',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                        <Chip
                          label={getStatusLabel(quiz.status)}
                          color={getStatusColor(quiz.status)}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${quiz.totalQuestions ?? quiz.questions?.length ?? 0} questions`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                        {quiz.title || 'Untitled quiz'}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 44 }}>
                        {quiz.description || 'No description provided.'}
                      </Typography>

                      <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Time limit
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {quiz.timeLimitMinutes} min
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Attempts
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {quiz.maxAttempts}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Max score
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {quiz.maxScore}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Deadline
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: new Date(quiz.deadlineAt) < new Date() ? 'error.main' : 'text.primary',
                            }}
                          >
                            {formatters.formatDate(new Date(quiz.deadlineAt))}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      <Button
                        fullWidth
                        variant={normalizedStatus === 'DRAFT' ? 'contained' : 'outlined'}
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/teacher/quiz/${quiz.id}/edit`)}
                      >
                        {normalizedStatus === 'DRAFT' ? 'Continue editing' : 'Edit quiz'}
                      </Button>

                      {normalizedStatus === 'DRAFT' && (
                        <Button
                          fullWidth
                          startIcon={<PlayArrowIcon />}
                          color="success"
                          variant="outlined"
                          onClick={() => setPublishDialog({ open: true, quizId: quiz.id })}
                        >
                          Publish
                        </Button>
                      )}

                      {normalizedStatus === 'PUBLISHED' && (
                        <Button
                          fullWidth
                          startIcon={<VisibilityOffIcon />}
                          color="warning"
                          variant="outlined"
                          onClick={() => setHideDialog({ open: true, quizId: quiz.id })}
                        >
                          Hide quiz
                        </Button>
                      )}

                      {normalizedStatus === 'HIDDEN' && (
                        <Button
                          fullWidth
                          startIcon={<PlayArrowIcon />}
                          color="success"
                          variant="outlined"
                          onClick={() => setPublishDialog({ open: true, quizId: quiz.id })}
                        >
                          Publish again
                        </Button>
                      )}

                      {(normalizedStatus === 'DRAFT' || normalizedStatus === 'HIDDEN') && (
                        <Button
                          fullWidth
                          startIcon={<DeleteIcon />}
                          color="error"
                          variant="outlined"
                          onClick={() => setDeleteDialog({ open: true, quizId: quiz.id })}
                        >
                          Delete quiz
                        </Button>
                      )}
                    </Stack>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={publishDialog.open} onClose={() => setPublishDialog({ open: false, quizId: null })}>
        <DialogTitle>Publish quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            Students will be able to see and attempt this quiz after publishing.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialog({ open: false, quizId: null })}>Cancel</Button>
          <Button onClick={handlePublish} variant="contained" color="success">
            Publish
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hideDialog.open} onClose={() => setHideDialog({ open: false, quizId: null })}>
        <DialogTitle>Hide quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            Students will no longer see this quiz, but past attempts remain available for analytics.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHideDialog({ open: false, quizId: null })}>Cancel</Button>
          <Button onClick={handleHide} variant="contained" color="warning">
            Hide
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, quizId: null })}>
        <DialogTitle>Delete quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            This action cannot be undone. All quiz content and attempts for this quiz will be removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, quizId: null })}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
