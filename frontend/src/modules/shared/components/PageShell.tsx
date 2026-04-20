import React from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../utils/constants';

const drawerWidth = 280;
const contentMaxWidth = 1280;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  isActive: (pathname: string, view: string | null) => boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const getStudentGroups = (): NavGroup[] => [
  {
    title: 'Main',
    items: [
      {
        label: 'Dashboard',
        path: '/student/dashboard',
        icon: <DashboardRoundedIcon />,
        isActive: (pathname, view) => pathname === '/student/dashboard' && !view,
      },
      {
        label: 'Sections',
        path: '/student/dashboard?view=sections',
        icon: <SchoolRoundedIcon />,
        isActive: (pathname, view) => pathname === '/student/dashboard' && view === 'sections',
      },
      {
        label: 'Quizzes',
        path: '/student/dashboard?view=quizzes',
        icon: <QuizRoundedIcon />,
        isActive: (pathname, view) =>
          pathname.startsWith('/student/quiz/') ||
          (pathname.startsWith('/student/sections/') && !pathname.endsWith('/analytics')) ||
          (pathname === '/student/dashboard' && view === 'quizzes'),
      },
      {
        label: 'Analytics',
        path: '/student/dashboard?view=analytics',
        icon: <AnalyticsRoundedIcon />,
        isActive: (pathname, view) =>
          pathname.endsWith('/analytics') ||
          pathname.includes('/results') ||
          (pathname === '/student/dashboard' && view === 'analytics'),
      },
    ],
  },
];

const getTeacherGroups = (): NavGroup[] => [
  {
    title: 'Main',
    items: [
      {
        label: 'Dashboard',
        path: '/teacher/dashboard',
        icon: <DashboardRoundedIcon />,
        isActive: (pathname, view) => pathname === '/teacher/dashboard' && !view,
      },
      {
        label: 'Sections',
        path: '/teacher/dashboard?view=sections',
        icon: <SchoolRoundedIcon />,
        isActive: (pathname, view) =>
          (pathname.startsWith('/teacher/sections/') && !pathname.endsWith('/analytics')) ||
          (pathname === '/teacher/dashboard' && view === 'sections'),
      },
      {
        label: 'Quizzes',
        path: '/teacher/dashboard?view=quizzes',
        icon: <QuizRoundedIcon />,
        isActive: (pathname, view) =>
          pathname.startsWith('/teacher/quiz/') ||
          (pathname === '/teacher/dashboard' && view === 'quizzes'),
      },
      {
        label: 'Analytics',
        path: '/teacher/dashboard?view=analytics',
        icon: <AnalyticsRoundedIcon />,
        isActive: (pathname, view) =>
          pathname.endsWith('/analytics') ||
          (pathname === '/teacher/dashboard' && view === 'analytics'),
      },
    ],
  },
];

const getAdminGroups = (): NavGroup[] => [
  {
    title: 'Admin',
    items: [
      {
        label: 'Overview',
        path: '/admin/dashboard',
        icon: <DashboardRoundedIcon />,
        isActive: (pathname, view) =>
          pathname === '/admin/dashboard' && (!view || view === 'overview'),
      },
      {
        label: 'Hierarchy',
        path: '/admin/dashboard?view=report',
        icon: <AccountTreeRoundedIcon />,
        isActive: (pathname, view) => pathname === '/admin/dashboard' && view === 'report',
      },
      {
        label: 'Performance',
        path: '/admin/dashboard?view=performance',
        icon: <InsightsRoundedIcon />,
        isActive: (pathname, view) => pathname === '/admin/dashboard' && view === 'performance',
      },
    ],
  },
];

const getNavGroups = (role?: string): NavGroup[] => {
  if (role === USER_ROLES.ADMIN) return getAdminGroups();
  if (role === USER_ROLES.TEACHER) return getTeacherGroups();
  return getStudentGroups();
};

const getSearchPlaceholder = (role?: string) => {
  if (role === USER_ROLES.ADMIN) return 'Search hierarchy or metrics...';
  if (role === USER_ROLES.TEACHER) return 'Search sections, quizzes, or analytics...';
  return 'Search sections, quizzes, or results...';
};

