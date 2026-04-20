import React from 'react';
import {
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  IconButton,
  Radio,
  Stack,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { AnswerOption, QuestionType } from '../../shared/types';

interface AnswerOptionFormProps {
  option: AnswerOption;
  questionType: QuestionType;
  onUpdate: (content: string, isCorrect: boolean) => void;
  onDelete: () => void;
}

export default function AnswerOptionForm({
  option,
  questionType,
  onUpdate,
  onDelete,
}: AnswerOptionFormProps) {
  const CorrectControl = questionType === 'SINGLE_CHOICE' ? Radio : Checkbox;

  return (
    <Card sx={{ mb: 1.5, borderRadius: 3, boxShadow: 'none', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            fullWidth
            size="small"
            label="Option text"
            value={option.content}
            onChange={(event) => onUpdate(event.target.value, option.isCorrect)}
            multiline
            rows={2}
          />

          <FormControlLabel
            control={
              <CorrectControl
                checked={option.isCorrect}
                onChange={(event) => onUpdate(option.content, event.target.checked)}
                title="Mark as correct answer"
              />
            }
            label="Correct"
            sx={{ mr: 0, whiteSpace: 'nowrap' }}
          />

          <IconButton
            size="small"
            color="error"
            onClick={onDelete}
            title="Delete option"
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
