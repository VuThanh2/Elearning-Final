import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuth, Navbar } from '../../shared';
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
        console.log('[AdminDashboard] ENTRY: Fetching hierarchical report...');
        const data = await analyticsService.getHierarchicalReport();
        console.log('[AdminDashboard] Report fetched successfully');
        console.log('[AdminDashboard] Report data:', data);
        console.log('[AdminDashboard] Report structure:', {
          id: data?.id,
          name: data?.name,
          level: data?.level,
          hasChildren: Array.isArray(data?.children),
          childrenCount: data?.children?.length || 0,
          hasAverageScore: data?.averageScore !== undefined,
          averageScore: data?.averageScore,
          hasCompletionRate: data?.completionRate !== undefined,
          completionRate: data?.completionRate,
          hasTotalQuizzes: data?.totalQuizzes !== undefined,
          totalQuizzes: data?.totalQuizzes,
        });

        if (!data) {
          console.error('[AdminDashboard] Data is null/undefined');
          setError('No data received from server');
          return;
        }

        setReport(data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load report';
        console.error('[AdminDashboard] Error loading report:', err);
        console.error('[AdminDashboard] Error type:', err instanceof Error ? err.constructor.name : typeof err);
        if (err instanceof Error) {
          console.error('[AdminDashboard] Error stack:', err.stack);
        }
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

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

  const HierarchyNode = ({ node, level = 0, nodeId = 'root' }: any) => {
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <Box key={nodeId}>
        {/* Node Card */}
        <Card sx={{ mb: 1.5, ml: level * 3, backgroundColor: level === 0 ? '#e3f2fd' : 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Expand Button */}
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={() => toggleNode(nodeId)}
                  sx={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                  }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              )}
              {!hasChildren && <Box sx={{ width: 40 }} />}

              {/* Node Content */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                  <Typography variant={level === 0 ? 'h6' : 'body2'} sx={{ fontWeight: 700 }}>
                    {node.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                    {node.level}
                  </Typography>
                </Box>

                {/* Metrics Grid */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" display="block" color="textSecondary">
                      Quizzes
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {node.totalQuizzes || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" display="block" color="textSecondary">
                      Completion
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((node.completionRate || 0) * 100, 100)}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 40 }}>
                        {((node.completionRate || 0) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" display="block" color="textSecondary">
                      Avg Score
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {((node.averageScore || 0)).toFixed(1)}%
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Children */}
        <Collapse in={isExpanded && hasChildren}>
          <Box>
            {node.children?.map((child: HierarchicalReportNode, index: number) => (
              <HierarchyNode
                key={child.id}
                node={child}
                level={level + 1}
                nodeId={`${nodeId}-${index}`}
              />
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
              Welcome, {state.user?.fullName || state.user?.email}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Admin Dashboard - System Overview
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* System Metrics */}
          {!loading && report && (
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Quizzes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {report.totalQuizzes || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Completion Rate
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((report.completionRate || 0) * 100, 100)}
                          sx={{ height: 8, borderRadius: 2 }}
                        />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 50 }}>
                        {((report.completionRate || 0) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Average Score
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {((report.averageScore || 0)).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Organization Levels
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {report.children?.length || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Hierarchical Report */}
          {!loading && (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                📊 Hierarchical Report
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                Click on items to expand/collapse the hierarchy
              </Typography>

              {report ? (
                <HierarchyNode node={report} />
              ) : (
                <Alert severity="info">No data available</Alert>
              )}
            </>
          )}
        </Box>
      </Container>
    </>
  );
}
