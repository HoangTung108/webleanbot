import { expect, it, vi } from 'vitest'
import type { Monaco } from '@monaco-editor/react'
import { API_SUGGESTIONS, configureLeanbotLanguage, splitApiArguments } from './leanbotLanguage'
function setup() {
 const register = vi.fn()
 const monaco = { languages: { registerCompletionItemProvider: register, CompletionItemKind: { Function: 1, Constant: 2 }, CompletionItemInsertTextRule: { InsertAsSnippet: 4 } } } as unknown as Monaco
 configureLeanbotLanguage(monaco)
 const provider = register.mock.calls[0][1]
 const complete = (before:string, after='') => provider.provideCompletionItems({ getValueInRange:()=>before, getLineContent:()=>before+after }, { lineNumber:1,column:before.length+1 }).suggestions
 return { monaco, register, complete }
}
it('splits nested argument expressions and generates editable placeholders', () => {
 expect(splitApiArguments('CRGB(255, 0, 0), BITMAP(ledA, ledB), "a,b"')).toEqual(['CRGB(255, 0, 0)', 'BITMAP(ledA, ledB)', '"a,b"'])
 expect(API_SUGGESTIONS.find(item=>item.name==='LbRGB.fillColor')?.insertText).toContain('${1:CRGB(255, 0, 0)}')
})
it('replaces the entire qualified prefix without duplicating its receiver', () => {
 const {complete}=setup()
 const suggestions=complete('  LbMotion.ru')
 expect(suggestions.every((item:{label:string})=>item.label.startsWith('LbMotion.'))).toBe(true)
 const item=suggestions.find((item:{label:string})=>item.label==='LbMotion.runLR')
 expect(item.range.startColumn).toBe(3)
 expect(item.insertText).toBe('LbMotion.runLR(${1:1000}, ${2:1000})')
 expect(item.documentation.value).toContain('Tham số')
 expect(item.documentation.value).toContain('Kết quả')
})
it('does not duplicate parentheses and registers once for each Monaco instance', () => {
 const {complete,monaco,register}=setup()
 configureLeanbotLanguage(monaco)
 expect(register).toHaveBeenCalledTimes(1)
 expect(complete('LbMotion.run','(1000, 1000);').find((item:{label:string})=>item.label==='LbMotion.runLR').insertText).toBe('LbMotion.runLR')
 expect(complete('PUR').some((item:{label:string})=>item.label==='PURPLE')).toBe(true)
 expect(complete('CRGB::').every((item:{label:string})=>item.label.startsWith('CRGB::'))).toBe(true)
})
