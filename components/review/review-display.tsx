'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye } from 'lucide-react';

interface ReviewRevision {
  scoresJson: Record<string, number>;
  commentText: string | null;
  createdAt: Date;
}

interface Reviewer {
  id: string;
  name: string | null;
  email: string;
}

interface Review {
  id: string;
  submittedAt: Date | null;
  reviewer?: Reviewer;
  revisions: ReviewRevision[];
}

interface ReviewDisplayProps {
  myReview: Review | null;
  others: Review[];
  canSeeOthers: boolean;
  aggregate: {
    reviewsCount: number;
    compositeScore: number | null;
  } | null;
}

export default function ReviewDisplay({
  myReview,
  others,
  canSeeOthers,
  aggregate,
}: ReviewDisplayProps) {
  return (
    <div className="space-y-6">
      {/* My Review */}
      {myReview && (
        <Card>
          <CardHeader>
            <CardTitle>My Review</CardTitle>
          </CardHeader>
          <CardContent>
            {myReview.revisions.length > 0 && (
              <div className="space-y-4">
                {Object.entries(myReview.revisions[0].scoresJson).map(([questionId, score]) => (
                  <div key={questionId}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{questionId}</span>
                      <Badge>{score}</Badge>
                    </div>
                    <Separator className="mt-2" />
                  </div>
                ))}
                {myReview.revisions[0].commentText && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Comment</p>
                    <p className="text-sm text-muted-foreground">
                      {myReview.revisions[0].commentText}
                    </p>
                  </div>
                )}
                {myReview.submittedAt && (
                  <Badge className="mt-4" variant="default">
                    Submitted {new Date(myReview.submittedAt).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Other Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Other Reviews
            {!canSeeOthers && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!canSeeOthers ? (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                {myReview?.submittedAt
                  ? 'Other reviews will be visible once the visibility policy conditions are met.'
                  : 'Submit your review to see other reviewers\' responses.'}
              </AlertDescription>
            </Alert>
          ) : others.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {others.map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-medium">
                      {review.reviewer?.name || review.reviewer?.email || 'Anonymous'}
                    </p>
                    <Badge variant="outline">
                      {new Date(review.submittedAt!).toLocaleDateString()}
                    </Badge>
                  </div>
                  {review.revisions.length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(review.revisions[0].scoresJson).map(
                        ([questionId, score]) => (
                          <div key={questionId} className="flex items-center justify-between">
                            <span className="text-sm">{questionId}</span>
                            <Badge>{score}</Badge>
                          </div>
                        )
                      )}
                      {review.revisions[0].commentText && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium mb-1">Comment</p>
                          <p className="text-sm text-muted-foreground">
                            {review.revisions[0].commentText}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregate Stats */}
      {aggregate && (
        <Card>
          <CardHeader>
            <CardTitle>Aggregate Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{aggregate.reviewsCount}</p>
              </div>
              {aggregate.compositeScore !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">
                    {aggregate.compositeScore.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

