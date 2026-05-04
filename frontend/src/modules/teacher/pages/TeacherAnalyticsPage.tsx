import React, { useEffect, useMemo, useState } from 'react';
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
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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

  const safeNumber = (value: number | null | undefined): number =>
    value == null || !Number.isFinite(value) ? 0 : value;

  const formatCompactNumber = (value: number | null | undefined, maxDecimals = 1): string => {
    const normalized = safeNumber(value);
    if (Number.isInteger(normalized)) return String(normalized);
    return normalized.toFixed(maxDecimals).replace(/\.?0+$/, '');
  };

  const formatScoreValue = (value: number | null | undefined): string =>
    formatCompactNumber(value, 1);

  const formatScoreWithMax = (
    value: number | null | undefined,
    maxScore: number | null | undefined
  ): string => `${formatScoreValue(value)}/${formatScoreValue(maxScore)}`;

  const formatScoreRangeLabel = (
    start: number | null | undefined,
    end: number | null | undefined,
    isUpperBoundInclusive?: boolean
  ): string => {
    const startLabel = formatCompactNumber(start, 1);
    const endLabel = formatCompactNumber(end, 1);
    return isUpperBoundInclusive ? `${startLabel}-${endLabel}` : `${startLabel}-<${endLabel}`;
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [performance, setPerformance] = useState<QuizPerformance[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistributionBucket[]>([]);
  const [questionFailureRate, setQuestionFailureRate] = useState<QuestionFailureRate[]>([]);
  const selectedQuiz = performance.find((quiz) => quiz.quizId === selectedQuizId);
  const questionFailureRows = useMemo(() => (
    [...questionFailureRate]
      .sort((a, b) => b.failureRate - a.failureRate)
      .map((question, index) => ({
        ...question,
        questionLabel: `Q${index + 1}`,
        totalAttempts: question.totalQuestionAttempts ?? question.totalAttempts ?? 0,
        correctCount: question.correctAnswers ?? question.correctCount ?? 0,
        wrongCount: question.wrongAnswers ?? 0,
        unansweredCount: question.unansweredCount ?? 0,
      }))
  ), [questionFailureRate]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!sectionId) {
        setError('No section ID provided');
        return;
      }
      try {
        setLoading(true);
        const perfData = await analyticsService.getQuizPerformance(sectionId);
        const normalizedPerformance = perfData.map((item) => ({
          ...item,
          completionRate: normalizeRate(item.completionRate),
          averageScore: Number.isFinite(item.averageScore) ? item.averageScore : 0,
          maxScore: Number.isFinite(item.maxScore) ? item.maxScore : 0,
          attemptedStudents: safeNumber(item.attemptedStudents),
          totalStudents: safeNumber(item.totalStudents),
          highestScore: safeNumber(item.highestScore),
          lowestScore: safeNumber(item.lowestScore),
        }));
        setPerformance(normalizedPerformance);
        setSelectedQuizId((current) =>
          current && normalizedPerformance.some((item) => item.quizId === current)
            ? current
            : normalizedPerformance[0]?.quizId ?? ''
        );

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        showNotification(err instanceof Error ? err.message : 'Failed to load analytics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [sectionId, showNotification]);

  useEffect(() => {
    const fetchSelectedQuizReports = async () => {
      if (!sectionId || !selectedQuizId) {
        setScoreDistribution([]);
        setQuestionFailureRate([]);
        return;
      }

      try {
        const scoreData = await analyticsService.getScoreDistribution(sectionId, selectedQuizId);
        const scoreRanges = scoreData.scoreRanges ?? [];
        setScoreDistribution(scoreRanges.map((bucket) => ({
          ...bucket,
          label: bucket.label || `${bucket.rangeStart}-${bucket.rangeEnd}`,
          scoreRangeLabel: formatScoreRangeLabel(
            bucket.rangeStart,
            bucket.rangeEnd,
            bucket.isUpperBoundInclusive
          ),
          minScore: bucket.rangeStart,
          maxScore: bucket.rangeEnd,
          count: bucket.studentCount,
          percentage: normalizeRate(bucket.percentage),
        })));
      } catch {
        setScoreDistribution([]);
      }

      try {
        const questionData = await analyticsService.getQuestionFailureRate(sectionId, selectedQuizId);
        const questions: any[] = Array.isArray(questionData) ? questionData : (questionData.questions ?? []);
        setQuestionFailureRate(
          questions
            .map((question: any) => ({
              ...question,
              failureRate: normalizeRate(question.failureRate),
              totalAttempts: question.totalQuestionAttempts ?? question.totalAttempts ?? 0,
              correctCount: question.correctAnswers ?? question.correctCount ?? 0,
            }))
            .sort((a, b) => b.failureRate - a.failureRate)
        );
      } catch {
        setQuestionFailureRate([]);
      }
    };

    fetchSelectedQuizReports();
  }, [sectionId, selectedQuizId]);

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
        <Grid item xs={12} sm={6} md={3}><Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}><CardContent><Typography color="text.secondary" gutterBottom>Avg Score</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{performance.length > 0 ? formatScoreValue(performance.reduce((sum, p) => sum + p.averageScore, 0) / performance.length) : 'N/A'}</Typography></CardContent></Card></Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Quiz Performance</Typography>
              <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
                {performance.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No quiz data yet</Typography>
                  </Box>
                ) : performance.map((perf) => (
                  <Box
                    key={perf.quizId}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: 'anywhere', mb: 1.25 }}>
                      {perf.quizTitle}
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 1,
                      }}
                    >
                      {[
                        ['Attempts', perf.totalAttempts],
                        ['Students', `${safeNumber(perf.attemptedStudents)}/${safeNumber(perf.totalStudents)}`],
                        ['Completion', formatters.formatPercentage(perf.completionRate, 1)],
                        ['Average', formatScoreWithMax(perf.averageScore, perf.maxScore)],
                        ['Highest', formatScoreWithMax(perf.highestScore, perf.maxScore)],
                        ['Lowest', formatScoreWithMax(perf.lowestScore, perf.maxScore)],
                      ].map(([label, value]) => (
                        <Box key={label} sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                            {value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Stack>
              <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)', overflowX: 'visible' }}>
                <Table size="small" sx={{ width: '100%', tableLayout: 'fixed', '& .MuiTableCell-root': { px: 1 } }}>
                  <TableHead sx={{ bgcolor: 'rgba(15, 118, 110, 0.06)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '22%' }}>Quiz</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: '13%' }}>Attempts</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: '13%' }}>Students</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: '16%' }}>Completion</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: '14%' }}>Average Score</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: '11%' }}>Highest</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: '11%' }}>Lowest</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performance.length === 0 ? (
                      <TableRow><TableCell colSpan={7} align="center"><Typography variant="body2" color="text.secondary">No quiz data yet</Typography></TableCell></TableRow>
                    ) : performance.map((perf) => (
                      <TableRow key={perf.quizId} hover>
                        <TableCell sx={{ overflowWrap: 'anywhere' }}>{perf.quizTitle}</TableCell>
                        <TableCell align="right">{perf.totalAttempts}</TableCell>
                        <TableCell align="right">{safeNumber(perf.attemptedStudents)}/{safeNumber(perf.totalStudents)}</TableCell>
                        <TableCell align="right"><Chip label={formatters.formatPercentage(perf.completionRate, 1)} color={perf.completionRate >= 0.8 ? 'success' : 'warning'} size="small" variant="outlined" /></TableCell>
                        <TableCell align="right">{formatScoreWithMax(perf.averageScore, perf.maxScore)}</TableCell>
                        <TableCell align="right">{formatScoreWithMax(perf.highestScore, perf.maxScore)}</TableCell>
                        <TableCell align="right">{formatScoreWithMax(perf.lowestScore, perf.maxScore)}</TableCell>
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

      {performance.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Quiz Reports</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedQuiz?.quizTitle ?? 'Select a quiz'}
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 280 }, bgcolor: '#fff' }}>
            <InputLabel id="teacher-quiz-report-select-label">Quiz</InputLabel>
            <Select
              labelId="teacher-quiz-report-select-label"
              value={selectedQuizId}
              label="Quiz"
              onChange={(event) => setSelectedQuizId(event.target.value)}
            >
              {performance.map((quiz) => (
                <MenuItem key={quiz.quizId} value={quiz.quizId}>
                  {quiz.quizTitle}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <Grid container spacing={3}>
        {scoreDistribution.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Score Distribution</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Students by score range
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="scoreRangeLabel" />
                    <YAxis allowDecimals={false} tickFormatter={(value) => String(Math.round(Number(value)))} />
                    <Tooltip
                      formatter={(value) => [formatCompactNumber(Number(value), 0), 'Students']}
                      labelFormatter={(label) => `Score range ${label}`}
                    />
                    <Bar dataKey="studentCount" fill="#0f766e" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {questionFailureRows.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Question Difficulty</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Question list sorted by failure rate
                </Typography>
                <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
                  {questionFailureRows.map((question, index) => (
                    <Box
                      key={question.questionId}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: index === 0 ? 'rgba(254, 242, 242, 0.72)' : '#f8fafc',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800, color: index === 0 ? 'error.main' : 'text.secondary' }}>
                        {question.questionLabel}{index === 0 ? ' - Most missed' : ''}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere', mb: 1.25 }}>
                        {question.questionContent}
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: 1,
                        }}
                      >
                        {[
                          ['Failure', formatters.formatPercentage(question.failureRate, 1)],
                          ['Wrong / Attempts', `${question.wrongCount}/${question.totalAttempts}`],
                          ['Unanswered', question.unansweredCount],
                          ['Most wrong answer', question.mostSelectedWrongOptionContent || 'N/A'],
                        ].map(([label, value]) => (
                          <Box key={label} sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {label}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                              {value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Stack>
                <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)', overflowX: 'visible' }}>
                  <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                    <TableHead sx={{ bgcolor: 'rgba(245, 158, 11, 0.08)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: '34%' }}>Question</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: '12%' }}>Failure</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: '16%' }}>Wrong / Attempts</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: '14%' }}>Unanswered</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: '24%' }}>Most Selected Wrong Answer</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {questionFailureRows.map((question, index) => (
                        <TableRow key={question.questionId} hover>
                          <TableCell sx={{ overflowWrap: 'anywhere' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: index === 0 ? 'error.main' : 'text.secondary' }}>
                              {question.questionLabel}{index === 0 ? ' - Most missed' : ''}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {question.questionContent}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={formatters.formatPercentage(question.failureRate, 1)}
                              color={index === 0 ? 'error' : 'warning'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">{question.wrongCount}/{question.totalAttempts}</TableCell>
                          <TableCell align="right">{question.unansweredCount}</TableCell>
                          <TableCell sx={{ overflowWrap: 'anywhere' }}>
                            {question.mostSelectedWrongOptionContent || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </PageShell>
  );
}
