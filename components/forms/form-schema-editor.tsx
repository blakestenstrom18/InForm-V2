'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSchemaJson, FormFieldSchema } from '@/lib/zod-schemas';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { z } from 'zod';

type FormSchema = z.infer<typeof FormSchemaJson>;
type FormField = z.infer<typeof FormFieldSchema>;

interface FormSchemaEditorProps {
  schema: FormSchema;
  onChange: (schema: FormSchema) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
] as const;

export default function FormSchemaEditor({ schema, onChange }: FormSchemaEditorProps) {
  const addField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
    };
    onChange({
      ...schema,
      fields: [...schema.fields, newField],
    });
  };

  const removeField = (index: number) => {
    onChange({
      ...schema,
      fields: schema.fields.filter((_, i) => i !== index),
    });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...schema.fields];
    newFields[index] = { ...newFields[index], ...updates };
    onChange({
      ...schema,
      fields: newFields,
    });
  };

  const updateFieldOptions = (index: number, options: string[]) => {
    const field = schema.fields[index];
    if (field.type === 'select' || field.type === 'radio') {
      updateField(index, { options });
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === schema.fields.length - 1)
    ) {
      return;
    }

    const newFields = [...schema.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];
    onChange({
      ...schema,
      fields: newFields,
    });
  };

  return (
    <div className="space-y-6">
      {/* Form Title & Description */}
      <Card>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Form Title</Label>
            <Input
              id="form-title"
              value={schema.title || ''}
              onChange={(e) =>
                onChange({ ...schema, title: e.target.value })
              }
              placeholder="Innovation Challenge Application"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-description">Description</Label>
            <Textarea
              id="form-description"
              value={schema.description || ''}
              onChange={(e) =>
                onChange({ ...schema, description: e.target.value })
              }
              placeholder="Please fill out this form..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Fields List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Form Fields</CardTitle>
            <Button type="button" onClick={addField} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schema.fields.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No fields yet. Click "Add Field" to get started.
            </div>
          ) : (
            schema.fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Field Header */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <div className="flex-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Field Type */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Field Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) =>
                            updateField(index, {
                              type: value as FormField['type'],
                              options: ['select', 'radio'].includes(value)
                                ? field.options || ['Option 1']
                                : undefined,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${field.id}`}
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateField(index, { required: checked === true })
                            }
                          />
                          <Label htmlFor={`required-${field.id}`}>Required</Label>
                        </div>
                      </div>
                    </div>

                    {/* Field Label */}
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          updateField(index, { label: e.target.value })
                        }
                        placeholder="Field Label"
                      />
                    </div>

                    {/* Field Description */}
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={field.description || ''}
                        onChange={(e) =>
                          updateField(index, { description: e.target.value })
                        }
                        placeholder="Help text for this field"
                        rows={2}
                      />
                    </div>

                    {/* Options for select/radio */}
                    {['select', 'radio'].includes(field.type) && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="space-y-2">
                          {(field.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions[optIndex] = e.target.value;
                                  updateFieldOptions(index, newOptions);
                                }}
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newOptions = field.options?.filter(
                                    (_, i) => i !== optIndex
                                  ) || [];
                                  updateFieldOptions(index, newOptions);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateFieldOptions(index, [
                                ...(field.options || []),
                                `Option ${(field.options?.length || 0) + 1}`,
                              ]);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Validation Rules */}
                    {['number'].includes(field.type) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Min Value</Label>
                          <Input
                            type="number"
                            value={field.validation?.min || ''}
                            onChange={(e) =>
                              updateField(index, {
                                validation: {
                                  ...field.validation,
                                  min: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                            placeholder="Min"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Value</Label>
                          <Input
                            type="number"
                            value={field.validation?.max || ''}
                            onChange={(e) =>
                              updateField(index, {
                                validation: {
                                  ...field.validation,
                                  max: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                            placeholder="Max"
                          />
                        </div>
                      </div>
                    )}
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

