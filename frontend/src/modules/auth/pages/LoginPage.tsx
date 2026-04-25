import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
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

  const demoAccounts = [
    {
      role: 'Admin',
      email: 'admin@school.edu.vn',
      password: 'Admin@123',
    },
    {
      role: 'Teacher',
      email: 'nguyen.van.an@school.edu.vn',
      password: 'Teacher@123',
    },
    {
      role: 'Student',
      email: 'sv001@student.school.edu.vn',
      password: 'Student@123',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, md: 3 },
        bgcolor: 'var(--paper-neutral)',
        backgroundImage:
          'radial-gradient(circle at top right, rgba(223,196,157,0.26), transparent 26%), radial-gradient(circle at bottom left, rgba(212,233,226,0.58), transparent 30%)',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1240,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' },
          gap: 3,
        }}
      >
        <Card
          sx={{
            minHeight: { lg: 760 },
            borderRadius: 6,
            overflow: 'hidden',
            color: 'var(--text-white)',
            background:
              'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 26%), linear-gradient(145deg, #1E3932 0%, #2b5148 100%)',
            boxShadow: '0 24px 50px rgba(30,57,50,0.22)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4, lg: 5 }, height: '100%' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.14)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <SchoolRoundedIcon />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontFamily: 'var(--font-serif)', fontWeight: 600 }}
                  >
                    E-Learning LMS
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-white-soft)' }}>
                    Focused, warm, and encouraging learning.
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<DashboardRoundedIcon />}
                  label="Dashboard"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }}
                />
                <Chip
                  icon={<QuizRoundedIcon />}
                  label="Quiz engine"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }}
                />
                <Chip
                  icon={<AnalyticsRoundedIcon />}
                  label="Analytics"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }}
                />
                <Chip
                  icon={<WorkspacePremiumRoundedIcon />}
                  label="Certificates"
                  sx={{ color: '#fff', bgcolor: 'rgba(203,162,88,0.18)' }}
                />
              </Stack>

              <Box sx={{ maxWidth: 640, pt: { md: 2 } }}>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.4rem', xl: '3.8rem' },
                    color: '#fff',
                  }}
                >
                  Learn in a space that feels calm, warm, and motivating.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    mt: 2,
                    color: 'var(--text-white-soft)',
                    maxWidth: 560,
                  }}
                >
                  The platform is designed to reduce fatigue, keep progress clear, and make
                  long study sessions feel more like an inviting academic studio than a cold system.
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 'auto',
                  p: { xs: 2.5, md: 3 },
                  borderRadius: 5,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <Stack spacing={1.5}>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-script)',
                      fontSize: '1.15rem',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  >
                    Every dashboard should feel encouraging.
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-white-soft)' }}>
                    Warm neutrals, clear hierarchy, and simple progress markers keep attention on learning instead of visual noise.
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={3}>
          <Card sx={{ borderRadius: 6, boxShadow: '0 20px 45px rgba(30,57,50,0.12)' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="overline"
                sx={{ color: 'var(--academy-green)' }}
              >
                Welcome back
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  mt: 0.5,
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--deep-slate)',
                }}
              >
                Sign in to your learning space
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                Access your courses, quizzes, analytics, and certificates with your account credentials.
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
                    label="Email address"
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

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{ py: 1.35 }}
                    disabled={state.loading}
                  >
                    {state.loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 6, boxShadow: '0 20px 45px rgba(30,57,50,0.10)' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="overline"
                sx={{ color: 'var(--achievement-gold)' }}
              >
                Demo accounts
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.5, color: 'var(--deep-slate)' }}>
                Use these credentials to preview the system
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Each role opens a different workspace with its own dashboard and tools.
              </Typography>

              <Stack spacing={1.75}>
                {demoAccounts.map((account) => (
                  <Box
                    key={account.role}
                    sx={{
                      p: 2,
                      borderRadius: 4,
                      bgcolor: 'var(--neutral-cool)',
                      border: '1px solid rgba(30,57,50,0.08)',
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: 'var(--deep-slate)' }}>
                      {account.role}
                    </Typography>
                    <Typography variant="body2">{account.email}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {account.password}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}
