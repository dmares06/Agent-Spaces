import { useEffect, useMemo, useState } from 'react';
import { GitBranch, CheckCircle2, XCircle, Loader2, Upload } from 'lucide-react';

interface GitQuickActionsProps {
  repoPath?: string;
}

export default function GitQuickActions({ repoPath }: GitQuickActionsProps) {
  const [status, setStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const dirtyCount = useMemo(() => {
    if (!status?.status) return 0;
    const s = status.status;
    return (s.created?.length || 0) + (s.deleted?.length || 0) + (s.modified?.length || 0) + (s.renamed?.length || 0) + (s.not_added?.length || 0) + (s.staged?.length || 0) + (s.conflicted?.length || 0);
  }, [status]);

  async function refresh() {
    if (!repoPath) return;
    const s = await window.electronAPI.git.status(repoPath);
    setStatus(s);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath]);

  async function handleCommitAndPush() {
    if (!repoPath) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await window.electronAPI.git.commitAndPush(repoPath, message.trim() || 'Update');
      if (res.success) {
        setResult({ ok: true, text: `Committed ${res.commitId} and pushed` });
        setMessage('');
      } else {
        setResult({ ok: false, text: res.error || 'Commit/push failed' });
      }
    } catch (e: any) {
      setResult({ ok: false, text: e.message || 'Commit/push failed' });
    } finally {
      setLoading(false);
      refresh();
    }
  }

  if (!repoPath) return null;

  const isRepo = status?.isRepo;

  return (
    <div className="mt-3 p-3 border border-border rounded-lg bg-muted/20 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <GitBranch size={16} className="text-accent" />
        <span className="font-medium text-foreground">Git</span>
        <span className="text-xs text-muted-foreground">Quick actions</span>
      </div>

      {!isRepo && (
        <div className="text-xs text-muted-foreground">
          Not a git repository. Initialize in the terminal with <code>git init</code> and add a remote, or open a cloned repo.
        </div>
      )}

      {isRepo && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Branch: <span className="text-foreground font-medium">{status?.status?.current || 'unknown'}</span>
            {status?.status?.tracking ? (
              <>
                {' '}• Tracking <span className="text-foreground">{status.status.tracking}</span>
                {' '}• Ahead {status.status.ahead} / Behind {status.status.behind}
              </>
            ) : null}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={dirtyCount > 0 ? `Commit message (${dirtyCount} changes)` : 'Working tree clean'}
              className="flex-1 px-3 py-1.5 bg-background border border-border rounded text-sm"
            />
            <button
              onClick={handleCommitAndPush}
              disabled={loading || !isRepo || dirtyCount === 0}
              className="px-3 py-1.5 bg-accent text-white rounded hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              title="Commit staged/unstaged changes and push to origin"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Commit & Push
            </button>
          </div>

          {result && (
            <div className={`flex items-center gap-2 text-xs ${result.ok ? 'text-green-500' : 'text-red-400'}`}>
              {result.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {result.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

