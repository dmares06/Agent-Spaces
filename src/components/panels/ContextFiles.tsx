import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { type Attachment } from '../../lib/types';
import FileItem from './FileItem';
import { Upload } from 'lucide-react';

interface ContextFilesProps {
  chatId?: string;
  onFileCountChange?: (count: number) => void;
}

export default function ContextFiles({ chatId, onFileCountChange }: ContextFilesProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (chatId) {
      loadAttachments();
    } else {
      setAttachments([]);
    }

    // Listen for real-time attachment additions from tool execution
    electronAPI.onAttachmentAdded((attachment: Attachment) => {
      if (attachment.chat_id === chatId) {
        setAttachments((prev) => [attachment, ...prev]);
      }
    });

    return () => {
      electronAPI.offAttachmentAdded();
    };
  }, [chatId]);

  useEffect(() => {
    onFileCountChange?.(attachments.length);
  }, [attachments.length, onFileCountChange]);

  async function loadAttachments() {
    if (!chatId) return;

    try {
      setLoading(true);
      const data = await electronAPI.attachment.list(chatId);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!chatId) return;

    try {
      const dirPath = await electronAPI.files.browseDirectory();
      if (!dirPath) return;

      // Add the directory as a context attachment
      await electronAPI.attachment.add({
        chat_id: chatId,
        name: dirPath.split('/').pop() || 'Unknown',
        path: dirPath,
        type: 'context',
      });

      await loadAttachments();
    } catch (error) {
      console.error('Failed to upload context:', error);
    }
  }

  async function handleRemove(id: string) {
    try {
      await electronAPI.attachment.remove(id);
      await loadAttachments();
    } catch (error) {
      console.error('Failed to remove attachment:', error);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Loading files...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!chatId ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Select a chat to manage files
        </div>
      ) : (
        <>
          <button
            onClick={handleUpload}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors"
          >
            <Upload size={14} />
            <span>Add Context</span>
          </button>

          {attachments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No context files added
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attachments.map((attachment) => (
                <FileItem
                  key={attachment.id}
                  file={attachment}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
