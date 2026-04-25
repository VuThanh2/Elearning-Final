import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Avatar, Button, InputBase, Paper, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider, Stack } from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 260;

const navItems = [
  { label: 'Dashboard', icon: <DashboardOutlinedIcon />, path: '/dashboard' },
  { label: 'My Courses', icon: <SchoolOutlinedIcon />, path: '/courses' },
  { label: 'Quizzes', icon: <QuizOutlinedIcon />, path: '/quizzes' },
  { label: 'Grading', icon: <AssessmentOutlinedIcon />, path: '/grading' },
  { label: 'Settings', icon: <SettingsOutlinedIcon />, path: '/settings' },
];

export function ModernAppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { state } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(148, 163, 184, 0.14)',
            bgcolor: '#ffffff',
            p: 2,
          },
        }}
      >
        <Stack spacing={3} sx={{ height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
              E
            </Box>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>E-Learning</Typography>
              <Typography variant="caption" color="text.secondary">Academic Platform</Typography>
            </Box>
          </Box>
          <List sx={{ px: 0 }}>
            {navItems.map((item) => (
              <ListItemButton key={item.label} sx={{ borderRadius: 3, mb: 0.5 }} onClick={() => navigate(item.path)}>
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ mt: 'auto' }}>
            <Divider sx={{ mb: 2 }} />
            <Button fullWidth variant="contained" onClick={() => navigate('/login')}>Sign out</Button>
          </Box>
        </Stack>
      </Drawer>

      <Box sx={{ flex: 1 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'rgba(246, 247, 251, 0.85)', backdropFilter: 'blur(12px)', color: 'text.primary', borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
          <Toolbar sx={{ gap: 2, minHeight: 76 }}>
            <Paper sx={{ flex: 1, display: 'flex', alignItems: 'center', px: 2, py: 0.75, borderRadius: 999, boxShadow: 'none', bgcolor: '#fff', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
              <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <InputBase placeholder="Search courses, students, or analytics..." sx={{ flex: 1 }} />
            </Paper>
            <IconButton><NotificationsNoneOutlinedIcon /></IconButton>
            <Avatar sx={{ width: 36, height: 36 }}>{state.user?.fullName?.[0] ?? 'U'}</Avatar>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
