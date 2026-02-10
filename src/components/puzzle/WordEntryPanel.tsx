'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface WordEntryPanelProps {
  word: {
    number: number;
    direction: 'across' | 'down';
    clue: string;
    length: number;
    currentValue?: string;
  } | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

/**
 * WordEntryPanel - External answer input component
 * Replaces the iframe's internal answer box
 */
export function WordEntryPanel({
  word,
  onSubmit,
  onCancel,
  disabled = false,
}: WordEntryPanelProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Update value when word changes
  useEffect(() => {
    if (word) {
      setValue(word.currentValue || '');
      // Auto-focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setValue('');
    }
  }, [word]);

  if (!word) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!value.trim()) {
      onCancel();
      return;
    }

    if (value.length !== word.length) {
      // Show error
      return;
    }

    onSubmit(value.toUpperCase());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const isValidLength = value.length === 0 || value.length === word.length;

  return (
    <Card className="animate-in slide-in-from-bottom-4 duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold uppercase tracking-wider text-primary">
              {value || '•'.repeat(word.length)}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {word.direction === 'across' ? 'Across' : 'Down'}, {word.length} letters
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Clue */}
        <div className="border-t border-b py-3 text-sm">
          <span className="font-medium text-foreground">{word.number}.</span>{' '}
          {word.clue}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${word.length} letters`}
            className="uppercase font-semibold text-base tracking-wider"
            maxLength={word.length}
            disabled={disabled}
            autoComplete="off"
            autoFocus
          />

          {/* Error message */}
          {!isValidLength && (
            <p className="text-xs text-destructive">
              {value.length < word.length
                ? `You need ${word.length - value.length} more letter${word.length - value.length > 1 ? 's' : ''}`
                : `Too many letters. This word has ${word.length} letters.`}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={disabled || !isValidLength || !value}
            >
              OK
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
