import { apiReference } from '../student/apiReference'
import type { Monaco } from '@monaco-editor/react'
import type { editor, Position } from 'monaco-editor'
import type { Diagnostic } from '../transpiler'

// Use the same documentation as the Library tab.
export function splitApiArguments(text: string): string[] {
  if (!text.trim()) return [];
  const args: string[] = [];
  let start = 0, depth = 0, quote = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) { if (char === '\\') i++; else if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[' || char === '{') depth++;
    else if (char === ')' || char === ']' || char === '}') depth--;
    else if (char === ',' && depth === 0) { args.push(text.slice(start, i).trim()); start = i + 1; }
  }
  args.push(text.slice(start).trim());
  return args;
}

export const API_SUGGESTIONS = apiReference.flatMap(entry => {
  const match = entry.api.match(/([A-Za-z_]\w*(?:(?:\.|::)\w+)*)\((.*)\);?$/);
  if (!match) return [];
  const [, name, args] = match;
  const escape = (value: string) => value.replace(/[\\$}]/g, '\\$&');
  const insertText = name + '(' + splitApiArguments(args).map((arg, i) => '${' + (i + 1) + ':' + escape(arg) + '}').join(', ') + ')';
  return [{ name, insertText, entry }];
});
export const LEANBOT_COMPLETIONS = [...new Set(API_SUGGESTIONS.map(item => item.name))];
const configured = new WeakSet<object>();
const constants = ['OBJECT_UNKNOWN', 'OBJECT_RED', 'OBJECT_GREEN', 'OBJECT_BLUE', 'OBJECT_YELLOW', 'OBJECT_PURPLE', 'TWO_WHEELS', 'LEFT_ONLY', 'RIGHT_ONLY', 'TB1A', 'TB1B', 'GRIP_CLOSE_ANGLE', 'CRGB::Red', 'CRGB::Green', 'CRGB::Blue'];

export function configureLeanbotLanguage(monaco: Monaco) {
  if (configured.has(monaco)) return;
  monaco.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.', ':'],
    provideCompletionItems(model: editor.ITextModel, position: Position) {
      const before = model.getValueInRange({ startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: 1, endColumn: position.column });
      const typed = before.match(/[A-Za-z_]\w*(?:(?:\.|::)\w*)*$/)?.[0] ?? '';
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: position.column - typed.length, endColumn: position.column };
      const separator = Math.max(typed.lastIndexOf('.'), typed.lastIndexOf('::'));
      const receiver = separator >= 0 ? typed.slice(0, separator + (typed.slice(separator, separator + 2) === '::' ? 2 : 1)) : '';
      const after = model.getLineContent(position.lineNumber).slice(position.column - 1);
      const suggestions = API_SUGGESTIONS.filter(item => !receiver || item.name.startsWith(receiver)).map(({ name, insertText, entry }) => ({
        label: name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: /^\s*\(/.test(after) ? name : insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: entry.api + ' · ' + (entry.group === 'helpers' ? 'Hàm baseCode' : entry.group),
        documentation: { value: entry.description + '\n\n**Tham số:** ' + entry.parameters + '\n\n**Kết quả:** ' + entry.returns + '\n\n**Lưu ý:** ' + entry.notes + '\n\n```cpp\n' + entry.code + '\n```', isTrusted: false },
        range,
      }));
      return { suggestions: [...suggestions, ...constants.filter(name => !receiver || name.startsWith(receiver)).map(name => ({ label: name, kind: monaco.languages.CompletionItemKind.Constant, insertText: name, range }))] };
    },
  });
  configured.add(monaco);
}

export function diagnosticsToMarkers(monaco: Monaco, diagnostics: Diagnostic[]) {
  return diagnostics.map((item) => ({
    severity: item.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
    message: item.message,
    startLineNumber: item.lineStart,
    endLineNumber: item.lineEnd,
    startColumn: 1,
    endColumn: 120,
  }))
}
