import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth, Navbar, useNotification } from '../../shared';
import { academicService } from '../../student/services/academicService';
import { quizService } from '../services/quizService';
import { Section, Quiz } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';

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

  useEffect(() => {
    const fetchData = async () => {
      if (!sectionId) {
        setError('No section ID provided');
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching teaching sections...');

        // Get section from teaching sections
        const sections = await academicService.getTeachingSections();
        console.log('Sections fetched:', sections);

        const foundSection = sections.find((s) => s.sectionId === sectionId);
        if (!foundSection) {
          console.error('Section not found. Looking for ID:', sectionId);
          console.error('Available sections:', sections.map(s => ({ sectionId: s.sectionId, sectionName: s.sectionName })));
          setError('Section not found');
          return;
        }

        setSection(foundSection);

        // Get all quizzes (Draft, Published, Hidden)
        console.log('Fetching quizzes for section:', sectionId);
        const quizzesData = await quizService.getSectionQuizzes(sectionId);
        console.log('Quizzes fetched:', quizzesData);
        setQuizzes(quizzesData);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load section';
        console.error('Error loading section data:', err);
        console.error('Error details:', {
          message: errorMsg,
          stack: err instanceof Error ? err.stack : 'N/A',
        });
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sectionId]);

  const handlePublish = async () => {
    if (!publishDialog.quizId) return;

    try {
      await quizService.publishQuiz(publishDialog.quizId);
      showNotification('Quiz published successfully!', 'success');
      setPublishDialog({ open: false, quizId: null });

      // Refresh quizzes
      const quizzesData = await quizService.getSectionQuizzes(sectionId!);
      setQuizzes(quizzesData);
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Failed to publish quiz',
        'error'
      );
    }
  };

  const handleHide = async () => {
    if (!hideDialog.quizId) return;

    try {
      await quizService.hideQuiz(hideDialog.quizId);
      showNotification('Quiz hidden successfully!', 'success');
      setHideDialog({ open: false, quizId: null });

      // Refresh quizzes
      const quizzesData = await quizService.getSectionQuizzes(sectionId!);
      setQuizzes(quizzesData);
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Failed to hide quiz',
        'error'
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.quizId) return;

    try {
      await quizService.deleteQuiz(deleteDialog.quizId);
      showNotification('Quiz deleted successfully!', 'success');
      setDeleteDialog({ open: false, quizId: null });

      // Refresh quizzes
      const quizzesData = await quizService.getSectionQuizzes(sectionId!);
      setQuizzes(quizzesData);
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Failed to delete quiz',
        'error'
      );
    }
  };

  const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'error' => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'PUBLISHED':
        return 'success';
      case 'HIDDEN':
        return 'warning';
      case 'EXPIRED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'DRAFT':
        return '📝 Draft';
      case 'PUBLISHED':
        return '🟢 Published';
      case 'HIDDEN':
        return '🔒 Hidden';
      case 'EXPIRED':
        return '⏰ Expired';
      default:
        return status;
    }
  };

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

  if (!section) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg">
          <Box sx={{ py: 4 }}>
            <Alert severity="error">{error || 'Section not found'}</Alert>
            <Button onClick={() => navigate('/teacher/dashboard')} sx={{ mt: 2 }}>
              Back to Dashboard
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
          {/* Header */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/teacher/dashboard')}
              variant="outlined"
            >
              Back
            </Button>
            <Box>
              <Typography variant="h4">{section.sectionName}</Typography>
              <Typography variant="body2" color="textSecondary">
                Manage Quizzes
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Quizzes Grid */}
          {quizzes.length === 0 ? (
            <Alert severity="info">No quizzes yet. Create your first quiz!</Alert>
          ) : (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {quizzes.map((quiz) => (
                <Grid item xs={12} sm={6} md={4} key={quiz.id}>
                  <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* Title */}
                      <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                        {quiz.title}
                      </Typography>

                      {/* Description */}
                      {quiz.description && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {quiz.description.length > 80
                            ? quiz.description.substring(0, 80) + '...'
                            : quiz.description}
                        </Typography>
                      )}

                      {/* Status Badge */}
                      <Chip
                        label={getStatusLabel(quiz.status)}
                        color={getStatusColor(quiz.status)}
                        size="small"
                        sx={{ mb: 2 }}
                      />

                      {/* Details */}
                      <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                        ⏱️ {quiz.timeLimitMinutes} min
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                        📊 {quiz.maxScore} points
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                        🔄 Max {quiz.maxAttempts} attempts
                      </Typography>
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{
                          color:
                            new Date(quiz.deadlineAt) < new Date() ? 'error.main' : 'textSecondary',
                        }}
                      >
                        📅 {formatters.formatDate(new Date(quiz.deadlineAt))}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ flexDirection: 'column', gap: 1 }}>
                      {/* Edit Button (Draft only) */}
                      {(quiz.status === 'DRAFT' || quiz.status === 'Draft') && (
                        <Button
                          size="small"
                          fullWidth
                          startIcon={<EditIcon />}
                          onClick={() => navigate(`/teacher/quiz/${quiz.id}/edit`)}
                          variant="outlined"
                        >
                          Edit
                        </Button>
                      )}

                      {/* Delete Button (Visible for DRAFT and HIDDEN) */}
                      {(quiz.status === 'DRAFT' || quiz.status === 'Draft' || quiz.status === 'HIDDEN' || quiz.status === 'Hidden') ? (
                        <Button
                          size="small"
                          fullWidth
                          startIcon={<DeleteIcon />}
                          color="error"
                          variant="outlined"
                          onClick={() => setDeleteDialog({ open: true, quizId: quiz.id })}
                        >
                          Delete Quiz
                        </Button>
                      ) : null}

                      {/* Publish Button (Draft only) */}
                      {(quiz.status === 'DRAFT' || quiz.status === 'Draft') && (
                        <Button
                          size="small"
                          fullWidth
                          startIcon={<PlayArrowIcon />}
                          color="success"
                          variant="contained"
                          onClick={() => setPublishDialog({ open: true, quizId: quiz.id })}
                        >
                          Publish
                        </Button>
                      )}

                      {/* Hide Button (Published only) */}
                      {(quiz.status === 'PUBLISHED' || quiz.status === 'Published') && (
                        <Button
                          size="small"
                          fullWidth
                          startIcon={<VisibilityOffIcon />}
                          color="warning"
                          variant="outlined"
                          onClick={() => setHideDialog({ open: true, quizId: quiz.id })}
                        >
                          Hide
                        </Button>
                      )}

                      {/* Analytics Button (Published only) */}
                      {quiz.status === 'PUBLISHED' && (
                        <Button
                          size="small"
                          fullWidth
                          startIcon={<AnalyticsIcon />}
                          variant="outlined"
                          onClick={() =>
                            navigate(`/teacher/quiz/${quiz.id}/analytics`, {
                              state: { sectionId },
                            })
                          }
                        >
                          Analytics
                        </Button>
                      )}

                      {/* Preview/Edit Button (Published/Hidden only) */}
                      {(quiz.status === 'PUBLISHED' || quiz.status === 'Published' || quiz.status === 'HIDDEN' || quiz.status === 'Hidden') && (
                        <Button
                          size="small"
                          fullWidth
                          onClick={() => navigate(`/teacher/quiz/${quiz.id}/edit`)}
                          variant="outlined"
                        >
                          Edit/Preview
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Create Quiz FAB */}
          <Fab
            color="primary"
            aria-label="create quiz"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
            onClick={() => navigate(`/teacher/quiz/new?sectionId=${sectionId}`)}
          >
            <AddIcon />
          </Fab>

          {/* Publish Dialog */}
          <Dialog open={publishDialog.open} onClose={() => setPublishDialog({ open: false, quizId: null })}>
            <DialogTitle>Publish Quiz?</DialogTitle>
            <DialogContent>
              <Typography>
                Once published, students will be able to see and take this quiz. Make sure all
                questions and options are correct before publishing.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPublishDialog({ open: false, quizId: null })}>
                Cancel
              </Button>
              <Button onClick={handlePublish} variant="contained" color="success">
                Publish
              </Button>
            </DialogActions>
          </Dialog>

          {/* Hide Dialog */}
          <Dialog open={hideDialog.open} onClose={() => setHideDialog({ open: false, quizId: null })}>
            <DialogTitle>Hide Quiz?</DialogTitle>
            <DialogContent>
              <Typography>
                Students will not be able to see this quiz anymore. Existing attempts will still
                be graded.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setHideDialog({ open: false, quizId: null })}>
                Cancel
              </Button>
              <Button onClick={handleHide} variant="contained" color="warning">
                Hide
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Dialog */}
          <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, quizId: null })}>
            <DialogTitle>Delete Quiz?</DialogTitle>
            <DialogContent>
              <Typography>
                This action cannot be undone. All questions and responses will be permanently deleted.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialog({ open: false, quizId: null })}>
                Cancel
              </Button>
              <Button onClick={handleDelete} variant="contained" color="error">
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </>
  );
}
