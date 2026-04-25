import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Radio,
  Checkbox,
  RadioGroup,
  FormGroup,
  Paper,
  Chip,
} from '@mui/material';
import { Question, AnswerOption } from '../../shared/types';

interface QuestionDisplayProps {
  questionNumber: number;
  totalQuestions: number;
  question: Question;
  selectedAnswers: string[];
  onChange: (optionIds: string[]) => void;
}

export default function QuestionDisplay({
  questionNumber,
  totalQuestions,
  question,
  selectedAnswers,
  onChange,
}: QuestionDisplayProps) {
  const handleSingleChoice = (optionId: string) => {
    onChange([optionId]);
  };

  const handleMultipleChoice = (optionId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedAnswers, optionId]);
    } else {
      onChange(selectedAnswers.filter((id) => id !== optionId));
    }
  };

  const isSingleChoice = question.questionType === 'SINGLE_CHOICE';

  return (
    <Paper
      sx={{
        p: { xs: 2.5, md: 3 },
        mb: 3,
        borderRadius: 4,
        border: '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Chip label={`Question ${questionNumber}`} color="primary" variant="outlined" size="small" sx={{ mb: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
            {questionNumber} of {totalQuestions}
          </Typography>
        </Box>
        <Chip label={isSingleChoice ? 'Single choice' : 'Multiple choice'} size="small" variant="outlined" />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.25 }}>
        {question.content}
      </Typography>

      <Box sx={{ mt: 3 }}>
        {isSingleChoice ? (
          // Single Choice - Radio Buttons
          <RadioGroup
            value={selectedAnswers[0] || ''}
            onChange={(e) => handleSingleChoice(e.target.value)}
          >
            {question.answerOptions.map((option: AnswerOption) => (
              <FormControlLabel
                key={option.id}
                value={option.id}
                control={<Radio />}
                label={<Typography sx={{ ml: 1, fontWeight: 500 }}>{option.content}</Typography>}
                sx={{
                  p: 1.5,
                  mb: 1,
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                  },
                  backgroundColor: selectedAnswers[0] === option.id ? 'rgba(15, 118, 110, 0.08)' : 'transparent',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </RadioGroup>
        ) : (
          // Multiple Choice - Checkboxes
          <FormGroup>
            {question.answerOptions.map((option: AnswerOption) => (
              <FormControlLabel
                key={option.id}
                control={
                  <Checkbox
                    checked={selectedAnswers.includes(option.id)}
                    onChange={(e) => handleMultipleChoice(option.id, e.target.checked)}
                  />
                }
                label={<Typography sx={{ ml: 1, fontWeight: 500 }}>{option.content}</Typography>}
                sx={{
                  p: 1.5,
                  mb: 1,
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                  },
                  backgroundColor: selectedAnswers.includes(option.id)
                    ? 'rgba(15, 118, 110, 0.08)'
                    : 'transparent',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </FormGroup>
        )}
      </Box>

      {/* Hint */}
      {!isSingleChoice && (
        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'info.main', fontWeight: 700 }}>
          Select all that apply
        </Typography>
      )}
    </Paper>
  );
}