export default function PageShell({
  children,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, logout } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const homePath =
    state.user?.role === USER_ROLES.ADMIN
      ? '/admin/dashboard'
      : state.user?.role === USER_ROLES.TEACHER
        ? '/teacher/dashboard'
        : '/student/dashboard';
  const currentView = new URLSearchParams(location.search).get('view');

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isDesktop) setMobileOpen(false);
  };

  const handleMenuToggle = () => setMobileOpen((prev) => !prev);

  const drawerContent = (
    <Stack
      spacing={2.5}
      sx={{
        height: '100%',
        px: 2,
        py: 2.5,
        bgcolor: '#fff',
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 0.5, cursor: 'pointer' }}
        onClick={() => handleNavigate(homePath)}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            bgcolor: '#0f766e',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            boxShadow: '0 14px 28px rgba(15, 118, 110, 0.24)',
          }}
        >
          E
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            E-Learning
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Academic dashboard
          </Typography>
        </Box>
      </Box>

      {getNavGroups(state.user?.role).map((group) => (
        <Box key={group.title}>
          <Typography variant="overline" color="text.secondary" sx={{ px: 1.5, letterSpacing: 1.3 }}>
            {group.title}
          </Typography>
          <List disablePadding sx={{ mt: 1 }}>
            {group.items.map((item) => {
              const active = item.isActive(location.pathname, currentView);

              return (
                <ListItemButton
                  key={item.label}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    borderRadius: 3,
                    mb: 0.5,
                    minHeight: 50,
                    bgcolor: active ? 'rgba(15, 118, 110, 0.08)' : 'transparent',
                    color: active ? '#0f4c5c' : 'text.primary',
                    '&:hover': {
                      bgcolor: active ? 'rgba(15, 118, 110, 0.12)' : 'rgba(15, 23, 42, 0.04)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: active ? '#0f766e' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: active ? 800 : 600 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      ))}

      <Box sx={{ mt: 'auto' }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 5,
            bgcolor: '#ecfeff',
            border: '1px solid rgba(15, 118, 110, 0.08)',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Need help?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Check your notifications or contact support.
          </Typography>
          <Button fullWidth variant="contained" onClick={handleSignOut}>
            Sign out
          </Button>
        </Box>
      </Box>
    </Stack>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: '#f6f8fc',
        backgroundImage:
          'radial-gradient(circle at top right, rgba(15,118,110,0.08), transparent 30%), radial-gradient(circle at bottom left, rgba(14,165,233,0.06), transparent 28%)',
      }}
    >
      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(15, 23, 42, 0.08)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'rgba(246,248,252,0.86)',
            backdropFilter: 'blur(16px)',
            color: 'text.primary',
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          <Toolbar sx={{ minHeight: 84 }}>
            <Box
              sx={{
                width: '100%',
                maxWidth: contentMaxWidth,
                mx: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {!isDesktop && (
                <IconButton onClick={handleMenuToggle} sx={{ bgcolor: '#fff' }}>
                  <MenuRoundedIcon />
                </IconButton>
              )}

              <Paper
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderRadius: 999,
                  boxShadow: 'none',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                }}
              >
                <SearchRoundedIcon sx={{ color: 'text.secondary', mr: 1 }} />
                <InputBase placeholder={getSearchPlaceholder(state.user?.role)} sx={{ flex: 1 }} />
              </Paper>

              {actionLabel && onAction && (
                <Button
                  startIcon={<AddRoundedIcon />}
                  variant="contained"
                  onClick={onAction}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  {actionLabel}
                </Button>
              )}

              <IconButton sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                <NotificationsNoneRoundedIcon />
              </IconButton>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {state.user?.fullName || 'User'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {state.user?.role}
                  </Typography>
                </Box>
                <Avatar sx={{ width: 38, height: 38 }}>{state.user?.fullName?.[0] || 'U'}</Avatar>
              </Stack>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 3 } }}>
          <Box sx={{ maxWidth: contentMaxWidth, mx: 'auto' }}>
            {(title || subtitle || (actionLabel && onAction)) && (
              <Box
                sx={{
                  mb: 3,
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'flex-end' },
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  {title && (
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {title}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography variant="body2" color="text.secondary">
                      {subtitle}
                    </Typography>
                  )}
                </Box>

                {actionLabel && onAction && (
                  <Button
                    startIcon={<AddRoundedIcon />}
                    variant="contained"
                    onClick={onAction}
                    sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                  >
                    {actionLabel}
                  </Button>
                )}
              </Box>
            )}

            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
