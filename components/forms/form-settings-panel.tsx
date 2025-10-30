'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';

interface FormSettingsPanelProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

export default function FormSettingsPanel({
  register,
  errors,
  watch,
  setValue,
}: FormSettingsPanelProps) {
  const visibilityMode = watch('visibilityMode');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Form Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Innovation Challenge 2025"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{String(errors.name.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="slug"
              {...register('slug')}
              placeholder="innovation-challenge-2025"
            />
            <p className="text-xs text-muted-foreground">
              Used in the form URL. Only lowercase letters, numbers, and hyphens.
            </p>
            {errors.slug && (
              <p className="text-sm text-destructive">{String(errors.slug.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openAt">Open Date (optional)</Label>
            <Input
              id="openAt"
              type="datetime-local"
              {...register('openAt')}
            />
            <p className="text-xs text-muted-foreground">
              When the form will start accepting submissions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closeAt">Close Date (optional)</Label>
            <Input
              id="closeAt"
              type="datetime-local"
              {...register('closeAt')}
            />
            <p className="text-xs text-muted-foreground">
              When the form will stop accepting submissions
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minReviewsRequired">
              Minimum Reviews Required
            </Label>
            <Input
              id="minReviewsRequired"
              type="number"
              min="1"
              {...register('minReviewsRequired', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Each submission must receive at least this many reviews
            </p>
            {errors.minReviewsRequired && (
              <p className="text-sm text-destructive">
                {String(errors.minReviewsRequired.message)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibilityMode">Visibility Mode</Label>
            <Select
              value={visibilityMode}
              onValueChange={(value) => setValue('visibilityMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REVEAL_AFTER_ME_SUBMIT">
                  Reveal After I Submit
                </SelectItem>
                <SelectItem value="REVEAL_AFTER_MIN_REVIEWS">
                  Reveal After Min Reviews
                </SelectItem>
                <SelectItem value="NEVER">Never Reveal</SelectItem>
                <SelectItem value="AVERAGES_ONLY_UNTIL_LOCK">
                  Averages Only Until Lock
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls when reviewers can see others' reviews
            </p>
          </div>

          {['REVEAL_AFTER_MIN_REVIEWS', 'AVERAGES_ONLY_UNTIL_LOCK'].includes(
            visibilityMode
          ) && (
            <div className="space-y-2">
              <Label htmlFor="visibilityThreshold">Visibility Threshold</Label>
              <Input
                id="visibilityThreshold"
                type="number"
                min="1"
                {...register('visibilityThreshold', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Number of reviews before visibility unlocks
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

