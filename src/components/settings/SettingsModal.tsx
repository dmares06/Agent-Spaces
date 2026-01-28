import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { X, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkApiKey();
    }
  }, [isOpen]);

  async function checkApiKey() {
    try {
      const has = await electronAPI.claude.hasApiKey();
      setHasKey(has);
      if (has) {
        setApiKey('••••••••••••••••••••••••••••••••');
      }
    } catch (error) {
      console.error('Failed to check API key:', error);
    }
  }

  async function handleSave() {
    if (!apiKey || apiKey.startsWith('••')) return;

    setSaving(true);
    setTestResult(null);

    try {
      await electronAPI.claude.setApiKey(apiKey);
      setHasKey(true);
      setApiKey('••••••••••••••••••••••••••••••••');

      // Auto-test after saving
      await handleTest();
    } catch (error) {
      console.error('Failed to save API key:', error);
      setTestResult('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await electronAPI.claude.testConnection();
      setTestResult(result.success ? 'success' : 'error');
    } catch (error) {
      console.error('Failed to test connection:', error);
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  }

  function handleKeyChange(value: string) {
    setApiKey(value);
    setTestResult(null);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* API Key Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Key size={16} />
              Anthropic API Key
            </label>
            <p className="text-xs text-muted-foreground">
              Get your API key from{' '}
              <span className="text-accent">console.anthropic.com</span>
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {/* Status indicator */}
            {testResult && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  testResult === 'success' ? 'text-success' : 'text-destructive'
                }`}
              >
                {testResult === 'success' ? (
                  <>
                    <CheckCircle size={16} />
                    <span>Connected successfully</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    <span>Connection failed - check your API key</span>
                  </>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={!apiKey || apiKey.startsWith('••') || saving}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save Key
              </button>
              <button
                onClick={handleTest}
                disabled={!hasKey || testing}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing && <Loader2 size={16} className="animate-spin" />}
                Test Connection
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never sent to any server except Anthropic's API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
