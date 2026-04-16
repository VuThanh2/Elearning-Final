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
import { formatters } from '../../shared/utils/formatters';

export default function SectionDetailsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {section?.sectionName || 'Section'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {section?.courseName} / {section?.facultyName}
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {section && (
        <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Enrolled section</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>{section.sectionName}</Typography>
                <Typography variant="body2" color="text.secondary">Student: {state.user?.fullName || state.user?.email}</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={section.sectionCode} color="primary" variant="outlined" />
                <Chip label={section.courseCode} variant="outlined" />
                <Chip label={section.facultyCode} variant="outlined" />
                <Chip label={section.term && section.academicYear ? `${section.term} ${section.academicYear}` : 'Current'} variant="outlined" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Quizzes</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{quizzes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Published</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>{quizzes.filter((q) => String(q.status).toUpperCase() === 'PUBLISHED').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Upcoming</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>{quizzes.length}</Typography>
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
        <Alert severity="info">No published quizzes available yet.</Alert>
      ) : (
        <Grid container spacing={3}>
          {quizzes.map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz.quizId}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Chip label={String(quiz.status)} size="small" color="primary" variant="outlined" sx={{ width: 'fit-content' }} />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{quiz.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>{quiz.description || 'No description provided.'}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip label={`${quiz.timeLimitMinutes} min`} size="small" />
                      <Chip label={`${quiz.maxAttempts} attempts`} size="small" />
                      <Chip label={formatters.formatScore(quiz.maxScore, quiz.maxScore)} size="small" />
                    </Stack>
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button fullWidth variant="contained" startIcon={<PlayArrowIcon />} onClick={() => navigate(`/student/quiz/${quiz.quizId}/attempt`)}>
                    Start Quiz
                  </Button>
                  <Button fullWidth variant="outlined" startIcon={<AssessmentOutlinedIcon />} onClick={() => navigate(`/student/sections/${sectionId}/analytics`)}>
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
