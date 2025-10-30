'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormSchemaJson, RubricSchemaJson } from '@/lib/zod-schemas';
import { z } from 'zod';

type FormSchema = z.infer<typeof FormSchemaJson>;
type RubricSchema = z.infer<typeof RubricSchemaJson>;

interface FormPreviewProps {
  formSchema: FormSchema;
  rubricSchema: RubricSchema;
}

export default function FormPreview({ formSchema, rubricSchema }: FormPreviewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="form" className="w-full">
            <TabsList>
              <TabsTrigger value="form">Form View</TabsTrigger>
              <TabsTrigger value="rubric">Review Rubric</TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="mt-6">
              <div className="space-y-6">
                {formSchema.title && (
                  <div>
                    <h2 className="text-2xl font-bold">{formSchema.title}</h2>
                    {formSchema.description && (
                      <p className="mt-2 text-muted-foreground">
                        {formSchema.description}
                      </p>
                    )}
                  </div>
                )}

                {formSchema.fields.length === 0 ? (
                  <p className="text-muted-foreground">
                    No fields yet. Add fields in the Form Fields tab.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {formSchema.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={`preview-${field.id}`}>
                          {field.label}
                          {field.required && (
                            <span className="text-destructive"> *</span>
                          )}
                        </Label>
                        {field.description && (
                          <p className="text-sm text-muted-foreground">
                            {field.description}
                          </p>
                        )}

                        {field.type === 'textarea' ? (
                          <Textarea
                            id={`preview-${field.id}`}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            disabled
                          />
                        ) : field.type === 'select' ? (
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={`preview-${field.id}`}
                            type={
                              field.type === 'number'
                                ? 'number'
                                : field.type === 'email'
                                ? 'email'
                                : field.type === 'url'
                                ? 'url'
                                : 'text'
                            }
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            disabled
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rubric" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Review Rubric</h3>
                  <p className="text-sm text-muted-foreground">
                    Scale: {rubricSchema.scaleMin} to {rubricSchema.scaleMax} (step:{' '}
                    {rubricSchema.scaleStep})
                  </p>
                </div>

                {rubricSchema.questions.length === 0 ? (
                  <p className="text-muted-foreground">
                    No rubric questions yet. Add questions in the Rubric tab.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {rubricSchema.questions.map((question, index) => (
                      <Card key={question.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-base font-medium">
                                {index + 1}. {question.label}
                                {question.required && (
                                  <span className="text-destructive"> *</span>
                                )}
                              </Label>
                              {question.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {question.description}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Score</Label>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  {rubricSchema.scaleMin}
                                </span>
                                <Input
                                  type="range"
                                  min={rubricSchema.scaleMin}
                                  max={rubricSchema.scaleMax}
                                  step={rubricSchema.scaleStep}
                                  defaultValue={
                                    Math.floor(
                                      (rubricSchema.scaleMin +
                                        rubricSchema.scaleMax) /
                                        2
                                    )
                                  }
                                  disabled
                                  className="flex-1"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {rubricSchema.scaleMax}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Weight: {(question.weight * 100).toFixed(0)}%
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

