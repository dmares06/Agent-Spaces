import { useState, useEffect, useRef } from 'react';
import { Folder, Plus, ChevronDown, Search, X } from 'lucide-react';
import { electronAPI } from '../../lib/electronAPI';

interface CategorySelectorProps {
  value: string | null;
  onChange: (category: string | null) => void;
  type: 'agent' | 'skill' | 'mcp';
  workspaceId?: string | null;
  placeholder?: string;
  allowCustom?: boolean;
  allowNone?: boolean;
}

export default function CategorySelector({
  value,
  onChange,
  type,
  workspaceId,
  placeholder = 'Select or create category...',
  allowCustom = true,
  allowNone = true,
}: CategorySelectorProps) {
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load existing categories
  useEffect(() => {
    loadCategories();
  }, [type, workspaceId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadCategories() {
    try {
      const categories = await electronAPI.category.list(type, workspaceId);
      setExistingCategories(categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  function handleSelect(category: string | null) {
    onChange(category);
    setIsOpen(false);
    setSearchQuery('');
    setIsCreating(false);
  }

  function handleCreateNew() {
    if (!newCategoryName.trim()) return;

    const trimmedName = newCategoryName.trim();
    onChange(trimmedName);
    setNewCategoryName('');
    setIsCreating(false);
    setIsOpen(false);
    setSearchQuery('');

    // Optimistically add to list
    if (!existingCategories.includes(trimmedName)) {
      setExistingCategories([...existingCategories, trimmedName].sort());
    }
  }

  function handleClear() {
    onChange(null);
  }

  // Filter categories by search query
  const filteredCategories = existingCategories.filter((cat) =>
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search query matches an existing category
  const exactMatch = existingCategories.some(
    (cat) => cat.toLowerCase() === searchQuery.toLowerCase()
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected value display / trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
          isOpen
            ? 'border-accent bg-background/80'
            : 'border-border bg-background hover:bg-muted/50'
        }`}
      >
        {value ? (
          <>
            <Folder size={16} className="text-accent flex-shrink-0" />
            <span className="text-sm text-foreground flex-1 truncate">{value}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-muted/50 rounded transition-colors"
              title="Clear category"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          </>
        ) : (
          <>
            <Folder size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">{placeholder}</span>
          </>
        )}
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-background border border-border rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-md">
              <Search size={14} className="text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Categories list */}
          <div className="flex-1 overflow-y-auto">
            {/* None option */}
            {allowNone && !searchQuery && (
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm text-muted-foreground italic">
                  (No category)
                </span>
              </button>
            )}

            {/* Filtered categories */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleSelect(category)}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left ${
                    value === category ? 'bg-accent/10' : ''
                  }`}
                >
                  <Folder size={14} className="text-accent flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">
                    {category}
                  </span>
                  {value === category && (
                    <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No categories found' : 'No categories yet'}
              </div>
            )}

            {/* Create new option */}
            {allowCustom && searchQuery && !exactMatch && (
              <button
                onClick={() => {
                  onChange(searchQuery.trim());
                  setIsOpen(false);
                  setSearchQuery('');
                  if (!existingCategories.includes(searchQuery.trim())) {
                    setExistingCategories([...existingCategories, searchQuery.trim()].sort());
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 border-t border-border hover:bg-accent/10 transition-colors text-left bg-muted/30"
              >
                <Plus size={14} className="text-accent flex-shrink-0" />
                <span className="text-sm text-accent font-medium">
                  Create "{searchQuery.trim()}"
                </span>
              </button>
            )}
          </div>

          {/* Create new section (when no search) */}
          {allowCustom && !searchQuery && !isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-2 border-t border-border hover:bg-accent/10 transition-colors text-left"
            >
              <Plus size={14} className="text-accent" />
              <span className="text-sm text-accent font-medium">
                Create new category
              </span>
            </button>
          )}

          {/* Create new input */}
          {isCreating && (
            <div className="p-2 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNew();
                    } else if (e.key === 'Escape') {
                      setIsCreating(false);
                      setNewCategoryName('');
                    }
                  }}
                  placeholder="Enter category name..."
                  className="flex-1 px-2 py-1.5 text-sm bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
                <button
                  onClick={handleCreateNew}
                  disabled={!newCategoryName.trim()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
