import { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { electronAPI } from '../../../lib/electronAPI';

interface ApiKeyConfig {
  id: string;
  name: string;
  settingKey: string;
  placeholder: string;
  prefix: string;
  helpUrl: string;
  helpText: string;
  testable: boolean;
}

const API_KEYS: ApiKeyConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    settingKey: 'anthropic_api_key',
    placeholder: 'sk-ant-...',
    prefix: 'sk-ant-',
    helpUrl: 'https://console.anthropic.com',
    helpText: 'Required for Claude AI agents',
    testable: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    settingKey: 'openai_api_key',
    placeholder: 'sk-...',
    prefix: 'sk-',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'For GPT models and OpenAI services',
    testable: false,
  },
  {
    id: 'google',
    name: 'Google AI (Gemini)',
    settingKey: 'google_api_key',
    placeholder: 'AIza...',
    prefix: 'AIza',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpText: 'For Gemini models',
    testable: false,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    settingKey: 'elevenlabs_api_key',
    placeholder: 'xi-...',
    prefix: 'xi-',
    helpUrl: 'https://elevenlabs.io/app/settings/api-keys',
    helpText: 'For text-to-speech voices',
    testable: false,
  },
  {
    id: 'groq',
    name: 'Groq',
    settingKey: 'groq_api_key',
    placeholder: 'gsk_...',
    prefix: 'gsk_',
    helpUrl: 'https://console.groq.com/keys',
    helpText: 'For fast inference with Groq',
    testable: false,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    settingKey: 'openrouter_api_key',
    placeholder: 'sk-or-...',
    prefix: 'sk-or-',
    helpUrl: 'https://openrouter.ai/keys',
    helpText: 'Access multiple AI providers',
    testable: false,
  },
];

interface ApiKeyState {
  value: string;
  hasKey: boolean;
  testing: boolean;
  saving: boolean;
  testResult: 'success' | 'error' | null;
}

export default function ApiKeysSection() {
  const [keyStates, setKeyStates] = useState<Record<string, ApiKeyState>>({});

  useEffect(() => {
    loadApiKeys();
  }, []);

  async function loadApiKeys() {
    const states: Record<string, ApiKeyState> = {};

    for (const config of API_KEYS) {
      try {
        const value = await electronAPI.settings.get(config.settingKey);
        const hasKey = !!value;
        states[config.id] = {
          value: hasKey ? maskKey(value, config.prefix) : '',
          hasKey,
          testing: false,
          saving: false,
          testResult: null,
        };
      } catch (error) {
        states[config.id] = {
          value: '',
          hasKey: false,
          testing: false,
          saving: false,
          testResult: null,
        };
      }
    }

    setKeyStates(states);
  }

  function maskKey(key: string, prefix: string): string {
    if (!key) return '';
    const prefixLen = Math.min(prefix.length + 4, key.length);
    return key.substring(0, prefixLen) + '••••••••••••••••';
  }

  function updateKeyState(id: string, updates: Partial<ApiKeyState>) {
    setKeyStates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  }

  async function handleSaveKey(config: ApiKeyConfig) {
    const state = keyStates[config.id];
    if (!state?.value || state.value.includes('••')) return;

    updateKeyState(config.id, { saving: true, testResult: null });

    try {
      await electronAPI.settings.set(config.settingKey, state.value);

      // Special handling for Anthropic - reset the Claude client
      if (config.id === 'anthropic') {
        await electronAPI.claude.setApiKey(state.value);
      }

      updateKeyState(config.id, {
        hasKey: true,
        value: maskKey(state.value, config.prefix),
        saving: false,
      });

      // Auto-test if testable
      if (config.testable && config.id === 'anthropic') {
        await handleTestKey(config);
      }
    } catch (error) {
      console.error(`Failed to save ${config.name} key:`, error);
      updateKeyState(config.id, { saving: false, testResult: 'error' });
    }
  }

  async function handleTestKey(config: ApiKeyConfig) {
    if (!config.testable) return;

    updateKeyState(config.id, { testing: true, testResult: null });

    try {
      if (config.id === 'anthropic') {
        const result = await electronAPI.claude.testConnection();
        updateKeyState(config.id, {
          testing: false,
          testResult: result.success ? 'success' : 'error',
        });
      }
    } catch (error) {
      console.error(`Failed to test ${config.name} connection:`, error);
      updateKeyState(config.id, { testing: false, testResult: 'error' });
    }
  }

  async function handleClearKey(config: ApiKeyConfig) {
    try {
      await electronAPI.settings.set(config.settingKey, '');
      updateKeyState(config.id, {
        value: '',
        hasKey: false,
        testResult: null,
      });
    } catch (error) {
      console.error(`Failed to clear ${config.name} key:`, error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">API Keys</h3>
        <p className="text-xs text-muted-foreground">
          Configure API keys for AI services. Keys are stored locally and never shared.
        </p>
      </div>

      <div className="space-y-4">
        {API_KEYS.map((config) => {
          const state = keyStates[config.id] || {
            value: '',
            hasKey: false,
            testing: false,
            saving: false,
            testResult: null,
          };

          return (
            <div key={config.id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{config.name}</span>
                  {state.hasKey && (
                    <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">
                      Configured
                    </span>
                  )}
                </div>
                <a
                  href="#"
                  className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  onClick={async (e) => {
                    e.preventDefault();
                    // Open in external browser using system default
                    await electronAPI.system.openExternal(config.helpUrl);
                  }}
                >
                  Get API Key
                  <ExternalLink size={12} />
                </a>
              </div>

              <p className="text-xs text-muted-foreground">{config.helpText}</p>

              <input
                type="password"
                value={state.value}
                onChange={(e) => {
                  updateKeyState(config.id, {
                    value: e.target.value,
                    testResult: null,
                  });
                }}
                placeholder={config.placeholder}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />

              {state.testResult && (
                <div
                  className={`flex items-center gap-2 text-xs ${
                    state.testResult === 'success' ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {state.testResult === 'success' ? (
                    <>
                      <CheckCircle size={14} />
                      <span>Connected successfully</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} />
                      <span>Connection failed - check your API key</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveKey(config)}
                  disabled={!state.value || state.value.includes('••') || state.saving}
                  className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {state.saving && <Loader2 size={12} className="animate-spin" />}
                  Save
                </button>

                {config.testable && state.hasKey && (
                  <button
                    onClick={() => handleTestKey(config)}
                    disabled={state.testing}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {state.testing && <Loader2 size={12} className="animate-spin" />}
                    Test
                  </button>
                )}

                {state.hasKey && (
                  <button
                    onClick={() => handleClearKey(config)}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Your API keys are stored locally on your device and are only sent to their respective services.
          They are never shared with AgentSpaces or any third party.
        </p>
      </div>
    </div>
  );
}
