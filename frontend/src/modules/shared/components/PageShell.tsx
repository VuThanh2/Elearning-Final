import React from 'react';
import { Box, Button, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography, AppBar, Toolbar, InputBase, Paper, Avatar, IconButton, Chip } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../utils/constants';

const drawerWidth = 280;

const getNavGroups = (role?: string) => {
  const base = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', path: role === USER_ROLES.ADMIN ? '/admin/dashboard' : role === USER_ROLES.TEACHER ? '/teacher/dashboard' : '/student/dashboard', icon: <DashboardRoundedIcon /> },
        { label: 'Courses', path: role === USER_ROLES.ADMIN ? '/admin/dashboard' : role === USER_ROLES.TEACHER ? '/teacher/dashboard' : '/student/dashboard', icon: <SchoolRoundedIcon /> },
        { label: 'Quizzes', path: role === USER_ROLES.ADMIN ? '/admin/dashboard' : role === USER_ROLES.TEACHER ? '/teacher/dashboard' : '/student/dashboard', icon: <QuizRoundedIcon /> },
        { label: 'Analytics', path: role === USER_ROLES.ADMIN ? '/admin/dashboard' : role === USER_ROLES.TEACHER ? '/teacher/dashboard' : '/student/dashboard', icon: <AnalyticsRoundedIcon /> },
      ],
    },
  ];

  return base;
};

export default function PageShell({ children, title, subtitle, actionLabel, onAction }: { children: React.ReactNode; title?: string; subtitle?: string; actionLabel?: string; onAction?: () => void; }) {
  const navigate = useNavigate();
  const { state } = useAuth();
  const homePath = state.user?.role === USER_ROLES.ADMIN ? '/admin/dashboard' : state.user?.role === USER_ROLES.TEACHER ? '/teacher/dashboard' : '/student/dashboard';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f6f8fc' }}>
      <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', bgcolor: '#fff', borderRight: '1px solid rgba(15, 23, 42, 0.08)', p: 2.5 } }}>
        <Stack sx={{ height: '100%' }} spacing={2.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1, cursor: 'pointer' }} onClick={() => navigate(homePath)}>
            <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: '#0f766e', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>E</Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>E-Learning</Typography>
              <Typography variant="caption" color="text.secondary">Academic dashboard</Typography>
            </Box>
          </Box>
          {getNavGroups(state.user?.role).map((group) => (
            <Box key={group.title}>
              <Typography variant="overline" color="text.secondary" sx={{ px: 1.5, letterSpacing: 1.2 }}>{group.title}</Typography>
              <List disablePadding sx={{ mt: 1 }}>
                {group.items.map((item) => (
                  <ListItemButton key={item.label} onClick={() => navigate(item.path)} sx={{ borderRadius: 3, mb: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ))}
          <Box sx={{ mt: 'auto' }}>
            <Box sx={{ p: 2, borderRadius: 4, bgcolor: '#ecfeff' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Need help?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Check your notifications or contact support.</Typography>
              <Button fullWidth variant="contained" onClick={() => navigate('/login')}>Sign out</Button>
            </Box>
          </Box>
        </Stack>
      </Drawer>
      <Box sx={{ flex: 1 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'rgba(246,248,252,0.8)', backdropFilter: 'blur(16px)', color: 'text.primary', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Toolbar sx={{ minHeight: 84, gap: 2 }}>
            <Paper sx={{ flex: 1, display: 'flex', alignItems: 'center', px: 2, py: 1, borderRadius: 999, boxShadow: 'none', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <SearchRoundedIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <InputBase placeholder="Search..." sx={{ flex: 1 }} />
            </Paper>
            {actionLabel && <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={onAction}>{actionLabel}</Button>}
            <IconButton><NotificationsNoneRoundedIcon /></IconButton>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{state.user?.fullName || 'User'}</Typography>
                <Typography variant="caption" color="text.secondary">{state.user?.role}</Typography>
              </Box>
              <Avatar sx={{ width: 38, height: 38 }}>{state.user?.fullName?.[0] || 'U'}</Avatar>
            </Stack>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {(title || subtitle) && (
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                {title && <Typography variant="h4" sx={{ fontWeight: 800 }}>{title}</Typography>}
                {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
              </Box>
              {actionLabel && <Chip label={actionLabel} color="primary" variant="outlined" />}
            </Box>
          )}
          {children}
        </Box>
      </Box>
    </Box>
  );
}
