import { useState } from 'react';
import { X, Key, Zap, Server, Github } from 'lucide-react';
import GlobalSkillsSection from './sections/GlobalSkillsSection';
import GlobalMCPSection from './sections/GlobalMCPSection';
import GitHubSection from './sections/GitHubSection';
import ApiKeysSection from './sections/ApiKeysSection';

type SettingsTab = 'api-keys' | 'skills' | 'mcp' | 'github';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'text-accent border-accent'
          : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function GlobalSettingsModal({ isOpen, onClose }: GlobalSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api-keys');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Global Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 border-b border-border">
          <TabButton
            active={activeTab === 'api-keys'}
            onClick={() => setActiveTab('api-keys')}
            icon={<Key size={16} />}
            label="API Keys"
          />
          <TabButton
            active={activeTab === 'skills'}
            onClick={() => setActiveTab('skills')}
            icon={<Zap size={16} />}
            label="Global Skills"
          />
          <TabButton
            active={activeTab === 'mcp'}
            onClick={() => setActiveTab('mcp')}
            icon={<Server size={16} />}
            label="MCP Servers"
          />
          <TabButton
            active={activeTab === 'github'}
            onClick={() => setActiveTab('github')}
            icon={<Github size={16} />}
            label="GitHub"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'api-keys' && <ApiKeysSection />}

          {activeTab === 'skills' && <GlobalSkillsSection />}
          {activeTab === 'mcp' && <GlobalMCPSection />}
          {activeTab === 'github' && <GitHubSection />}
        </div>
      </div>
    </div>
  );
}
