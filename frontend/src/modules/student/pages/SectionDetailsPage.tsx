import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Grid,
  Alert,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth, Navbar } from '../../shared';
import { academicService } from '../services/academicService';
import { quizService } from '../services/quizService';
import { Section, Quiz } from '../../shared/types';
import QuizCard from '../components/QuizCard';

export default function SectionDetailsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();

  const [section, setSection] = useState<Section | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!sectionId) return;

      try {
        setLoading(true);
        console.log('[SectionDetailsPage] ENTRY: sectionId=', sectionId);

        // Get section from enrolled sections
        const sections = await academicService.getEnrolledSections();
        const foundSection = sections.find((s) => s.sectionId === sectionId);
        if (!foundSection) {
          setError('Section not found');
          return;
        }
        console.log('[SectionDetailsPage] Found section:', foundSection);
        setSection(foundSection);

        // Get published quizzes for section
        const quizzesData = await quizService.getPublishedQuizzes(sectionId);
        console.log('[SectionDetailsPage] Fetched quizzes:', quizzesData.length, 'quizzes');
        setQuizzes(quizzesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load section');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sectionId]);

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
            <Alert severity="error">Section not found</Alert>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/student/dashboard')}
              sx={{ mt: 2 }}
            >
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
        <Box sx={{ py: 4 }}>
          {/* Header with back button */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/student/dashboard')}
                variant="outlined"
              >
                Back
              </Button>
              <Box>
                <Typography variant="h4">{section.sectionName}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                  Available Quizzes
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate(`/student/sections/${sectionId}/analytics`)}
            >
              📊 Analytics
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Quizzes Grid */}
          <Box>
            {console.log('[SectionDetailsPage.Grid] Rendering quizzes grid, count:', quizzes.length) || null}
            {quizzes.length === 0 ? (
              <Alert severity="info">No quizzes available in this section yet.</Alert>
            ) : (
              <Grid container spacing={3}>
                {quizzes.map((quiz) => {
                  console.log('[SectionDetailsPage.Grid.map] Rendering QuizCard for quiz:', {
                    quizId: quiz.id,
                    quizTitle: quiz.title,
                    sectionId: sectionId,
                  });
                  return (
                    <Grid item xs={12} sm={6} md={4} key={quiz.id}>
                      <QuizCard
                        quiz={quiz}
                        sectionId={sectionId || ''}
                        onStartQuiz={() => {
                          console.log('[SectionDetailsPage] onStartQuiz clicked for quiz:', quiz.id);
                          navigate(`/student/quiz/${quiz.id}/attempt`, { state: { sectionId } });
                        }}
                        onViewResult={() => {
                          console.log('[SectionDetailsPage] onViewResult clicked for quiz:', quiz.id);
                          navigate(`/student/quiz/${quiz.id}/results`, { state: { sectionId } });
                        }}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Box>
      </Container>
    </>
  );
}
