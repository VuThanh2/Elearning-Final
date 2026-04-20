import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import PageShell from '../../shared/components/PageShell';
import { useAuth } from '../../shared';
import { academicService } from '../services/academicService';
import { Section } from '../../shared/types';

type DashboardView = 'overview' | 'sections' | 'quizzes' | 'analytics';

const getDashboardView = (view: string | null): DashboardView => {
  if (view === 'sections' || view === 'quizzes' || view === 'analytics') return view;
  return 'overview';
};

export default function StudentDashboard() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const view = getDashboardView(searchParams.get('view'));
  const uniqueFaculties = new Set(sections.map((section) => section.facultyName).filter(Boolean)).size;
  const uniqueTerms = new Set(
    sections
      .map((section) => `${section.term || ''}-${section.academicYear || ''}`)
      .filter((value) => value !== '-')
  ).size;

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        const data = await academicService.getEnrolledSections();
        setSections(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sections');
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  const pageSubtitle =
    view === 'analytics'
      ? 'Jump into section analytics and track your progress faster.'
      : view === 'quizzes'
        ? 'Open a section and continue with quizzes or recent results.'
        : view === 'sections'
          ? 'Browse your enrolled sections and move into the right workspace.'
          : 'Track your courses, quizzes, and analytics';

  const heroLabel =
    view === 'analytics'
      ? 'Analytics workspace'
      : view === 'quizzes'
        ? 'Quiz workspace'
        : view === 'sections'
          ? 'Section directory'
          : 'Student overview';

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: React.ReactElement
  ) => (
    <Grid item xs={12} sm={6} md={4} key={title}>
      <Card
        sx={{
          height: '100%',
          borderRadius: 5,
          border: '1px solid rgba(148, 163, 184, 0.14)',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 4,
              bgcolor: 'rgba(15, 118, 110, 0.08)',
              color: '#0f766e',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {value}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderSectionCard = (section: Section, mode: DashboardView) => (
    <Grid item xs={12} sm={6} xl={4} key={section.sectionId}>
      <Card
        sx={{
          height: '100%',
          borderRadius: 5,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          transition: 'transform 180ms ease, box-shadow 180ms ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
          },
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Chip
                label={section.term && section.academicYear ? `${section.term} ${section.academicYear}` : 'Current'}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={mode === 'analytics' ? 'Insights' : mode === 'quizzes' ? 'Ready' : 'Enrolled'}
                size="small"
                color={mode === 'analytics' ? 'info' : 'success'}
                variant="outlined"
              />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
              {section.sectionName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 44 }}>
              {section.courseName} / {section.facultyName}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {section.courseCode && <Chip label={section.courseCode} size="small" variant="outlined" />}
              {section.sectionCode && <Chip label={section.sectionCode} size="small" variant="outlined" />}
            </Stack>
          </Stack>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate(`/student/sections/${section.sectionId}`)}
            sx={{ minHeight: 42, flex: '1 1 180px' }}
          >
            {mode === 'analytics' ? 'Review Section' : 'View Quizzes'}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate(`/student/sections/${section.sectionId}/analytics`)}
            sx={{ minHeight: 42, flex: '1 1 180px' }}
          >
            {mode === 'quizzes' ? 'See Results' : 'Analytics'}
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  if (loading) {
    return (
      <PageShell title="Student Dashboard" subtitle={`Welcome, ${state.user?.fullName || state.user?.email || 'student'}`}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  return (
    <PageShell title="Student Dashboard" subtitle={pageSubtitle}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 6,
          background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
          color: '#fff',
          boxShadow: '0 16px 40px rgba(15, 118, 110, 0.28)',
        }}
      >
        <Stack spacing={1}>
          <Chip
            label={heroLabel}
            size="small"
            sx={{ width: 'fit-content', bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }}
          />
          <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
            Welcome back, {state.user?.fullName || state.user?.email}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92, maxWidth: 760 }}>
            You are enrolled in {sections.length} section{sections.length === 1 ? '' : 's'}.
            {view === 'analytics'
              ? ' Open analytics for any section to review rankings, results, and recent submissions.'
              : view === 'quizzes'
                ? ' Pick a section to continue quizzes or revisit recent attempts.'
                : ' Open a section to start quizzes or review your progress.'}
          </Typography>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {renderStatCard('Enrolled Sections', sections.length, <SchoolRoundedIcon />)}
        {renderStatCard('Faculties', uniqueFaculties || 0, <InsightsRoundedIcon />)}
        {renderStatCard('Academic Terms', uniqueTerms || 0, <AnalyticsRoundedIcon />)}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {view === 'analytics' ? 'Section Analytics' : view === 'quizzes' ? 'Quiz Workspaces' : 'Your Enrolled Sections'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {view === 'analytics'
              ? 'Open a section analytics page to review rankings and quiz history.'
              : view === 'quizzes'
                ? 'Move directly into the section where you want to take or review quizzes.'
                : 'Choose a section to view quizzes and analytics.'}
          </Typography>
        </Box>
        <Chip label={`${sections.length} sections`} variant="outlined" />
      </Box>

      {sections.length === 0 ? (
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
                No enrolled sections yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Once you are added to a section, your quizzes and analytics shortcuts will appear here.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {sections.map((section) => renderSectionCard(section, view))}
        </Grid>
      )}

      {view === 'overview' && sections.length > 0 && (
        <Card
          sx={{
            mt: 3,
            borderRadius: 5,
            border: '1px solid rgba(148, 163, 184, 0.14)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                  Suggested next step
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 620 }}>
                  Start in the section with your next quiz, then open analytics after submission to compare your standing and performance trends.
                </Typography>
              </Grid>
              <Grid item xs={12} md={5}>
                <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<QuizRoundedIcon />}
                    onClick={() => navigate(`/student/sections/${sections[0].sectionId}`)}
                  >
                    Continue with quizzes
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AnalyticsRoundedIcon />}
                    onClick={() => navigate(`/student/sections/${sections[0].sectionId}/analytics`)}
                  >
                    Open analytics
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
