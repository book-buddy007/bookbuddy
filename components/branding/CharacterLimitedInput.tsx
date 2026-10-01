'use client';

import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getRemainingCharacters, getCounterStatusColor } from '@/utils/content-validator';

interface CharacterLimitedInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  maxLength: number;
  counterPosition?: 'bottom-right' | 'top-right';
  multiline?: boolean;
  rows?: number;
  showRequiredIndicator?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  rules?: {
    allowedTags?: string[];
    allowedCharacters?: RegExp;
  };
  description?: string;
  error?: string;
}

export const CharacterLimitedInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, CharacterLimitedInputProps>(
  ({ 
    label, 
    maxLength,
    counterPosition = 'bottom-right',
    multiline = false,
    rows = 3,
    showRequiredIndicator = false,
    value,
    onChange,
    rules,
    description,
    error,
    ...props
  }, ref) => {
    const [remaining, setRemaining] = useState<number>(maxLength);
    const [statusColor, setStatusColor] = useState<string>('text-muted-foreground');
    
    // Calculate remaining characters and update status color
    useEffect(() => {
      const remainingChars = getRemainingCharacters(value, maxLength);
      setRemaining(remainingChars);
      setStatusColor(getCounterStatusColor(value, maxLength));
    }, [value, maxLength]);
    
    // Custom change handler to apply validation rules
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let newValue = e.target.value;
      
      // Apply character rules if specified
      if (rules?.allowedCharacters) {
        // Filter out disallowed characters
        newValue = newValue.split('').filter(char => rules.allowedCharacters?.test(char)).join('');
        
        // Update the input value directly
        e.target.value = newValue;
      }
      
      // Call the parent onChange handler
      onChange(e);
    };
    
    const InputComponent = multiline ? Textarea : Input;
    
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={props.id} className="flex items-center justify-between">
            <span>
              {label}
              {showRequiredIndicator && <span className="text-destructive ml-1">*</span>}
            </span>
            {counterPosition === 'top-right' && (
              <span className={`text-xs ${statusColor}`}>
                {remaining}/{maxLength}
              </span>
            )}
          </Label>
        )}
        
        <div className="relative">
          <InputComponent
            {...props}
            ref={ref as any}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            rows={multiline ? rows : undefined}
            className={`${props.className || ''} ${error ? 'border-destructive' : ''}`}
          />
          
          {counterPosition === 'bottom-right' && (
            <div className="absolute inset-y-0 right-0 flex items-end justify-end pr-3 pb-1 pointer-events-none">
              <span className={`text-xs ${statusColor}`}>
                {remaining}/{maxLength}
              </span>
            </div>
          )}
        </div>
        
        {description && !error && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
); 