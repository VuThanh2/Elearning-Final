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
import {
  filterSectionsByQuery,
  normalizeSearchQuery,
} from '../../shared/utils/dashboardSearch';

type DashboardView = 'overview' | 'sections' | 'quizzes' | 'analytics';

const getDashboardView = (view: string | null): DashboardView => {
  if (view === 'sections' || view === 'quizzes' || view === 'analytics') return view;
  return 'overview';
};

const getAnalyticsNavigationState = (section: Section) => ({
  sectionName: section.sectionName,
  courseName: section.courseName,
  facultyName: section.facultyName,
  term: section.term,
  academicYear: section.academicYear,
});

export default function StudentDashboard() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const view = getDashboardView(searchParams.get('view'));
  const searchQuery = normalizeSearchQuery(searchParams.get('q'));
  const uniqueFaculties = new Set(sections.map((section) => section.facultyName).filter(Boolean)).size;
  const uniqueTerms = new Set(
    sections
      .map((section) => `${section.term || ''}-${section.academicYear || ''}`)
      .filter((value) => value !== '-')
  ).size;

  useEffect(() => {
    let active = true;

    const fetchSections = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await academicService.getEnrolledSections();
        if (!active) return;
        setSections(filterSectionsByQuery(data, searchQuery));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load sections');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchSections();
    return () => {
      active = false;
    };
  }, [searchQuery]);

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

  const heroTitle =
    view === 'analytics'
      ? 'See your sections through the lens of progress and feedback.'
      : view === 'quizzes'
        ? 'Move from section to quiz with a calmer, clearer workspace.'
        : view === 'sections'
          ? 'A warm academic directory for everything you are enrolled in.'
          : 'A learning dashboard designed to stay focused and encouraging.';

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: React.ReactElement
  ) => (
    <Grid item xs={12} sm={6} md={4} key={title}>
      <Card
        sx={{
          height: '100%',
          borderRadius: 4,
          border: '1px solid rgba(30,57,50,0.08)',
          boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 4,
              bgcolor: 'var(--mint-wash)',
              color: 'var(--academy-green)',
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
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
          border: '1px solid rgba(30,57,50,0.08)',
          transition: 'transform 180ms ease, box-shadow 180ms ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 18px 30px rgba(30,57,50,0.12)',
          },
        }}
      >
        <Box
          sx={{
            minHeight: 168,
            px: 2,
            py: 2,
            color: '#fff',
            background:
              mode === 'analytics'
                ? 'linear-gradient(145deg, #1E3932 0%, #2b5148 100%)'
                : mode === 'quizzes'
                  ? 'linear-gradient(145deg, #006241 0%, #00754A 100%)'
                  : 'linear-gradient(145deg, #2b5148 0%, #1E3932 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 30%)',
            }}
          />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            gap={1}
            sx={{ position: 'relative' }}
          >
            <Chip
              label={section.term && section.academicYear ? `${section.term} ${section.academicYear}` : 'Current'}
              size="small"
              sx={{
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.14)',
              }}
            />
            <Chip
              label={mode === 'analytics' ? 'Insights' : mode === 'quizzes' ? 'Ready' : 'Enrolled'}
              size="small"
              sx={{
                color: mode === 'analytics' ? 'var(--achievement-gold)' : '#fff',
                bgcolor: mode === 'analytics' ? 'rgba(203,162,88,0.14)' : 'rgba(255,255,255,0.12)',
              }}
            />
          </Stack>

          <Box sx={{ position: 'relative' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
              {section.courseCode || 'Course'}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                mt: 0.5,
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                lineHeight: 1.2,
                color: '#fff',
              }}
            >
              {section.sectionName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 1,
                color: 'rgba(255,255,255,0.72)',
                maxWidth: 280,
              }}
            >
              {section.courseName}
            </Typography>
          </Box>
        </Box>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 44 }}>
              {section.facultyName} / {section.sectionCode}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {section.courseCode && (
                <Chip
                  label={section.courseCode}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: 'rgba(30,57,50,0.12)' }}
                />
              )}
              {section.sectionCode && (
                <Chip
                  label={section.sectionCode}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: 'rgba(30,57,50,0.12)' }}
                />
              )}
            </Stack>
          </Stack>
        </CardContent>
        <Box
          sx={{
            height: 4,
            width: '100%',
            bgcolor: 'var(--ceramic)',
            '&::after': {
              content: '""',
              display: 'block',
              height: '100%',
              width: mode === 'analytics' ? '68%' : mode === 'quizzes' ? '82%' : '56%',
              bgcolor: mode === 'analytics' ? 'var(--academy-green)' : 'var(--action-green)',
            },
          }}
        />
        <CardActions sx={{ px: 2, py: 2, gap: 1, flexWrap: 'wrap' }}>
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
            onClick={() =>
              navigate(`/student/sections/${section.sectionId}/analytics`, {
                state: getAnalyticsNavigationState(section),
              })
            }
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
      <PageShell
        title="Student Dashboard"
        subtitle={`Welcome, ${state.user?.fullName || state.user?.email || 'student'}`}
        enableSearch
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  return (
    <PageShell title="Student Dashboard" subtitle={pageSubtitle} enableSearch>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          mb: 3,
          p: { xs: 3, md: 4 },
          borderRadius: 6,
          background:
            'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 28%), linear-gradient(145deg, #1E3932 0%, #2b5148 100%)',
          color: '#fff',
          boxShadow: '0 20px 38px rgba(30,57,50,0.18)',
        }}
      >
        <Stack spacing={1.5}>
          <Chip
            label={heroLabel}
            size="small"
            sx={{ width: 'fit-content', bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }}
          />
          <Typography
            variant="h3"
            sx={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              lineHeight: 1.1,
              color: '#fff',
              maxWidth: 820,
            }}
          >
            {heroTitle}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.84, maxWidth: 760 }}>
            Welcome back, {state.user?.fullName || state.user?.email}. You are enrolled in {sections.length} section{sections.length === 1 ? '' : 's'}.
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
        <Chip
          label={
            searchQuery
              ? `${sections.length} result${sections.length === 1 ? '' : 's'}`
              : `${sections.length} sections`
          }
          variant="outlined"
        />
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
                {searchQuery ? 'No matching sections found' : 'No enrolled sections yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery
                  ? 'Try a different keyword for section name, course code, faculty, or term.'
                  : 'Once you are added to a section, your quizzes and analytics shortcuts will appear here.'}
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
            border: '1px solid rgba(30,57,50,0.08)',
            boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,1) 100%)',
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
                    onClick={() =>
                      navigate(`/student/sections/${sections[0].sectionId}/analytics`, {
                        state: getAnalyticsNavigationState(sections[0]),
                      })
                    }
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
