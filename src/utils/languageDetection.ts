// Language detection utility for Monaco Editor

const extensionToLanguage: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Web
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',

  // Data formats
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'ini',

  // Markdown
  '.md': 'markdown',
  '.mdx': 'markdown',

  // Programming languages
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.r': 'r',
  '.lua': 'lua',
  '.sql': 'sql',

  // Shell scripts
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.fish': 'shell',
  '.ps1': 'powershell',
  '.bat': 'bat',
  '.cmd': 'bat',

  // Config files
  '.env': 'ini',
  '.ini': 'ini',
  '.conf': 'ini',
  '.cfg': 'ini',
  '.gitignore': 'ini',
  '.dockerignore': 'ini',

  // Docker
  'Dockerfile': 'dockerfile',
  '.dockerfile': 'dockerfile',

  // Other
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.svg': 'xml',
};

// Files that should be detected by their exact name
const filenameToLanguage: Record<string, string> = {
  'Dockerfile': 'dockerfile',
  'Makefile': 'makefile',
  'Rakefile': 'ruby',
  'Gemfile': 'ruby',
  '.gitignore': 'ini',
  '.dockerignore': 'ini',
  '.editorconfig': 'ini',
  '.prettierrc': 'json',
  '.eslintrc': 'json',
  'tsconfig.json': 'json',
  'package.json': 'json',
};

export function detectLanguage(filename: string): string {
  // First check exact filename matches
  if (filenameToLanguage[filename]) {
    return filenameToLanguage[filename];
  }

  // Then check extension
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    const ext = filename.substring(lastDotIndex).toLowerCase();
    if (extensionToLanguage[ext]) {
      return extensionToLanguage[ext];
    }
  }

  return 'plaintext';
}

export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    less: 'Less',
    json: 'JSON',
    xml: 'XML',
    yaml: 'YAML',
    markdown: 'Markdown',
    python: 'Python',
    ruby: 'Ruby',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    kotlin: 'Kotlin',
    swift: 'Swift',
    c: 'C',
    cpp: 'C++',
    csharp: 'C#',
    php: 'PHP',
    r: 'R',
    lua: 'Lua',
    sql: 'SQL',
    shell: 'Shell',
    powershell: 'PowerShell',
    bat: 'Batch',
    dockerfile: 'Dockerfile',
    makefile: 'Makefile',
    graphql: 'GraphQL',
    ini: 'Config',
    plaintext: 'Plain Text',
  };

  return displayNames[language] || language;
}
