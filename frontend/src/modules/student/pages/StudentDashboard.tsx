import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
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
} from '@mui/material';
import { useAuth } from '../../shared';
import PageShell from '../../shared/components/PageShell';
import { academicService } from '../services/academicService';
import { Section } from '../../shared/types';

export default function StudentDashboard() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <PageShell title="Student Dashboard" subtitle="Track your courses, quizzes, and analytics">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, p: 3, borderRadius: 4, bgcolor: '#0f766e', color: '#fff' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Welcome back, {state.user?.fullName || state.user?.email}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          You are enrolled in {sections.length} section{sections.length === 1 ? '' : 's'}.
        </Typography>
      </Box>

      <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>
        Your Enrolled Sections ({sections.length})
      </Typography>

      {sections.length === 0 ? (
        <Alert severity="info">You are not enrolled in any sections yet.</Alert>
      ) : (
        <Grid container spacing={3}>
          {sections.map((section) => (
            <Grid item xs={12} sm={6} md={4} key={section.sectionId}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
                <CardContent>
                  <Chip label={section.term && section.academicYear ? `${section.term} ${section.academicYear}` : 'Current'} size="small" color="primary" variant="outlined" sx={{ mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    {section.sectionName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {section.courseName} / {section.facultyName}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button fullWidth variant="contained" onClick={() => navigate(`/student/sections/${section.sectionId}`)}>
                    View Quizzes
                  </Button>
                  <Button fullWidth variant="outlined" onClick={() => navigate(`/student/sections/${section.sectionId}/analytics`)}>
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
