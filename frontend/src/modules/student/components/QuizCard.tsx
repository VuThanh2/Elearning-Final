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
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Quiz } from '../../shared/types';
import { formatters } from '../../shared/utils/formatters';

interface QuizCardProps {
  quiz: Quiz;
  sectionId: string;
  onStartQuiz: () => void;
  onViewResult: () => void;
}

export default function QuizCard({ quiz, sectionId, onStartQuiz, onViewResult }: QuizCardProps) {
  const isExpired = new Date(quiz.deadlineAt) < new Date();

  const questionCount = quiz.totalQuestions ?? quiz.questions?.length ?? 0;

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {quiz.title || 'Untitled quiz'}
          </Typography>
          <Chip
            label={isExpired ? 'Closed' : 'Open'}
            size="small"
            color={isExpired ? 'default' : 'success'}
            variant="outlined"
            sx={{ flexShrink: 0 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
          {(quiz.description || 'No description provided.').length > 100
            ? (quiz.description || 'No description provided.').substring(0, 100) + '...'
            : (quiz.description || 'No description provided.')}
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">Time limit</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{quiz.timeLimitMinutes} minutes</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">Questions</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{questionCount}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">Attempts</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{quiz.maxAttempts}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">Deadline</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: isExpired ? 'error.main' : 'text.primary' }}>
              {formatters.formatDate(new Date(quiz.deadlineAt))}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ pt: 0, gap: 1 }}>
        <Button
          size="small"
          startIcon={<PlayArrowIcon />}
          onClick={onStartQuiz}
          disabled={isExpired}
          color="primary"
          variant="contained"
          sx={{ minHeight: 40 }}
        >
          Take Quiz
        </Button>
        <Button
          size="small"
          startIcon={<AssignmentIcon />}
          onClick={onViewResult}
          color="secondary"
          variant="outlined"
          sx={{ minHeight: 40 }}
        >
          View Result
        </Button>
      </CardActions>
    </Card>
  );
}
