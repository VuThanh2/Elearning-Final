import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import PageShell from '../../shared/components/PageShell';
import { useAuth } from '../../shared';
import { StudentClassRanking, StudentQuizResult } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';
import { analyticsService } from '../services/analyticsService';

interface AnalyticsLocationState {
  sectionName?: string;
  courseName?: string;
  facultyName?: string;
  term?: string;
  academicYear?: string;
}

const toSafeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeRatio = (value: unknown): number => {
  const parsed = toSafeNumber(value);
  if (parsed <= 0) return 0;
  return parsed > 1 ? parsed / 100 : parsed;
};

const formatRatio = (value: unknown, decimals = 1): string =>
  formatters.formatPercentage(normalizeRatio(value), decimals);

const formatCompactNumber = (value: unknown, maxDecimals = 1): string => {
  const parsed = toSafeNumber(value);
  if (Number.isInteger(parsed)) return String(parsed);
  return parsed.toFixed(maxDecimals).replace(/\.?0+$/, '');
};

const formatScoreMetric = (value: unknown): string => formatCompactNumber(value, 1);

const formatResultScore = (value: unknown): string => formatCompactNumber(value, 1);

const formatMaybeDateTime = (value?: string): string => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return formatters.formatDateTime(date);
};

const formatDuration = (value?: number): string => {
  const seconds = Math.round(toSafeNumber(value));
  if (seconds <= 0) return 'No data';
  return formatters.formatTime(seconds);
};

const getAttemptStatus = (result: StudentQuizResult) => {
  if (result.status === 'EXPIRED') {
    return {
      label: 'Expired',
      color: 'warning' as const,
    };
  }

  return normalizeRatio(result.percentage) >= 0.6
    ? { label: 'Passed', color: 'success' as const }
    : { label: 'Needs review', color: 'error' as const };
};

