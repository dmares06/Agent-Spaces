import { Cpu, Brain, AlertCircle } from 'lucide-react';
import { AVAILABLE_MODELS, type ModelProvider } from '../../../lib/types';
import { useState, useEffect } from 'react';
import { electronAPI } from '../../../lib/electronAPI';

interface CoreSectionProps {
  systemPrompt: string;
  model: string;
  thinkingEnabled: boolean;
  onSystemPromptChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onThinkingChange: (value: boolean) => void;
}

export default function CoreSection({
  systemPrompt,
  model,
  thinkingEnabled,
  onSystemPromptChange,
  onModelChange,
  onThinkingChange,
}: CoreSectionProps) {
  const selectedModelInfo = AVAILABLE_MODELS.find((m) => m.id === model);
  const canUseThinking = selectedModelInfo?.supportsThinking ?? false;
  const [apiKeys, setApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check which API keys are configured
    async function checkKeys() {
      try {
        const keys = await electronAPI.settings.getAll();
        const keyStatus: Record<string, boolean> = {};

        keyStatus['anthropic_api_key'] = !!keys['anthropic_api_key'];
        keyStatus['openai_api_key'] = !!keys['openai_api_key'];
        keyStatus['google_api_key'] = !!keys['google_api_key'];
        keyStatus['groq_api_key'] = !!keys['groq_api_key'];
        keyStatus['openrouter_api_key'] = !!keys['openrouter_api_key'];

        setApiKeys(keyStatus);
      } catch (error) {
        console.error('Failed to check API keys:', error);
      }
    }
    checkKeys();
  }, []);

  // Group models by provider
  const modelsByProvider: Record<ModelProvider, typeof AVAILABLE_MODELS> = {
    anthropic: AVAILABLE_MODELS.filter(m => m.provider === 'anthropic'),
    openai: AVAILABLE_MODELS.filter(m => m.provider === 'openai'),
    google: AVAILABLE_MODELS.filter(m => m.provider === 'google'),
    groq: AVAILABLE_MODELS.filter(m => m.provider === 'groq'),
    openrouter: AVAILABLE_MODELS.filter(m => m.provider === 'openrouter'),
  };

  const hasRequiredApiKey = selectedModelInfo ? apiKeys[selectedModelInfo.requiresApiKey] : false;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Cpu size={18} className="text-accent" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Core
        </h3>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <label htmlFor="system-prompt" className="block text-sm font-medium text-foreground">
          System Prompt
        </label>
        <textarea
          id="system-prompt"
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          placeholder="Enter instructions for how this agent should behave..."
          rows={8}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Optional instructions that customize this agent's behavior and personality.
        </p>
      </div>

      {/* Model Selector */}
      <div className="space-y-2">
        <label htmlFor="model" className="block text-sm font-medium text-foreground">
          Model
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          {/* Anthropic (Claude) */}
          <optgroup label="Anthropic (Claude)">
            {modelsByProvider.anthropic.map((m) => (
              <option key={m.id} value={m.id} disabled={!apiKeys[m.requiresApiKey]}>
                {m.name} - {m.description} {!apiKeys[m.requiresApiKey] ? '(API key required)' : ''}
              </option>
            ))}
          </optgroup>

          {/* OpenAI */}
          <optgroup label="OpenAI">
            {modelsByProvider.openai.map((m) => (
              <option key={m.id} value={m.id} disabled={!apiKeys[m.requiresApiKey]}>
                {m.name} - {m.description} {!apiKeys[m.requiresApiKey] ? '(API key required)' : ''}
              </option>
            ))}
          </optgroup>

          {/* Google (Gemini) */}
          <optgroup label="Google (Gemini)">
            {modelsByProvider.google.map((m) => (
              <option key={m.id} value={m.id} disabled={!apiKeys[m.requiresApiKey]}>
                {m.name} - {m.description} {!apiKeys[m.requiresApiKey] ? '(API key required)' : ''}
              </option>
            ))}
          </optgroup>

          {/* Groq */}
          <optgroup label="Groq (Fast Inference)">
            {modelsByProvider.groq.map((m) => (
              <option key={m.id} value={m.id} disabled={!apiKeys[m.requiresApiKey]}>
                {m.name} - {m.description} {!apiKeys[m.requiresApiKey] ? '(API key required)' : ''}
              </option>
            ))}
          </optgroup>

          {/* OpenRouter */}
          <optgroup label="OpenRouter (Multi-provider)">
            {modelsByProvider.openrouter.map((m) => (
              <option key={m.id} value={m.id} disabled={!apiKeys[m.requiresApiKey]}>
                {m.name} - {m.description} {!apiKeys[m.requiresApiKey] ? '(API key required)' : ''}
              </option>
            ))}
          </optgroup>
        </select>

        {/* API Key Warning */}
        {selectedModelInfo && !hasRequiredApiKey && (
          <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertCircle size={14} className="text-warning flex-shrink-0" />
            <p className="text-xs text-warning">
              {selectedModelInfo.provider === 'anthropic' ? 'Anthropic' :
               selectedModelInfo.provider === 'openai' ? 'OpenAI' :
               selectedModelInfo.provider === 'google' ? 'Google' :
               selectedModelInfo.provider === 'groq' ? 'Groq' :
               'OpenRouter'} API key required. Configure it in Global Settings.
            </p>
          </div>
        )}

        {/* Model Info */}
        {selectedModelInfo && hasRequiredApiKey && (
          <p className="text-xs text-muted-foreground">
            {selectedModelInfo.description}
            {selectedModelInfo.supportsThinking && ' • Supports extended thinking'}
          </p>
        )}
      </div>

      {/* Thinking Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-accent" />
            <label htmlFor="thinking" className="text-sm font-medium text-foreground">
              Extended Thinking
            </label>
          </div>
          <button
            type="button"
            onClick={() => canUseThinking && onThinkingChange(!thinkingEnabled)}
            disabled={!canUseThinking}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              thinkingEnabled && canUseThinking
                ? 'bg-accent'
                : 'bg-muted'
            } ${!canUseThinking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                thinkingEnabled && canUseThinking ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {canUseThinking
            ? 'Enable multi-step reasoning for complex tasks. This may increase response time.'
            : 'Extended thinking is only available for Claude Sonnet 4.5 and Opus 4.5.'}
        </p>
      </div>

      {/* Tools - Placeholder */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Tools
        </label>
        <div className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground italic">
          Tool configuration coming soon
        </div>
      </div>

      {/* Permissions - Placeholder */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Permissions
        </label>
        <div className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground italic">
          Configure permissions in the Rules & Permissions panel
        </div>
      </div>
    </div>
  );
}
