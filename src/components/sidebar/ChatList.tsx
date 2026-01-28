import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Pencil, Trash2, MoreHorizontal, Check, X, Flag } from 'lucide-react';
import { electronAPI } from '../../lib/electronAPI';
import type { Chat } from '../../lib/types';
import { CHAT_STATUS_CONFIG } from '../../lib/types';

interface ChatListProps {
  chats: Chat[];
  selectedId?: string;
  onSelect: (chatId: string) => void;
  onChatsUpdated: () => void;
  isCollapsed: boolean;
}

export default function ChatList({ chats, selectedId, onSelect, onChatsUpdated, isCollapsed }: ChatListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function startEditing(chat: Chat) {
    setEditingId(chat.id);
    setEditValue(chat.title || '');
    setMenuOpenId(null);
  }

  async function saveEdit() {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await electronAPI.chat.update(editingId, { title: editValue.trim() });
      onChatsUpdated();
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }

    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function deleteChat(chatId: string) {
    try {
      await electronAPI.chat.delete(chatId);
      onChatsUpdated();
      setMenuOpenId(null);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  if (chats.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">
          {isCollapsed ? '...' : 'No chats yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {chats.map((chat) => {
        const isSelected = chat.id === selectedId;
        const isEditing = chat.id === editingId;
        const isMenuOpen = chat.id === menuOpenId;

        return (
          <div key={chat.id} className="relative group">
            {isEditing ? (
              // Edit mode
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <MessageSquare size={16} className="flex-shrink-0 text-muted-foreground/70" />
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={saveEdit}
                  className="flex-1 px-2 py-1 text-sm bg-background border border-accent rounded focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  onClick={saveEdit}
                  className="p-1 hover:bg-background/80 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title="Save"
                >
                  <Check size={16} className="text-success" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 hover:bg-background/80 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title="Cancel"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
            ) : (
              // Normal mode
              <button
                onClick={() => onSelect(chat.id)}
                onDoubleClick={() => !isCollapsed && startEditing(chat)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                  isSelected
                    ? 'bg-accent/5 border-l-2 border-l-accent text-accent'
                    : 'text-foreground hover:bg-background/80'
                }`}
                title={isCollapsed ? chat.title || 'Untitled Chat' : 'Double-click to rename'}
              >
                <MessageSquare size={16} className="flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium truncate">
                          {chat.title || 'Untitled Chat'}
                        </p>
                        {chat.is_flagged === 1 && (
                          <Flag size={11} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {chat.updated_at && (
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(chat.updated_at).toLocaleDateString()}
                          </p>
                        )}
                        {chat.status && chat.status !== 'active' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                            chat.status === 'todo'
                              ? 'bg-status-todo/10 text-status-todo'
                              : chat.status === 'in_progress'
                              ? 'bg-status-progress/10 text-status-progress'
                              : chat.status === 'review'
                              ? 'bg-status-review/10 text-status-review'
                              : chat.status === 'done'
                              ? 'bg-status-done/10 text-status-done'
                              : chat.status === 'archived'
                              ? 'bg-status-archived/10 text-status-archived'
                              : 'bg-background text-muted-foreground'
                          }`}>
                            {CHAT_STATUS_CONFIG.find((c) => c.id === chat.status)?.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* More options button - visible on hover */}
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(isMenuOpen ? null : chat.id);
                        }}
                        className="p-1 hover:bg-background/80 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        title="Options"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </>
                )}
              </button>
            )}

            {/* Context menu */}
            {isMenuOpen && !isCollapsed && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-1 z-50 bg-card border border-border/50 rounded-lg shadow-lg py-1 min-w-[140px]"
              >
                <button
                  onClick={() => startEditing(chat)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                >
                  <Pencil size={16} />
                  Rename
                </button>
                <button
                  onClick={() => deleteChat(chat.id)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
