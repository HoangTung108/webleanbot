import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentIDE } from './StudentIDE'
import * as fileActions from '../project/projectFiles'

vi.mock('../editors/LegacyBlocklyEditor', () => ({ LegacyBlocklyEditor: React.forwardRef(function Legacy({ xml, onChange }: any, ref) {
  React.useImperativeHandle(ref, () => ({ getLegacySnapshot: () => ({ xml, cpp: 'generated from ' + xml }), undo() {}, redo() {} }))
  React.useEffect(() => { onChange(xml, 'generated from ' + xml) }, [])
  return <textarea aria-label="Khối cũ" value={xml} onChange={e => onChange(e.target.value, 'generated from ' + e.target.value)} />
}) }))
vi.mock('../editors/CppEditor', () => ({ CppEditor: React.forwardRef(function Cpp({ value, onChange }: any, ref) {
  React.useImperativeHandle(ref, () => ({ undo() {}, redo() {} }))
  return <textarea aria-label="Code C++" value={value} onChange={e => onChange(e.target.value)} />
}) }))
beforeEach(() => { localStorage.clear(); vi.spyOn(fileActions, 'downloadDocument').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('student file workflows', () => {
  it('keeps separate documents, renames, downloads fresh C++ and restores a closed file', async () => {
    render(<StudentIDE />)
    expect(screen.getByLabelText('Khối cũ')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'C++' }))
    fireEvent.change(screen.getByLabelText('Tên tệp'), { target: { value: 'mission.ino' } })
    const code = 'void loop(){ move_tank(2000,2000,35); }'
    fireEvent.change(screen.getByLabelText('Code C++'), { target: { value: code } })
    fireEvent.click(screen.getByRole('button', { name: 'Code C++ (.ino)' }))
    expect(fileActions.downloadDocument).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'mission.ino', cppSource: code }), 'cpp')
    fireEvent.click(screen.getByRole('button', { name: 'Bài 01.xml' }))
    expect(screen.getByLabelText('Khối cũ')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'mission.ino' }))
    expect((screen.getByLabelText('Code C++') as HTMLTextAreaElement).value).toBe(code)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng tệp mission.ino' }))
    expect(screen.queryByRole('button', { name: 'mission.ino' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Khôi phục tệp vừa đóng' }))
    expect((screen.getByLabelText('Code C++') as HTMLTextAreaElement).value).toBe(code)
    await waitFor(() => expect(fileActions.loadDocuments().find(p => p.name === 'mission.ino')?.cppSource).toBe(code))
  })
  it('imports a file from disk without replacing the existing document', async () => {
    const view = render(<StudentIDE />)
    const file = new File(['custom source'], 'imported.ino', { type: 'text/plain' })
    Object.defineProperty(file, 'text', { value: async () => 'custom source' })
    fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [file] } })
    await waitFor(() => expect((screen.getByLabelText('Code C++') as HTMLTextAreaElement).value).toBe('custom source'))
    expect(screen.getByRole('button', { name: 'Bài 01.xml' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'imported.ino' })).toBeTruthy()
  })
  it('preserves edited C++ in a separate file when returning to classic blocks', () => {
    render(<StudentIDE />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'C++' }), { button: 0, ctrlKey: false })
    fireEvent.change(screen.getByLabelText('Code C++'), { target: { value: 'my custom edits' } })
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Blocks' }), { button: 0, ctrlKey: false })
    expect(screen.getByLabelText('Khối cũ')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Bài 01.xml - C++.ino' }))
    expect((screen.getByLabelText('Code C++') as HTMLTextAreaElement).value).toBe('my custom edits')
  })

})
