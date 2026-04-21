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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PageShell from '../../shared/components/PageShell';
import { useAuth, useNotification } from '../../shared';
import { academicService } from '../../student/services/academicService';
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

export default function TeacherDashboard() {
  const { state } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);

  const view = getDashboardView(searchParams.get('view'));
  const searchQuery = normalizeSearchQuery(searchParams.get('q'));
  const uniqueCourses = new Set(sections.map((section) => section.courseName).filter(Boolean)).size;
  const uniqueFaculties = new Set(sections.map((section) => section.facultyName).filter(Boolean)).size;

  useEffect(() => {
    let active = true;

    const fetchSections = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await academicService.getTeachingSections();
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

  const handleCreateQuiz = (sectionId?: string) => {
    if (sectionId) {
      navigate(`/teacher/quiz/new?sectionId=${sectionId}`);
      return;
    }

    if (sections.length === 0) {
      showNotification('No teaching sections available yet', 'info');
      return;
    }

    if (sections.length === 1) {
      navigate(`/teacher/quiz/new?sectionId=${sections[0].sectionId}`);
      return;
    }

    setSectionPickerOpen(true);
  };

  const pageSubtitle =
    view === 'analytics'
      ? 'Jump directly into section analytics and identify students who need attention.'
      : view === 'quizzes'
        ? 'Open the right quiz workspace for each section and publish faster.'
        : view === 'sections'
          ? 'Browse your active teaching sections and move into the right workspace.'
          : 'Manage teaching sections, quizzes, and analytics';

  const heroLabel =
    view === 'analytics'
      ? 'Analytics workspace'
      : view === 'quizzes'
        ? 'Quiz workspace'
        : view === 'sections'
          ? 'Section directory'
          : 'Teaching overview';

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
                label={mode === 'analytics' ? 'Insights' : mode === 'quizzes' ? 'Quiz room' : 'Active'}
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
            onClick={() =>
              mode === 'analytics'
                ? navigate(`/teacher/sections/${section.sectionId}/analytics`)
                : navigate(`/teacher/sections/${section.sectionId}`)
            }
            sx={{ minHeight: 42, flex: '1 1 180px' }}
          >
            {mode === 'analytics' ? 'Open Analytics' : 'Manage Quizzes'}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() =>
              mode === 'quizzes'
                ? handleCreateQuiz(section.sectionId)
                : navigate(`/teacher/sections/${section.sectionId}/analytics`)
            }
            sx={{ minHeight: 42, flex: '1 1 180px' }}
          >
            {mode === 'quizzes' ? 'Create Quiz' : 'Analytics'}
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  if (loading) {
    return (
      <PageShell
        title="Teacher Dashboard"
        subtitle={`Welcome, ${state.user?.fullName || state.user?.email || 'teacher'}`}
        enableSearch
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Teacher Dashboard"
      subtitle={pageSubtitle}
      enableSearch
    >
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
            You are currently teaching {sections.length} section{sections.length === 1 ? '' : 's'}.
            {view === 'analytics'
              ? ' Open analytics to review completion, average score, and students at risk.'
              : view === 'quizzes'
                ? ' Move into the right section to create, edit, publish, or hide quizzes.'
                : ' Choose a section to manage quizzes or inspect performance trends.'}
          </Typography>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {renderStatCard('Teaching Sections', sections.length, <SchoolRoundedIcon />)}
        {renderStatCard('Courses', uniqueCourses || 0, <QuizRoundedIcon />)}
        {renderStatCard('Faculties', uniqueFaculties || 0, <AutoAwesomeRoundedIcon />)}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {view === 'analytics' ? 'Section Analytics' : view === 'quizzes' ? 'Quiz Workspaces' : 'Your Teaching Sections'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {view === 'analytics'
              ? 'Open analytics for a section to review performance and risk signals.'
              : view === 'quizzes'
                ? 'Open a section to manage existing quizzes or create a new one.'
                : 'Choose the section where you want to manage quizzes and analytics.'}
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
                {searchQuery ? 'No matching teaching sections found' : 'No teaching sections yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery
                  ? 'Try a different keyword for section name, course code, faculty, or term.'
                  : 'Once sections are assigned to you, this dashboard will become the control room for quiz creation and analytics.'}
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
                  Start from the section you plan to teach next, create a draft quiz there, then review analytics after the first submissions arrive.
                </Typography>
              </Grid>
              <Grid item xs={12} md={5}>
                <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<QuizRoundedIcon />}
                    onClick={() => navigate(`/teacher/sections/${sections[0].sectionId}`)}
                  >
                    Open quiz management
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AnalyticsRoundedIcon />}
                    onClick={() => navigate(`/teacher/sections/${sections[0].sectionId}/analytics`)}
                  >
                    Open analytics
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Dialog open={sectionPickerOpen} onClose={() => setSectionPickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Select a section</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {sections.map((section) => (
              <Card
                key={section.sectionId}
                sx={{
                  borderRadius: 4,
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ pb: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {section.sectionName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {section.courseName} / {section.facultyName}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => {
                        setSectionPickerOpen(false);
                        handleCreateQuiz(section.sectionId);
                      }}
                    >
                      Create quiz here
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionPickerOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
