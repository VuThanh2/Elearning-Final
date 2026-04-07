import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Quiz } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';

interface QuizCardProps {
  quiz: Quiz;
  sectionId: string;
  onStartQuiz: () => void;
}

export default function QuizCard({ quiz, sectionId, onStartQuiz }: QuizCardProps) {
  const isExpired = new Date(quiz.deadlineAt) < new Date();

  console.log('[QuizCard] Rendering quiz:', quiz.title, '| isExpired:', isExpired);
  console.log('[QuizCard] Props received - quiz.id:', quiz.id, 'sectionId:', sectionId);

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Title */}
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          {quiz.title}
        </Typography>

        {/* Description */}
        {quiz.description && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {quiz.description.length > 100
              ? quiz.description.substring(0, 100) + '...'
              : quiz.description}
          </Typography>
        )}

        {/* Quiz Details */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          {/* Time Limit */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="textSecondary">
              ⏱️ Time Limit:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {quiz.timeLimitMinutes} minutes
            </Typography>
          </Box>

          {/* Max Score */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="textSecondary">
              📊 Max Score:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {quiz.maxScore} points
            </Typography>
          </Box>

          {/* Max Attempts */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="textSecondary">
              🔁 Max Attempts:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {quiz.maxAttempts}
            </Typography>
          </Box>

          {/* Deadline */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="textSecondary">
              📅 Deadline:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: isExpired ? 'error.main' : 'textPrimary',
              }}
            >
              {formatters.formatDate(new Date(quiz.deadlineAt))}
            </Typography>
          </Box>
        </Stack>

        {/* Status Badge */}
        {isExpired && (
          <Chip label="Expired" size="small" color="error" variant="outlined" sx={{ mt: 1 }} />
        )}
      </CardContent>

      <CardActions sx={{ pt: 0 }}>
        <Button
          size="small"
          startIcon={<PlayArrowIcon />}
          onClick={onStartQuiz}
          disabled={isExpired}
          color="primary"
          variant="contained"
        >
          Take Quiz
        </Button>
      </CardActions>
    </Card>
  );
}
