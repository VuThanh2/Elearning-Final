import React from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { Question, QuestionType } from '../../shared/types';
import AnswerOptionForm from './AnswerOptionForm';

interface QuestionEditorProps {
  question: Question;
  questionNumber: number;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
}

const formatQuestionType = (type: QuestionType) =>
  type === 'SINGLE_CHOICE' ? 'Single choice' : 'Multiple choice';

export default function QuestionEditor({
  question,
  questionNumber,
  onUpdate,
  onDelete,
}: QuestionEditorProps) {
  const handleAddOption = () => {
    const optionId = Math.random().toString(36).slice(2, 9);

    onUpdate({
      ...question,
      answerOptions: [
        ...question.answerOptions,
        {
          id: optionId,
          optionId,
          content: '',
          isCorrect: false,
        },
      ],
    });
  };

  const handleUpdateOption = (optionId: string, content: string, isCorrect: boolean) => {
    const nextOptions = question.answerOptions.map((option) => {
      if (option.id !== optionId) {
        return question.questionType === 'SINGLE_CHOICE' && isCorrect
          ? { ...option, isCorrect: false }
          : option;
      }

      return { ...option, content, isCorrect };
    });

    onUpdate({
      ...question,
      answerOptions: nextOptions,
    });
  };

  const handleDeleteOption = (optionId: string) => {
    onUpdate({
      ...question,
      answerOptions: question.answerOptions.filter((option) => option.id !== optionId),
    });
  };

  const hasCorrectAnswer = question.answerOptions.some((option) => option.isCorrect);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 5,
        border: '1px solid rgba(30,57,50,0.08)',
        borderLeft: '4px solid var(--academy-green)',
        backgroundColor: 'rgba(255,255,255,0.98)',
      }}
    >
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={1.5}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
            <Box
              sx={{
                minWidth: 44,
                height: 44,
                px: 1.25,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(0,117,74,0.08)',
                color: 'var(--academy-green)',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              {String(questionNumber).padStart(2, '0')}
            </Box>
            <Chip label={formatQuestionType(question.questionType)} size="small" variant="outlined" />
            {!hasCorrectAnswer && (
              <Chip label="Needs correct answer" size="small" color="warning" variant="outlined" />
            )}
          </Stack>

          <IconButton color="error" onClick={onDelete} aria-label="Delete question">
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </Stack>

        <TextField
          fullWidth
          label="Question prompt"
          value={question.content}
          onChange={(event) => onUpdate({ ...question, content: event.target.value })}
          multiline
          minRows={3}
        />

        <FormControl fullWidth>
          <InputLabel>Question type</InputLabel>
          <Select
            value={question.questionType}
            label="Question type"
            onChange={(event) =>
              onUpdate({ ...question, questionType: event.target.value as QuestionType })
            }
          >
            <MenuItem value="MULTIPLE_CHOICE">Multiple choice</MenuItem>
            <MenuItem value="SINGLE_CHOICE">Single choice</MenuItem>
          </Select>
        </FormControl>

        <Stack spacing={1.25}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--deep-slate)' }}>
              Answer options
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {question.questionType === 'SINGLE_CHOICE'
                ? 'Pick one correct answer for this question.'
                : 'You can mark one or more answers as correct.'}
            </Typography>
          </Box>

          <Stack spacing={1.25}>
            {question.answerOptions.map((option, index) => (
              <AnswerOptionForm
                key={option.id}
                option={option}
                optionNumber={index + 1}
                questionType={question.questionType}
                onUpdate={(content, isCorrect) =>
                  handleUpdateOption(option.id, content, isCorrect)
                }
                onDelete={() => handleDeleteOption(option.id)}
              />
            ))}
          </Stack>

          <Button
            startIcon={<AddRoundedIcon />}
            onClick={handleAddOption}
            variant="text"
            sx={{ alignSelf: 'flex-start' }}
          >
            Add option
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
