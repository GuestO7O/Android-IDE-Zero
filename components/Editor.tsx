import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { getAiCompletion } from '../services/geminiService';

interface EditorComponentProps {
  fileId: string;
  fileName: string;
  fileContent: string;
  language: string;
  onChange: (value: string | undefined) => void;
  theme?: string;
  tabSize?: number;
  insertSpaces?: boolean;
  aiAutocomplete?: boolean;
  projectContext?: string;
}

const EditorComponent: React.FC<EditorComponentProps> = ({ 
  fileId,
  fileName,
  fileContent, 
  language, 
  onChange, 
  theme = "vs-dark",
  tabSize = 2,
  insertSpaces = true,
  aiAutocomplete = true,
  projectContext = ""
}) => {
  const completionProviderRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editor.updateOptions({
      minimap: { enabled: false }, 
      fontSize: 14,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineNumbersMinChars: 3,
      padding: { top: 10, bottom: 10 },
      quickSuggestions: { other: true, comments: false, strings: true },
      parameterHints: { enabled: true },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      formatOnPaste: true,
      formatOnType: true,
      scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
      tabSize,
      insertSpaces,
    });

    if (aiAutocomplete) {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }

      completionProviderRef.current = monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['.', ' ', '(', '{', '"', '\''],
        provideCompletionItems: async (model, position) => {
          const prefix = model.getValueInRange({
            startLineNumber: Math.max(1, position.lineNumber - 5),
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });
          const suffix = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 5),
            endColumn: model.getLineMaxColumn(Math.min(model.getLineCount(), position.lineNumber + 5))
          });

          const suggestions = await getAiCompletion(prefix, suffix, fileName, projectContext);
          
          return {
            suggestions: suggestions.map(text => ({
              label: text,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: text,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              },
              detail: 'Agent Zero Autocomplete'
            }))
          };
        }
      });
    }

    if (language === 'typescript' || language === 'javascript') {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        typeRoots: ["node_modules/@types"],
        jsx: monaco.languages.typescript.JsxEmit.React,
      });
    }
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={fileContent}
        theme={theme}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
            renderWhitespace: 'selection',
            tabSize,
            insertSpaces,
            fontFamily: "'Fira Code', 'Droid Sans Mono', 'monospace'",
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
        }}
      />
    </div>
  );
};

export default EditorComponent;
