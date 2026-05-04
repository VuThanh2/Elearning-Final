import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Divider,
  IconButton,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import PageShell from '../../shared/components/PageShell';
import { useNotification } from '../../shared';
import { analyticsService } from '../services/analyticsService';
import { QuizPerformance, AtRiskStudent, ScoreDistributionBucket, QuestionFailureRate } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';

export default function TeacherAnalyticsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const normalizeRate = (value: number | null | undefined): number => {
    if (value == null || Number.isNaN(value)) return 0;
    return value > 1 ? value / 100 : value;
  };

  const safeRatio = (numerator: number | null | undefined, denominator: number | null | undefined): number => {
    if (numerator == null || denominator == null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
    return numerator / denominator;
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [performance, setPerformance] = useState<QuizPerformance[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistributionBucket[]>([]);
  const [questionFailureRate, setQuestionFailureRate] = useState<QuestionFailureRate[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!sectionId) {
        setError('No section ID provided');
        return;
      }
      try {
        setLoading(true);
        const perfData = await analyticsService.getQuizPerformance(sectionId);
        setPerformance(perfData.map((item) => ({
          ...item,
          completionRate: normalizeRate(item.completionRate),
          averageScore: Number.isFinite(item.averageScore) ? item.averageScore : 0,
          maxScore: Number.isFinite(item.maxScore) ? item.maxScore : 0,
        })));

        const riskData = await analyticsService.getAtRiskStudents(sectionId);
        const normalizedRiskData = riskData
          .map((item) => {
            const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
              item.averageScoreRiskLevel === 'HIGH' || item.participationRiskLevel === 'HIGH'
                ? 'HIGH'
                : item.averageScoreRiskLevel === 'MEDIUM' || item.participationRiskLevel === 'MEDIUM'
                  ? 'MEDIUM'
                  : 'LOW';

            return {
              ...item,
              studentName: item.studentName || item.studentFullname || item.studentId,
              participationRate: normalizeRate(item.participationRate ?? item.quizParticipationRate),
              averageScore: Number.isFinite(item.averageScore) ? item.averageScore : 0,
              riskLevel,
            };
          })
          .filter((item) => item.riskLevel !== 'LOW' && item.studentName?.trim());
        setAtRiskStudents(normalizedRiskData);

        if (perfData.length > 0) {
          const firstQuizId = perfData[0].quizId;
          try {
            const scoreData = await analyticsService.getScoreDistribution(sectionId, firstQuizId);
            setScoreDistribution(scoreData.buckets || []);
          } catch {
            setScoreDistribution([]);
          }
          try {
            const questionData = await analyticsService.getQuestionFailureRate(sectionId, firstQuizId);
            setQuestionFailureRate(questionData);
          } catch {
            setQuestionFailureRate([]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        showNotification(err instanceof Error ? err.message : 'Failed to load analytics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [sectionId, showNotification]);

  if (loading) {
    return (
      <PageShell title="Teacher Analytics" subtitle="Section performance overview">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      </PageShell>
    );
  }

  return (
    <PageShell title="Teacher Analytics" subtitle="Section performance overview">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: '#fff' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Analytics</Typography>
          <Typography variant="body2" color="text.secondary">Insights for the current section</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>Total Quizzes</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{performance.length}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>At-Risk Students</Typography><Typography variant="h4" sx={{ fontWeight: 800, color: 'error.main' }}>{atRiskStudents.length}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>Avg Completion</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{performance.length > 0 ? formatters.formatPercentage(performance.reduce((sum, p) => sum + p.completionRate, 0) / performance.length, 1) : 'N/A'}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>Avg Score</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{performance.length > 0 ? formatters.formatPercentage(safeRatio(performance.reduce((sum, p) => sum + p.averageScore, 0), performance.reduce((sum, p) => sum + p.maxScore, 0)), 1) : 'N/A'}</Typography></CardContent></Card></Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Quiz Performance</Typography>
              <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 640 }}>
                  <TableHead sx={{ bgcolor: 'rgba(15, 118, 110, 0.06)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Quiz</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Attempts</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Completion</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Average Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performance.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" color="text.secondary">No quiz data yet</Typography></TableCell></TableRow>
                    ) : performance.map((perf) => (
                      <TableRow key={perf.quizId} hover>
                        <TableCell>{perf.quizTitle}</TableCell>
                        <TableCell align="right">{perf.totalAttempts}</TableCell>
                        <TableCell align="right"><Chip label={formatters.formatPercentage(perf.completionRate, 1)} color={perf.completionRate >= 0.8 ? 'success' : 'warning'} size="small" variant="outlined" /></TableCell>
                        <TableCell align="right">{formatters.formatScore(perf.averageScore, perf.maxScore)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>At-Risk Students</Typography>
              {atRiskStudents.length === 0 ? (
                <Alert severity="success">All students are doing well!</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {atRiskStudents.map((student) => (
                    <Box key={student.studentId} sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                      <Typography sx={{ fontWeight: 700 }}>{student.studentName}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Chip label={student.riskLevel} color={student.riskLevel === 'HIGH' ? 'error' : 'warning'} size="small" variant="outlined" />
                        <Stack spacing={0.25} alignItems="flex-end">
                          <Typography variant="caption" color="text.secondary">
                            Participation {formatters.formatPercentage(student.participationRate ?? 0, 1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Avg score {formatters.formatNumber(student.averageScore, 1)} pts
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {scoreDistribution.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Score Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="minScore" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f766e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {questionFailureRate.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Question Difficulty</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={questionFailureRate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="questionId" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="failureRate" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </PageShell>
  );
}
