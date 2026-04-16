import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import { useAuth, useNotification, USER_ROLES } from '../../shared';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, state } = useAuth();
  const { showNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (state.user && state.token) {
      if (state.user.role === USER_ROLES.STUDENT) navigate('/student/dashboard');
      else if (state.user.role === USER_ROLES.TEACHER) navigate('/teacher/dashboard');
      else if (state.user.role === USER_ROLES.ADMIN) navigate('/admin/dashboard');
    }
  }, [state.user, state.token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showNotification('Please enter email and password', 'error');
      return;
    }

    try {
      await login(email, password);
      showNotification('Login successful', 'success');
    } catch {
      showNotification(state.error || 'Login failed', 'error');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f8fc', display: 'grid', placeItems: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 1100, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: 3 }}>
        <Card sx={{ borderRadius: 5, boxShadow: '0 20px 45px rgba(15, 23, 42, 0.10)', overflow: 'hidden' }}>
          <Box sx={{ p: 4, bgcolor: '#0f766e', color: '#fff' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box sx={{ width: 46, height: 46, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center' }}>
                <SchoolRoundedIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>E-Learning LMS</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Modern platform for learning and analytics</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip icon={<DashboardRoundedIcon />} label="Dashboard" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.14)' }} />
              <Chip icon={<QuizRoundedIcon />} label="Quiz Engine" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.14)' }} />
              <Chip icon={<AnalyticsRoundedIcon />} label="Analytics" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.14)' }} />
            </Stack>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Sign in</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Access your dashboard with your account credentials.
            </Typography>

            {state.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {state.error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={state.loading}
                />
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={state.loading}
                />

                <Button type="submit" fullWidth variant="contained" size="large" sx={{ py: 1.2 }} disabled={state.loading}>
                  {state.loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 5, boxShadow: '0 20px 45px rgba(15, 23, 42, 0.10)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Demo Accounts</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Use these accounts to test the application.
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                <Typography sx={{ fontWeight: 700 }}>Admin</Typography>
                <Typography variant="body2">admin@school.edu.vn</Typography>
                <Typography variant="body2" color="text.secondary">Admin@123</Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                <Typography sx={{ fontWeight: 700 }}>Teacher</Typography>
                <Typography variant="body2">nguyen.van.an@school.edu.vn</Typography>
                <Typography variant="body2" color="text.secondary">Teacher@123</Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                <Typography sx={{ fontWeight: 700 }}>Student</Typography>
                <Typography variant="body2">pham.quoc.bao@school.edu.vn</Typography>
                <Typography variant="body2" color="text.secondary">Student@123</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
