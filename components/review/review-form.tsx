'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Save, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface RubricVersion {
  id: string;
  version: number;
  questionsJson: any;
  scaleMin: number;
  scaleMax: number;
  scaleStep: number;
}

interface ReviewRevision {
  scoresJson: Record<string, number>;
  commentText: string | null;
  createdAt: Date;
}

interface Review {
  id: string;
  submittedAt: Date | null;
  revisions: ReviewRevision[];
}

interface ReviewFormProps {
  submissionId: string;
  rubricVersion: RubricVersion;
  existingReview?: Review | null;
}

export default function ReviewForm({
  submissionId,
  rubricVersion,
  existingReview,
}: ReviewFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questions = Array.isArray(rubricVersion.questionsJson?.questions)
    ? rubricVersion.questionsJson.questions
    : rubricVersion.questionsJson || [];

  const latestRevision = existingReview?.revisions?.[0];
  const isSubmitted = existingReview?.submittedAt !== null;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      scores: latestRevision?.scoresJson || {},
      commentText: latestRevision?.commentText || '',
    },
  });

  const scores = watch('scores');

  const onSubmit = async (data: { scores: Record<string, number>; commentText: string }, submit: boolean) => {
    if (submit) {
      setSubmitting(true);
    } else {
      setSaving(true);
    }

    try {
      const response = await fetch(`/api/submissions/${submissionId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores: data.scores,
          commentText: data.commentText || undefined,
          submit,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save review');
      }

      toast({
        title: submit ? 'Review submitted' : 'Draft saved',
        description: submit
          ? 'Your review has been submitted successfully.'
          : 'Your draft has been saved.',
      });

      if (submit) {
        window.location.reload();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save review',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              You have already submitted your review. Review details are shown below.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) => onSubmit(data, false))}
          className="space-y-6"
        >
          {/* Scores */}
          <div className="space-y-4">
            {questions.map((question: any) => (
              <div key={question.id} className="space-y-2">
                <Label htmlFor={`score-${question.id}`}>
                  {question.label}
                  {question.required && <span className="text-destructive"> *</span>}
                </Label>
                {question.description && (
                  <p className="text-sm text-muted-foreground">{question.description}</p>
                )}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-8">
                    {rubricVersion.scaleMin}
                  </span>
                  <Input
                    id={`score-${question.id}`}
                    type="range"
                    min={rubricVersion.scaleMin}
                    max={rubricVersion.scaleMax}
                    step={rubricVersion.scaleStep}
                    value={scores[question.id] || rubricVersion.scaleMin}
                    onChange={(e) => {
                      const newScores = { ...scores, [question.id]: parseInt(e.target.value) };
                      setValue('scores', newScores);
                    }}
                    className="flex-1"
                    required={question.required}
                  />
                  <span className="text-sm text-muted-foreground w-8">
                    {rubricVersion.scaleMax}
                  </span>
                  <span className="w-12 text-center font-medium">
                    {scores[question.id] || rubricVersion.scaleMin}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Weight: {(question.weight * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              {...register('commentText')}
              placeholder="Add any additional comments..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="outline"
              disabled={saving || submitting}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, true))}
              disabled={saving || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

