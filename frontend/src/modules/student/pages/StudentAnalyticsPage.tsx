import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
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
  IconButton,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageShell from '../../shared/components/PageShell';
import { useAuth } from '../../shared';
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
        const rankingsData = await analyticsService.getMyClassRanking(sectionId);
        setRankings(rankingsData);
        const myRanking = rankingsData.find((r) => r.studentId === state.user?.id);
        setMyRank(myRanking || null);
        const resultsData = await analyticsService.getMyResults(sectionId);
        setMyResults(resultsData);

        const completedCount = resultsData.length;
        const passedCount = resultsData.filter((r) => (r.percentage || 0) >= 0.6).length;
        const avgScore = completedCount > 0
          ? resultsData.reduce((sum, r) => sum + (r.score || 0), 0) / completedCount
          : 0;

        setStats({
          totalQuizzes: resultsData.length,
          completedQuizzes: completedCount,
          passedQuizzes: passedCount,
          averageScore: avgScore,
          passRate: completedCount > 0 ? (passedCount / completedCount) * 100 : 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [sectionId, state.user?.id]);

  if (loading) {
    return (
      <PageShell title="My Analytics" subtitle="Performance overview and class ranking">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      </PageShell>
    );
  }

  return (
    <PageShell title="My Analytics" subtitle="Performance overview and class ranking">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: '#fff' }}><ArrowBackIcon /></IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>My Analytics</Typography>
          <Typography variant="body2" color="text.secondary">See your progress, ranking, and quiz history</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>Total Quizzes</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.totalQuizzes}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>Completed</Typography><Typography variant="h4" sx={{ fontWeight: 800, color: 'info.main' }}>{stats.completedQuizzes}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>Passed</Typography><Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>{stats.passedQuizzes}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>Average Score</Typography><Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>{formatters.formatPercentage(stats.averageScore / 100, 1)}</Typography></CardContent></Card></Grid>
      </Grid>

      {myRank && (
        <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', bgcolor: '#f0fdfa', border: '1px solid rgba(15, 118, 110, 0.15)' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Your Class Ranking</Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>#{myRank.rank}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Score</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{myRank.score}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Percentile</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{formatters.formatPercentage(myRank.percentile, 1)}</Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Class Rankings</Typography>
              <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'rgba(15, 118, 110, 0.06)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Score</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Percentile</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rankings.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" color="text.secondary">No ranking data available</Typography></TableCell></TableRow>
                    ) : rankings.map((ranking) => (
                      <TableRow key={ranking.studentId} hover sx={{ backgroundColor: ranking.studentId === state.user?.id ? 'rgba(15, 118, 110, 0.05)' : 'inherit' }}>
                        <TableCell sx={{ fontWeight: 700 }}>{ranking.rank === 1 && '🥇'}{ranking.rank === 2 && '🥈'}{ranking.rank === 3 && '🥉'} #{ranking.rank}</TableCell>
                        <TableCell>
                          {ranking.studentName}
                          {ranking.studentId === state.user?.id && <Chip label="You" size="small" sx={{ ml: 1 }} />}
                        </TableCell>
                        <TableCell align="right">{ranking.score} pts</TableCell>
                        <TableCell align="right"><Chip label={formatters.formatPercentage(ranking.percentile, 1)} color={ranking.percentile >= 75 ? 'success' : 'default'} variant="outlined" size="small" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Quick Summary</Typography>
              <Stack spacing={2}>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  <Typography variant="body2" color="text.secondary">Completed Quizzes</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{stats.completedQuizzes}</Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  <Typography variant="body2" color="text.secondary">Pass Rate</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{stats.passRate.toFixed(1)}%</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>My Results</Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(15, 118, 110, 0.06)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Quiz</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Score</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Percentage</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myResults.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center"><Typography variant="body2" color="text.secondary">No results yet</Typography></TableCell></TableRow>
                ) : myResults.map((result) => (
                  <TableRow key={result.attemptId} hover onClick={() => navigate(`/student/quiz/${result.quizId}/results/${result.attemptId}`, { state: { sectionId } })} sx={{ cursor: 'pointer' }}>
                    <TableCell>{result.quizTitle}</TableCell>
                    <TableCell align="right">{formatters.formatScore(result.score, result.maxScore)}</TableCell>
                    <TableCell align="right">{formatters.formatPercentage(result.percentage || 0, 1)}</TableCell>
                    <TableCell align="right"><Chip label={(result.percentage || 0) >= 0.6 ? 'Passed' : 'Failed'} color={(result.percentage || 0) >= 0.6 ? 'success' : 'error'} size="small" variant="outlined" /></TableCell>
                    <TableCell>{formatters.formatDate(new Date(result.submittedAt))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </PageShell>
  );
}
