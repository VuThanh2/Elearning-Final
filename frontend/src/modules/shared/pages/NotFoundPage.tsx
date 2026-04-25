import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography variant="h1" sx={{ mb: 2 }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Page Not Found
        </Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>
          Go to Login
        </Button>
      </Box>
    </Container>
  );
}
