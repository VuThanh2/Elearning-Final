import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Collapse,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuth } from '../../shared';
import PageShell from '../../shared/components/PageShell';
import { analyticsService } from '../services/analyticsService';
import { HierarchicalReportNode } from '../../shared/types';

export default function AdminDashboard() {
  const { state } = useAuth();
  const [report, setReport] = useState<HierarchicalReportNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getHierarchicalReportTree();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  const toggleNode = (nodeId: string) => {
    const next = new Set(expandedNodes);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    setExpandedNodes(next);
  };

  const normalizeRate = (value?: number) => (value && value > 1 ? value / 100 : value || 0);

  const HierarchyNode = ({ node, level = 0, nodeId = 'root' }: any) => {
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;

    return (
      <Box sx={{ ml: level * 3, mb: 1.5 }}>
        <Card sx={{ borderRadius: 4, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {hasChildren ? (
                <IconButton size="small" onClick={() => toggleNode(nodeId)}>
                  <ChevronRightIcon sx={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </IconButton>
              ) : (
                <Box sx={{ width: 40 }} />
              )}

              <Box sx={{ flex: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant={level === 0 ? 'h5' : 'h6'} sx={{ fontWeight: 800 }}>
                      {node.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {node.level}
                    </Typography>
                  </Box>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Quizzes</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{node.totalQuizzes || 0}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Completion</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress variant="determinate" value={Math.min(normalizeRate(node.completionRate) * 100, 100)} sx={{ height: 8, borderRadius: 999 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 52 }}>
                        {(normalizeRate(node.completionRate) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Avg Score</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {(node.averageScore ?? 0).toFixed(1)}%
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Collapse in={isExpanded && hasChildren}>
          <Box sx={{ mt: 1.5 }}>
            {node.children?.map((child: HierarchicalReportNode, index: number) => (
              <HierarchyNode key={child.id} node={child} level={level + 1} nodeId={`${nodeId}-${index}`} />
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <PageShell title="Admin Dashboard" subtitle={`Welcome, ${state.user?.fullName || state.user?.email || 'admin'}`}>
      <Box sx={{ mb: 3, p: 3, borderRadius: 4, bgcolor: '#0f766e', color: '#fff' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          System Overview
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Monitor hierarchy, completion, and performance across the platform.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <LinearProgress sx={{ width: '40%' }} />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Total Quizzes</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>{report?.totalQuizzes || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Completion Rate</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {((normalizeRate(report?.completionRate) || 0) * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Average Score</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                    {(report?.averageScore || 0).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Faculties</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>{report?.children?.length || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>
            Hierarchical Report
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Expand the tree to explore faculty, course, and section metrics.
          </Typography>

          {report ? <HierarchyNode node={report} /> : <Alert severity="info">No data available</Alert>}
        </>
      )}
    </PageShell>
  );
}
