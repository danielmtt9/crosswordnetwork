'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

export interface SelectedWord {
  id: string;
  number: number;
  direction: 'across' | 'down';
  clue: string;
  length: number;
  currentFill?: string;
  indexInWord?: number;
}

interface ExternalAnswerBoxProps {
  selectedWord: SelectedWord | null;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBackspace: () => void;
  onSubmit: (value: string) => void;
  onMoveCaret?: (delta: number) => void;
  onClear: () => void;
  onCancel?: () => void;
}

/**
 * ExternalAnswerBox - External answer input component
 * Replaces the iframe's internal answer box with a visible, accessible input
 */
export function ExternalAnswerBox({
  selectedWord,
  value,
  disabled = false,
  onChange,
  onBackspace,
  onSubmit,
  onMoveCaret,
  onClear,
  onCancel,
}: ExternalAnswerBoxProps) {
  const [localValue, setLocalValue] = useState('');
  const [caretPosition, setCaretPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value with prop value
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  // Auto-focus input when word is selected
  useEffect(() => {
    if (selectedWord && !disabled) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedWord, disabled]);

  if (!selectedWord) {
    return (
      <Card className="w-full bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Select a clue to start typing
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Enforce max length
    if (newValue.length > selectedWord.length) {
      return;
    }

    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (localValue.length === selectedWord.length) {
        onSubmit(localValue);
      }
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (localValue.length === 0 || caretPosition === 0) {
        onBackspace();
      } else {
        const newValue = localValue.slice(0, -1);
        setLocalValue(newValue);
        onChange(newValue);
      }
      return;
    }

    if (e.key === 'ArrowLeft' && onMoveCaret) {
      e.preventDefault();
      onMoveCaret(-1);
      return;
    }

    if (e.key === 'ArrowRight' && onMoveCaret) {
      e.preventDefault();
      onMoveCaret(1);
      return;
    }

    // Handle letter input
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      const newValue = localValue + e.key.toUpperCase();
      if (newValue.length <= selectedWord.length) {
        setLocalValue(newValue);
        onChange(newValue);
      }
    }
  };

  const handleClear = () => {
    setLocalValue('');
    onClear();
  };

  // Create display value with underscores for empty slots
  const displayValue = localValue.padEnd(selectedWord.length, '_');
  const isComplete = localValue.length === selectedWord.length;

  return (
    <Card className="w-full border-2 border-primary/20 shadow-lg">
      <CardContent className="p-4 space-y-3">
        {/* Header with clue info */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {selectedWord.number} {selectedWord.direction === 'across' ? 'Across' : 'Down'}
              </span>
              <span className="text-sm text-muted-foreground">
                ({selectedWord.length} letters)
              </span>
            </div>
            <p className="text-sm text-foreground">
              {selectedWord.clue}
            </p>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Visual display of letters */}
        <div className="flex justify-center gap-1" role="status" aria-live="polite">
          {displayValue.split('').map((letter, idx) => (
            <div
              key={idx}
              className={`
                w-10 h-12 flex items-center justify-center
                border-2 rounded font-mono text-xl font-bold
                ${idx < localValue.length
                  ? 'bg-primary/10 border-primary text-foreground'
                  : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                }
                ${idx === localValue.length ? 'ring-2 ring-primary ring-offset-2' : ''}
              `}
            >
              {letter === '_' ? '' : letter}
            </div>
          ))}
        </div>

        {/* Hidden input for actual typing */}
        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="sr-only"
          maxLength={selectedWord.length}
          disabled={disabled}
          autoComplete="off"
          autoFocus
          aria-label={`Enter answer for ${selectedWord.number} ${selectedWord.direction}: ${selectedWord.clue}`}
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={disabled || localValue.length === 0}
            className="flex-1"
          >
            Clear
          </Button>
          {onMoveCaret && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMoveCaret(-1)}
                disabled={disabled}
                aria-label="Move left"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMoveCaret(1)}
                disabled={disabled}
                aria-label="Move right"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => onSubmit(localValue)}
            disabled={disabled || !isComplete}
            className="flex-1"
          >
            Submit {isComplete && '✓'}
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="text-xs text-center text-muted-foreground">
          {localValue.length} / {selectedWord.length} letters
          {isComplete && ' - Press Enter or Submit'}
        </div>
      </CardContent>
    </Card>
  );
}
