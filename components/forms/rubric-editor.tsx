'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RubricSchemaJson, RubricQuestionSchema } from '@/lib/zod-schemas';
import { Plus, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { Progress } from '@/components/ui/progress';

type RubricSchema = z.infer<typeof RubricSchemaJson>;
type RubricQuestion = z.infer<typeof RubricQuestionSchema>;

interface RubricEditorProps {
  schema: RubricSchema;
  onChange: (schema: RubricSchema) => void;
}

export default function RubricEditor({ schema, onChange }: RubricEditorProps) {
  const addQuestion = () => {
    const newQuestion: RubricQuestion = {
      id: `question-${Date.now()}`,
      label: 'New Question',
      weight: 0,
      required: true,
    };
    onChange({
      ...schema,
      questions: [...schema.questions, newQuestion],
    });
  };

  const removeQuestion = (index: number) => {
    onChange({
      ...schema,
      questions: schema.questions.filter((_, i) => i !== index),
    });
  };

  const updateQuestion = (index: number, updates: Partial<RubricQuestion>) => {
    const newQuestions = [...schema.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    onChange({
      ...schema,
      questions: newQuestions,
    });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === schema.questions.length - 1)
    ) {
      return;
    }

    const newQuestions = [...schema.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];
    onChange({
      ...schema,
      questions: newQuestions,
    });
  };

  const totalWeight = schema.questions.reduce((sum, q) => sum + q.weight, 0);
  const weightWarning = Math.abs(totalWeight - 1.0) > 0.01;

  return (
    <div className="space-y-6">
      {/* Scale Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Scale Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scale-min">Minimum</Label>
              <Input
                id="scale-min"
                type="number"
                value={schema.scaleMin}
                onChange={(e) =>
                  onChange({
                    ...schema,
                    scaleMin: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scale-max">Maximum</Label>
              <Input
                id="scale-max"
                type="number"
                value={schema.scaleMax}
                onChange={(e) =>
                  onChange({
                    ...schema,
                    scaleMax: parseInt(e.target.value) || 5,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scale-step">Step</Label>
              <Input
                id="scale-step"
                type="number"
                value={schema.scaleStep}
                onChange={(e) =>
                  onChange({
                    ...schema,
                    scaleStep: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Reviewers will score each question on a scale from {schema.scaleMin} to{' '}
            {schema.scaleMax} with steps of {schema.scaleStep}.
          </p>
        </CardContent>
      </Card>

      {/* Weight Distribution */}
      {schema.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weight Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Total Weight: {totalWeight.toFixed(2)}</span>
                <span className={weightWarning ? 'text-destructive' : 'text-green-600'}>
                  {weightWarning ? 'Should be 1.00' : '✓ Balanced'}
                </span>
              </div>
              <Progress value={totalWeight * 100} className="h-2" />
            </div>
            {weightWarning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Question weights should sum to 1.0 for accurate scoring. Current total:{' '}
                  {totalWeight.toFixed(2)}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rubric Questions</CardTitle>
            <Button type="button" onClick={addQuestion} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schema.questions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No questions yet. Click "Add Question" to get started.
            </div>
          ) : (
            schema.questions.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Question Header */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveQuestion(index, 'up')}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <div className="flex-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Question Label */}
                    <div className="space-y-2">
                      <Label>Question Label</Label>
                      <Input
                        value={question.label}
                        onChange={(e) =>
                          updateQuestion(index, { label: e.target.value })
                        }
                        placeholder="e.g., Strategic Fit"
                      />
                    </div>

                    {/* Question Description */}
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={question.description || ''}
                        onChange={(e) =>
                          updateQuestion(index, { description: e.target.value })
                        }
                        placeholder="Additional context for reviewers"
                        rows={2}
                      />
                    </div>

                    {/* Weight and Required */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Weight (0.0 - 1.0)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={question.weight}
                          onChange={(e) =>
                            updateQuestion(index, {
                              weight: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          This question accounts for{' '}
                          {(question.weight * 100).toFixed(0)}% of the total score
                        </p>
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) =>
                              updateQuestion(index, { required: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label>Required</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

