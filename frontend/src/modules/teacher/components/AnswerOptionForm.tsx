import React from 'react';
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Radio,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { AnswerOption, QuestionType } from '../../shared/types';

interface AnswerOptionFormProps {
  option: AnswerOption;
  optionNumber: number;
  questionType: QuestionType;
  onUpdate: (content: string, isCorrect: boolean) => void;
  onDelete: () => void;
}

export default function AnswerOptionForm({
  option,
  optionNumber,
  questionType,
  onUpdate,
  onDelete,
}: AnswerOptionFormProps) {
  const SelectionControl = questionType === 'SINGLE_CHOICE' ? Radio : Checkbox;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 4,
        border: option.isCorrect
          ? '1px solid rgba(0,117,74,0.28)'
          : '1px solid rgba(30,57,50,0.08)',
        backgroundColor: option.isCorrect ? 'rgba(0,117,74,0.04)' : 'rgba(255,255,255,0.98)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 88 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(0,117,74,0.08)',
              color: 'var(--academy-green)',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {String(optionNumber).padStart(2, '0')}
          </Box>
          <SelectionControl
            checked={option.isCorrect}
            onChange={(event) => onUpdate(option.content, event.target.checked)}
          />
        </Stack>

        <TextField
          fullWidth
          size="small"
          label="Option text"
          value={option.content}
          onChange={(event) => onUpdate(event.target.value, option.isCorrect)}
          placeholder="Write the answer option here"
        />

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
          {option.isCorrect && (
            <Chip label="Correct" size="small" color="success" variant="outlined" />
          )}
          {!option.isCorrect && (
            <Typography variant="caption" color="text.secondary">
              Candidate
            </Typography>
          )}
          <Tooltip title="Delete option">
            <IconButton color="error" onClick={onDelete}>
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
