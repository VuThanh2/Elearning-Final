import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Paper,
  Chip,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth, Navbar } from '../../shared';
import { analyticsService } from '../services/analyticsService';
import { StudentClassRanking, StudentQuizResult } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';

export default function StudentAnalyticsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rankings, setRankings] = useState<StudentClassRanking[]>([]);
  const [myResults, setMyResults] = useState<StudentQuizResult[]>([]);
  const [myRank, setMyRank] = useState<StudentClassRanking | null>(null);

  const [stats, setStats] = useState({
    totalQuizzes: 0,
    completedQuizzes: 0,
    passedQuizzes: 0,
    averageScore: 0,
    passRate: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!sectionId) {
        setError('Section ID not found');
        return;
      }

      try {
        setLoading(true);

        // Fetch class rankings
        const rankingsData = await analyticsService.getMyClassRanking(sectionId);
        setRankings(rankingsData);

        // Find my ranking
        const myRanking = rankingsData.find((r) => r.studentId === state.user?.id);
        setMyRank(myRanking || null);

        // Fetch my results
        const resultsData = await analyticsService.getMyResults(sectionId);
        setMyResults(resultsData);

        // Calculate stats
        const completedCount = resultsData.length;
        const passedCount = resultsData.filter((r) => (r.percentage || 0) >= 60).length;
        const avgScore =
          completedCount > 0
            ? resultsData.reduce((sum, r) => sum + ((r.percentage || 0) / 100) * (r.score || 0), 0) /
              completedCount
            : 0;

        setStats({
          totalQuizzes: resultsData.length,
          completedQuizzes: completedCount,
          passedQuizzes: passedCount,
          averageScore: avgScore,
          passRate: (passedCount / (completedCount || 1)) * 100,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load analytics';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [sectionId, state.user?.id]);

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

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          {/* Header with Back Button */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              variant="outlined"
            >
              Back
            </Button>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                My Analytics
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Performance overview and class ranking
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Performance Stats Grid */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {/* Total Quizzes */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Quizzes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.totalQuizzes}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Completed */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Completed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {stats.completedQuizzes}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Passed */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Passed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {stats.passedQuizzes}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Average Score */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Average Score
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {formatters.formatPercentage(stats.averageScore, 1)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* My Ranking Card */}
          {myRank && (
            <Card sx={{ mb: 4, backgroundColor: '#f0f7ff', border: '2px solid #2196f3' }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Your Class Ranking
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      #{myRank.rank}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {myRank.score}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Percentile
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {formatters.formatPercentage(myRank.percentile, 1)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Class Rankings Table */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Class Rankings
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Score
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Percentile
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankings && rankings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No ranking data available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rankings?.map((ranking) => (
                    <TableRow
                      key={ranking.studentId}
                      sx={{
                        backgroundColor: ranking.studentId === state.user?.id ? '#f0f7ff' : 'inherit',
                        '&:hover': {
                          backgroundColor: ranking.studentId === state.user?.id ? '#e3f2fd' : '#fafafa',
                        },
                        fontWeight: ranking.studentId === state.user?.id ? 700 : 400,
                      }}
                    >
                      <TableCell sx={{ fontWeight: 'inherit' }}>
                        {ranking.rank === 1 && '🥇'}
                        {ranking.rank === 2 && '🥈'}
                        {ranking.rank === 3 && '🥉'}
                        {ranking.rank > 3 && ''} #{ranking.rank}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'inherit' }}>
                        {ranking.studentName}
                        {ranking.studentId === state.user?.id && (
                          <Chip label="You" size="small" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'inherit' }}>
                        <Typography sx={{ fontWeight: 'inherit' }}>
                          {ranking.score} pts
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'inherit' }}>
                        <Chip
                          label={formatters.formatPercentage(ranking.percentile, 1)}
                          color={ranking.percentile >= 75 ? 'success' : 'default'}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* My Results */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            My Results (Click to view details)
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Quiz</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Score
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Percentage
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No results yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  myResults.map((result) => {
                    console.log('[StudentAnalyticsPage] Rendering result row:', {
                      quizTitle: result.quizTitle,
                      score: result.score,
                      maxScore: result.maxScore,
                      attemptId: result.attemptId,
                      quizId: result.quizId,
                    });
                    return (
                      <TableRow
                        key={result.attemptId}
                        onClick={() => {
                          console.log('[StudentAnalyticsPage] Clicked result row:', {
                            quizId: result.quizId,
                            attemptId: result.attemptId,
                            sectionId: sectionId,
                          });
                          navigate(`/student/quiz/${result.quizId}/results/${result.attemptId}`, { state: { sectionId } });
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f5f5f5' }
                        }}
                      >
                        <TableCell>{result.quizTitle}</TableCell>
                        <TableCell align="right">
                          {formatters.formatScore(result.score, result.maxScore)}
                        </TableCell>
                        <TableCell align="right">
                          {formatters.formatPercentage(result.percentage || 0, 1)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={(result.percentage || 0) >= 60 ? 'Passed' : 'Failed'}
                            color={(result.percentage || 0) >= 60 ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {formatters.formatDate(new Date(result.submittedAt))}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>
    </>
  );
}
