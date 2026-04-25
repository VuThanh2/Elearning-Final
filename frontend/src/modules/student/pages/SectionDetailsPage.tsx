import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import PageShell from '../../shared/components/PageShell';
import { useAuth } from '../../shared';
import { academicService } from '../services/academicService';
import { quizService } from '../services/quizService';
import { Section, Quiz } from '../../shared/types';

export default function SectionDetailsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const analyticsNavigationState = section
    ? {
        sectionName: section.sectionName,
        courseName: section.courseName,
        facultyName: section.facultyName,
        term: section.term,
        academicYear: section.academicYear,
      }
    : undefined;

  useEffect(() => {
    const fetchSection = async () => {
      if (!sectionId) {
        setError('Section ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const sections = await academicService.getEnrolledSections();
        const currentSection = sections.find((item) => item.sectionId === sectionId) || null;
        setSection(currentSection);

        const quizData = await quizService.getPublishedQuizzes(sectionId);
        setQuizzes(quizData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load section details');
      } finally {
        setLoading(false);
      }
    };

    fetchSection();
  }, [sectionId]);

  if (loading) {
    return (
      <PageShell title="Section Details" subtitle="Explore quizzes and analytics for your class">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  return (
    <PageShell title="Section Details" subtitle="Explore quizzes and analytics for your class">
      <Card
        sx={{
          mb: 3,
          borderRadius: 6,
          overflow: 'hidden',
          color: '#fff',
          background:
            'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 26%), linear-gradient(145deg, #1E3932 0%, #2b5148 100%)',
          boxShadow: '0 20px 38px rgba(30,57,50,0.18)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                startIcon={<ArrowBackIcon />}
                variant="contained"
                onClick={() => navigate(-1)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.14)',
                  color: '#fff',
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.22)',
                    boxShadow: 'none',
                  },
                }}
              >
                Back
              </Button>
              {section?.term && section?.academicYear && (
                <Chip
                  label={`${section.term} ${section.academicYear}`}
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }}
                />
              )}
            </Stack>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: '#fff',
                  overflowWrap: 'anywhere',
                }}
              >
                {section?.sectionName || 'Section'}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, color: 'rgba(255,255,255,0.74)' }}>
                {section?.courseName} / {section?.facultyName}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {section && (
        <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Enrolled section</Typography>
                <Typography variant="h5" sx={{ fontFamily: 'var(--font-ui)', fontWeight: 800, mb: 1, overflowWrap: 'anywhere' }}>{section.sectionName}</Typography>
                <Typography variant="body2" color="text.secondary">Student: {state.user?.fullName || state.user?.email}</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {section.sectionCode && <Chip label={section.sectionCode} color="primary" variant="outlined" />}
                {section.courseCode && <Chip label={section.courseCode} variant="outlined" />}
                {section.facultyCode && <Chip label={section.facultyCode} variant="outlined" />}
                <Chip label={section.term && section.academicYear ? `${section.term} ${section.academicYear}` : 'Current'} variant="outlined" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Available Quizzes</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{quizzes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Ready to Start</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>{quizzes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Available Quizzes</Typography>
          <Typography variant="body2" color="text.secondary">Start a quiz or review your analytics.</Typography>
        </Box>
      </Box>

      {quizzes.length === 0 ? (
        <Alert severity="info">No quizzes available yet.</Alert>
      ) : (
        <Grid container spacing={3}>
          {quizzes.map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz.quizId}>
              <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)', height: '100%' }}>
                <Box
                  sx={{
                    minHeight: 148,
                    px: 2,
                    py: 2,
                    color: '#fff',
                    background:
                      'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 30%), linear-gradient(145deg, #006241 0%, #00754A 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Chip label="Available" size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.14)' }} />
                    {quiz.maxAttempts ? <Chip label={`${quiz.maxAttempts} attempts`} size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }} /> : null}
                  </Stack>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                      {quiz.timeLimitMinutes || 0} min learning window
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        mt: 0.5,
                        fontFamily: 'var(--font-ui)',
                        fontWeight: 800,
                        color: '#fff',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {quiz.title || 'Untitled quiz'}
                    </Typography>
                  </Box>
                </Box>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>{quiz.description || 'No description provided.'}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip label={`${quiz.timeLimitMinutes || 0} min`} size="small" />
                      <Chip label={`${quiz.totalQuestions ?? quiz.questions?.length ?? 0} questions`} size="small" />
                    </Stack>
                  </Stack>
                </CardContent>
                <Box sx={{ height: 4, bgcolor: 'var(--ceramic)' }}>
                  <Box sx={{ width: '76%', height: '100%', bgcolor: 'var(--action-green)' }} />
                </Box>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button fullWidth variant="contained" startIcon={<PlayArrowIcon />} onClick={() => navigate(`/student/quiz/${quiz.quizId}/attempt`)}>
                    Start Quiz
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AssessmentOutlinedIcon />}
                    onClick={() =>
                      navigate(`/student/sections/${sectionId}/analytics`, {
                        state: analyticsNavigationState,
                      })
                    }
                  >
                    Analytics
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </PageShell>
  );
}
