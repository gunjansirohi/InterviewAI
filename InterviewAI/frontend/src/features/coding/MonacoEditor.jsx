import Editor from '@monaco-editor/react';

const languageMap = { javascript: 'javascript', python: 'python', java: 'java', cpp: 'cpp', c: 'c', csharp: 'csharp', go: 'go' };

export default function MonacoEditor({ language, value, onChange }) {
  return <Editor height="100%" language={languageMap[language]} value={value} onChange={(nextValue) => onChange(nextValue || '')} theme="vs-dark" loading={<div className="flex h-full items-center justify-center bg-slate-900 text-slate-300">Loading editor...</div>} options={{ minimap: { enabled: false }, fontSize: 14, lineHeight: 22, automaticLayout: true, scrollBeyondLastLine: false, tabSize: 2, wordWrap: 'on', padding: { top: 14 } }} />;
}
