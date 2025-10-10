'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Crown, Zap } from 'lucide-react';
import { ModelConfig } from '@/lib/ai/types';
import { getApiUrl } from '@/lib/config';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  conversationModel?: string | null;
  hasMessages?: boolean;
}

export function ModelSelector({ value, onChange, disabled, conversationModel, hasMessages }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch(getApiUrl('/api/chat/models'));
      const data = await response.json();
      
      if (data.models) {
        setModels(data.models);
        
        // Set default model if none selected
        if (!value && data.models.length > 0) {
          // Default to gemini-2.5-flash-lite or first available model
          const defaultModel = data.models.find(m => m.model_id === 'gemini-2.5-flash-lite') || data.models[0];
          onChange(defaultModel.model_id);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'free':
        return (
          <Badge variant="secondary" className="ml-2">
            <Zap className="w-3 h-3 mr-1" />
            FREE
          </Badge>
        );
      case 'plus':
        return (
          <Badge variant="default" className="ml-2 bg-blue-600">
            <Sparkles className="w-3 h-3 mr-1" />
            PLUS
          </Badge>
        );
      case 'pro':
        return (
          <Badge variant="default" className="ml-2 bg-purple-600">
            <Crown className="w-3 h-3 mr-1" />
            PRO
          </Badge>
        );
      default:
        return null;
    }
  };

  const getUsageDisplay = (model: ModelConfig) => {
    if (model.daily_limit === null) {
      return 'Unlimited';
    }
    
    const remaining = model.remaining_today || 0;
    const limit = model.daily_limit;
    
    if (remaining === 0) {
      return <span className="text-red-500">Daily limit reached</span>;
    }
    
    return `${remaining}/${limit} remaining today`;
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic';
      case 'google':
        return 'Google';
      case 'xai':
        return 'xAI';
      default:
        return provider;
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Loading models..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (models.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No models available" />
        </SelectTrigger>
      </Select>
    );
  }

  const selectedModel = models.find(m => m.model_id === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedModel ? (
              <div className="flex items-center justify-between w-full">
                <span>{selectedModel.display_name}</span>
                {getTierBadge(selectedModel.tier_required)}
              </div>
            ) : (
              'Select a model'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => {
            const isDisabled = model.remaining_today === 0;
            
            return (
              <SelectItem 
                key={model.model_id} 
                value={model.model_id}
                disabled={isDisabled}
              >
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between">
                    <span className={isDisabled ? 'text-muted-foreground' : ''}>
                      {model.display_name}
                      {hasMessages && conversationModel && model.model_id !== conversationModel && (
                        <span className="text-muted-foreground ml-2">(New Chat)</span>
                      )}
                    </span>
                    {getTierBadge(model.tier_required)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getProviderLabel(model.provider)} • {getUsageDisplay(model)}
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {selectedModel && selectedModel.remaining_today !== undefined && selectedModel.daily_limit !== null && (
        <div className="text-xs text-muted-foreground px-1">
          {selectedModel.remaining_today === 0 ? (
            <span className="text-red-500">
              Daily limit reached. Please select another model or wait until tomorrow.
            </span>
          ) : selectedModel.remaining_today <= 5 ? (
            <span className="text-yellow-600">
              Only {selectedModel.remaining_today} uses remaining today
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}