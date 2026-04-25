import React from 'react';
import {
  Snackbar,
  Alert,
  Box,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNotification } from '../hooks/useNotification';

export function NotificationSnackbar() {
  const { state, removeNotification } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box>
      {state.notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={
            isMobile
              ? { vertical: 'bottom', horizontal: 'center' }
              : { vertical: 'top', horizontal: 'right' }
          }
          autoHideDuration={notification.duration || 5000}
          onClose={() => removeNotification(notification.id)}
          sx={{
            bottom: { xs: 88, sm: 'auto' },
            '& .MuiAlert-root': {
              width: { xs: 'calc(100vw - 32px)', sm: 'auto' },
              maxWidth: { xs: 420, sm: 560 },
            },
          }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            action={
              <IconButton
                size="small"
                color="inherit"
                onClick={() => removeNotification(notification.id)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
}
