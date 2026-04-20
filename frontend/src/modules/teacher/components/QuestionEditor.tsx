import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Question, QuestionType } from '../../shared/types';
import AnswerOptionForm from './AnswerOptionForm';

interface QuestionEditorProps {
  question: Question;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
}

export default function QuestionEditor({
  question,
  onUpdate,
  onDelete,
}: QuestionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddOption = () => {
    const newOptionId = Math.random().toString(36).substring(7);
    const newOption = {
      id: newOptionId,
      optionId: newOptionId,
      content: '',
      isCorrect: false,
    };

    onUpdate({
      ...question,
      answerOptions: [...question.answerOptions, newOption],
    });
  };

  const handleUpdateOption = (optionId: string, content: string, isCorrect: boolean) => {
    const nextAnswerOptions = question.answerOptions.map((option) => {
      if (option.id !== optionId) {
        return question.questionType === 'SINGLE_CHOICE' && isCorrect
          ? { ...option, isCorrect: false }
          : option;
      }

      return { ...option, content, isCorrect };
    });

    onUpdate({
      ...question,
      answerOptions: nextAnswerOptions,
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
    <Card
      sx={{
        mb: 2,
        backgroundColor: isExpanded ? '#fafafa' : '#fff',
        borderRadius: 4,
      }}
    >
      <CardContent>
        {!isExpanded && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              p: 1,
              '&:hover': { backgroundColor: '#f5f5f5' },
              borderRadius: 2,
            }}
            onClick={() => setIsExpanded(true)}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {question.content || '(No content yet)'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {question.questionType} | {question.answerOptions.length} options
              </Typography>
            </Box>
            {!hasCorrectAnswer && (
              <Typography variant="caption" sx={{ color: 'warning.main', ml: 1, fontWeight: 700 }}>
                Needs a correct answer
              </Typography>
            )}
          </Box>
        )}

        {isExpanded && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Question"
              value={question.content}
              onChange={(event) => onUpdate({ ...question, content: event.target.value })}
              multiline
              rows={3}
              variant="outlined"
            />

            <FormControl>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={question.questionType}
                onChange={(event) =>
                  onUpdate({ ...question, questionType: event.target.value as QuestionType })
                }
                label="Question Type"
              >
                <MenuItem value="SINGLE_CHOICE">Single Choice (Radio)</MenuItem>
                <MenuItem value="MULTIPLE_CHOICE">Multiple Choice (Checkbox)</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Answer Options
                </Typography>
                {!hasCorrectAnswer && (
                  <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
                    Mark at least one option as correct
                  </Typography>
                )}
              </Box>

              <Stack spacing={1}>
                {question.answerOptions.map((option) => (
                  <AnswerOptionForm
                    key={option.id}
                    option={option}
                    questionType={question.questionType}
                    onUpdate={(content, isCorrect) =>
                      handleUpdateOption(option.id, content, isCorrect)
                    }
                    onDelete={() => handleDeleteOption(option.id)}
                  />
                ))}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={handleAddOption}
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Add Option
              </Button>
            </Box>
          </Stack>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Button onClick={() => setIsExpanded((prev) => !prev)}>
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
        <IconButton size="small" color="error" onClick={onDelete}>
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}