export default function StudentAnalyticsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAuth();
  const analyticsContext = (location.state as AnalyticsLocationState | null) || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myResults, setMyResults] = useState<StudentQuizResult[]>([]);
  const [myRank, setMyRank] = useState<StudentClassRanking | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!sectionId) {
        setError('Section ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [rankingData, resultsData] = await Promise.all([
          analyticsService.getMyClassRanking(sectionId),
          analyticsService.getMyResults(sectionId),
        ]);

        setMyRank(rankingData);
        setMyResults(resultsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [sectionId]);

  const sectionTitle = myRank?.sectionName || analyticsContext?.sectionName || 'Section analytics';
  const sectionCaption = [analyticsContext?.courseName, analyticsContext?.facultyName]
    .filter(Boolean)
    .join(' / ');
  const termLabel =
    analyticsContext?.term && analyticsContext?.academicYear
      ? `${analyticsContext.term} ${analyticsContext.academicYear}`
      : undefined;
  const studentLabel = myRank?.studentFullname || state.user?.fullName || state.user?.email || 'student';
  const attemptCount = myResults.length;
  const passedCount = myResults.filter((result) => normalizeRatio(result.percentage) >= 0.6).length;
  const averageRatio =
    attemptCount > 0
      ? myResults.reduce((sum, result) => sum + normalizeRatio(result.percentage), 0) / attemptCount
      : 0;
  const bestRatio =
    attemptCount > 0
      ? Math.max(...myResults.map((result) => normalizeRatio(result.percentage)))
      : 0;
  const averageDurationSeconds =
    attemptCount > 0
      ? myResults.reduce((sum, result) => sum + toSafeNumber(result.durationSeconds), 0) / attemptCount
      : 0;
  const percentileProgress = Math.round(normalizeRatio(myRank?.percentile) * 100);
  const rankingReference = Math.max(
    1,
    toSafeNumber(myRank?.averageScore),
    toSafeNumber(myRank?.sectionAverageScore),
    toSafeNumber(myRank?.sectionHighestScore),
    toSafeNumber(myRank?.sectionLowestScore)
  );
  const latestAttempt = myResults[0];
  const insightMessage =
    attemptCount === 0
      ? 'Submit your first quiz in this section to unlock ranking and benchmark insights.'
      : averageRatio >= 0.8
        ? 'You are keeping a strong performance trend in this section.'
        : averageRatio >= 0.6
          ? 'Your results are stable. Reviewing missed questions should move you up quickly.'
          : 'Focus on the lowest-scoring attempts first to improve your average and section rank.';

  const renderMetricCard = (
    title: string,
    value: string,
    detail: string,
    icon: React.ReactElement
  ) => (
    <Grid item xs={12} sm={6} xl={3} key={title}>
      <Card
        sx={{
          height: '100%',
          borderRadius: 5,
          boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
          border: '1px solid rgba(30,57,50,0.08)',
        }}
      >
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontFamily: 'var(--font-serif)', fontWeight: 600, lineHeight: 1.1 }}
            >
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {detail}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderBenchmarkRow = (label: string, value: number, color: string) => (
    <Box key={label}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatScoreMetric(value)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, (toSafeNumber(value) / rankingReference) * 100)}
        sx={{
          height: 10,
          borderRadius: 999,
          bgcolor: 'rgba(212,233,226,0.9)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            background: color,
          },
        }}
      />
    </Box>
  );

  if (loading) {
    return (
      <PageShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card
        sx={{
          mb: 3,
          borderRadius: 6,
          overflow: 'hidden',
          color: '#fff',
          background:
            'radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 30%), linear-gradient(145deg, #1E3932 0%, #2b5148 100%)',
          boxShadow: '0 20px 48px rgba(30,57,50,0.22)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={3}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', lg: 'stretch' }}
          >
            <Stack spacing={1.5} sx={{ maxWidth: 780 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Button
                  startIcon={<ArrowBackIcon />}
                  variant="contained"
                  onClick={() => navigate(-1)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.16)',
                    color: '#fff',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.22)',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Back
                </Button>
                <Chip
                  icon={<AnalyticsRoundedIcon sx={{ color: '#fff !important' }} />}
                  label="Student analytics"
                  sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }}
                />
                {termLabel && (
                  <Chip
                    label={termLabel}
                    variant="outlined"
                    sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.24)' }}
                  />
                )}
              </Stack>

              <Box>
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 600,
                    lineHeight: 1.05,
                  }}
                >
                  {sectionTitle}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1.25, opacity: 0.9, maxWidth: 760 }}>
                  Personal analytics for {studentLabel}. Review your section rank, benchmark signals,
                  and every submitted attempt from one place.
                </Typography>
              </Box>

              {sectionCaption && (
                <Typography variant="body2" sx={{ opacity: 0.82 }}>
                  {sectionCaption}
                </Typography>
              )}
            </Stack>

            <Box
              sx={{
                minWidth: { xs: '100%', lg: 300 },
                maxWidth: 360,
                p: 2.5,
                borderRadius: 5,
                bgcolor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.16)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Typography variant="overline" sx={{ opacity: 0.78, letterSpacing: 1.1 }}>
                Student snapshot
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                {studentLabel}
              </Typography>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.16)' }} />
              <Stack spacing={1.25}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.82 }}>
                    Section status
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {myRank ? 'Ranked' : attemptCount > 0 ? 'Results ready' : 'Waiting for first attempt'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.82 }}>
                    Submitted attempts
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {attemptCount}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.82 }}>
                    Best result
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {attemptCount > 0 ? formatResultScore(bestRatio * 100) : 'No data'}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!error && !myRank && myResults.length === 0 ? (
        <Card
          sx={{
            borderRadius: 5,
            border: '1px solid rgba(30,57,50,0.08)',
            boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
                No analytics yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 700 }}>
                Submit your first quiz in this section to unlock ranking, benchmark comparisons,
                and a full attempt history. Once you have a graded attempt, this page will fill in automatically.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" onClick={() => navigate(`/student/sections/${sectionId}`)}>
                  Open section
                </Button>
                <Button variant="outlined" onClick={() => navigate('/student/dashboard?view=quizzes')}>
                  Back to dashboard
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {renderMetricCard(
              'Submitted attempts',
              String(attemptCount),
              `${passedCount} passed so far`,
              <QuizRoundedIcon />
            )}
            {renderMetricCard(
              'Average result',
              attemptCount > 0 ? formatResultScore(averageRatio * 100) : 'No data',
              attemptCount > 0 ? `Best result ${formatResultScore(bestRatio * 100)}` : 'Complete a quiz to populate this',
              <QueryStatsRoundedIcon />
            )}
            {renderMetricCard(
              'Section rank',
              myRank ? `#${myRank.rankInSection}` : 'Unranked',
              myRank ? `Out of ${myRank.totalRankedStudents} ranked students` : 'Ranking appears after analytics sync',
              <EmojiEventsRoundedIcon />
            )}
            {renderMetricCard(
              'Average duration',
              attemptCount > 0 ? formatDuration(averageDurationSeconds) : 'No data',
              attemptCount > 0 ? `${formatRatio(passedCount / Math.max(1, attemptCount), 0)} pass rate` : 'No completed attempts yet',
              <TimerRoundedIcon />
            )}
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={7}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 5,
                  boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
                  border: '1px solid rgba(30,57,50,0.08)',
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontFamily: 'var(--font-serif)', fontWeight: 600 }}
                      >
                        Section benchmark
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rank basis: section average across quizzes. Benchmark rows compare your section average with section-level class metrics.
                      </Typography>
                    </Box>

                    {myRank ? (
                      <>
                        <Box
                          sx={{
                            p: 2.5,
                            borderRadius: 4,
                            bgcolor: 'rgba(212,233,226,0.65)',
                            border: '1px solid rgba(0,98,65,0.08)',
                          }}
                        >
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <Typography variant="overline" color="text.secondary">
                                Rank in section
                              </Typography>
                              <Typography
                                variant="h3"
                                sx={{ fontFamily: 'var(--font-serif)', fontWeight: 600, lineHeight: 1 }}
                              >
                                #{myRank.rankInSection}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                Ranked among {myRank.totalRankedStudents} active students
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={8}>
                              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                                Better than {percentileProgress}% of ranked students by section average
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={percentileProgress}
                                sx={{
                                  height: 12,
                                  borderRadius: 999,
                                  bgcolor: 'rgba(212,233,226,0.9)',
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 999,
                                    background: 'linear-gradient(90deg, #00754A 0%, #006241 100%)',
                                  },
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Last refreshed {formatMaybeDateTime(myRank.lastUpdatedAt)}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        <Stack spacing={2}>
                          {renderBenchmarkRow(
                            'Your section average',
                            myRank.averageScore,
                            'linear-gradient(90deg, #00754A 0%, #006241 100%)'
                          )}
                          {renderBenchmarkRow(
                            'Section average',
                            myRank.sectionAverageScore,
                            'linear-gradient(90deg, #2b5148 0%, #006241 100%)'
                          )}
                          {renderBenchmarkRow(
                            'Section highest score',
                            myRank.sectionHighestScore,
                            'linear-gradient(90deg, #cba258 0%, #b78d43 100%)'
                          )}
                          {renderBenchmarkRow(
                            'Section lowest score',
                            myRank.sectionLowestScore,
                            'linear-gradient(90deg, #9aa59f 0%, #7a8a84 100%)'
                          )}
                        </Stack>
                      </>
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 3 }}>
                        Your attempts are saved. Ranking will appear here as soon as the analytics view has enough data to position you inside the section.
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 5,
                  boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
                  border: '1px solid rgba(30,57,50,0.08)',
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontFamily: 'var(--font-serif)', fontWeight: 600 }}
                      >
                        Performance notes
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        A quick reading of your current momentum in this section.
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 4,
                        bgcolor: 'rgba(255,255,255,0.72)',
                        border: '1px solid rgba(30,57,50,0.08)',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Latest submission
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontFamily: 'var(--font-serif)', fontWeight: 600, mt: 0.5 }}
                      >
                        {latestAttempt?.quizTitle || 'No submissions yet'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {latestAttempt
                          ? `${formatters.formatScore(latestAttempt.score, latestAttempt.maxScore)} on ${formatMaybeDateTime(latestAttempt.submittedAt)}`
                          : 'Take a quiz to start building your personal history.'}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 4,
                        bgcolor: 'rgba(255,255,255,0.72)',
                        border: '1px solid rgba(30,57,50,0.08)',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Pass rate
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {attemptCount > 0 ? formatRatio(passedCount / attemptCount, 0) : '0%'}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={attemptCount > 0 ? (passedCount / attemptCount) * 100 : 0}
                        sx={{
                          height: 10,
                          borderRadius: 999,
                          bgcolor: 'rgba(212,233,226,0.9)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            background:
                              attemptCount > 0 && passedCount / attemptCount >= 0.6
                                ? 'linear-gradient(90deg, #00754A 0%, #006241 100%)'
                                : 'linear-gradient(90deg, #cba258 0%, #b78d43 100%)',
                          },
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 4,
                        bgcolor: 'rgba(255,255,255,0.72)',
                        border: '1px solid rgba(30,57,50,0.08)',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                        Next focus
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {insightMessage}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card
            sx={{
              borderRadius: 5,
              boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
              border: '1px solid rgba(30,57,50,0.08)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  gap: 2,
                  flexWrap: 'wrap',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontFamily: 'var(--font-serif)', fontWeight: 600 }}
                  >
                    Attempt history
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open any row to review detailed answers and scoring.
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={() => navigate(`/student/sections/${sectionId}`)}>
                  Open section
                </Button>
              </Box>

              <TableContainer
                component={Paper}
                sx={{
                  boxShadow: 'none',
                  border: '1px solid rgba(30,57,50,0.08)',
                  overflowX: 'auto',
                  borderRadius: 4,
                }}
              >
                <Table size="small" sx={{ minWidth: 760 }}>
                  <TableHead sx={{ bgcolor: 'rgba(212,233,226,0.55)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Quiz</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Attempt
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Score
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Result
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Duration
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {myResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
                            No attempts recorded yet
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      myResults.map((result) => {
                        const status = getAttemptStatus(result);

                        return (
                          <TableRow
                            key={result.attemptId}
                            hover
                            onClick={() =>
                              navigate(`/student/quiz/${result.quizId}/results/${result.attemptId}`, {
                                state: {
                                  sectionId,
                                  ...analyticsContext,
                                },
                              })
                            }
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {result.quizTitle}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">#{result.attemptNumber || 1}</TableCell>
                            <TableCell align="right">
                              {formatters.formatScore(result.score, result.maxScore)}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={status.label}
                                size="small"
                                color={status.color}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{formatMaybeDateTime(result.submittedAt)}</TableCell>
                            <TableCell align="right">{formatDuration(result.durationSeconds)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
