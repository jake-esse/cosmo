'use client';

import { AlertCircle, RefreshCw, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChatErrorProps {
  message: string;
  code?: string;
  canRetry: boolean;
  suggestedAction?: string;
  onRetry: () => void;
  onChangeModel: () => void;
}

export function ChatError({
  message,
  code,
  canRetry,
  suggestedAction,
  onRetry,
  onChangeModel,
}: ChatErrorProps) {
  const getErrorTitle = () => {
    switch (code) {
      case 'RATE_LIMIT':
        return 'Rate Limit Exceeded';
      case 'DAILY_LIMIT':
        return 'Daily Limit Reached';
      case 'TIER_REQUIRED':
        return 'Upgrade Required';
      case 'PROVIDER_UNAVAILABLE':
        return 'Provider Unavailable';
      default:
        return 'Error';
    }
  };

  const getErrorVariant = () => {
    switch (code) {
      case 'DAILY_LIMIT':
      case 'TIER_REQUIRED':
        return 'default';
      default:
        return 'destructive';
    }
  };

  return (
    <Alert variant={getErrorVariant() as any} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{getErrorTitle()}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        
        {suggestedAction && (
          <p className="text-sm italic">{suggestedAction}</p>
        )}
        
        <div className="flex gap-2 mt-3">
          {canRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={onChangeModel}
            className="flex items-center gap-2"
          >
            <Shuffle className="w-3 h-3" />
            Change Model
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}