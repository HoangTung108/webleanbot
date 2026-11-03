import React from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LegacyBlocklyEditor } from './LegacyBlocklyEditor'
import type { BlocklyCommands } from './BlocklyEditor'

// Exercise the same-origin bridge against the classic editor's public APIs.
afterEach(() => { cleanup(); vi.useRealTimers() })
describe('classic Blockly bridge', () => {
  it('loads XML, forwards changes and exposes live snapshots/toolbar commands', () => {
    vi.useFakeTimers()
    const ref = React.createRef<BlocklyCommands>(), onChange = vi.fn(), onError = vi.fn()
    const view = render(<LegacyBlocklyEditor ref={ref} xml="<xml/>" onChange={onChange} onError={onError} />)
    const frame = screen.getByTitle('Blockly Leanbot') as HTMLIFrameElement
    const win: any = { document: document.implementation.createHTMLDocument('Blockly') }
    Object.defineProperty(frame, 'contentWindow', { value: win })
    let xml = '<xml/>', code = 'first code', listener: ((event: any) => void) | undefined
    const workspace = { undo: vi.fn(), zoomCenter: vi.fn(), scrollCenter: vi.fn(), addChangeListener: vi.fn(fn => { listener = fn }), removeChangeListener: vi.fn() }
    win.Blockly_setBlockContent = vi.fn(value => { xml = value; return true })
    win.Blockly_getBlockContent = () => xml
    win.Blockly_getGeneratedCode = () => code
    win.Code = { workspace }; win.Blockly = { svgResize: vi.fn() }
    act(() => vi.advanceTimersByTime(100))
    expect(win.Blockly_setBlockContent).toHaveBeenCalledWith('<xml/>')
    expect(onChange).toHaveBeenLastCalledWith('<xml/>', 'first code')
    expect(win.document.head.textContent).toContain('blocklyToolboxDiv')
    xml = '<xml><block type="Leanbot.whenStarted"/></xml>'; code = 'edited code'
    act(() => { listener!({ isUiEvent: false }); vi.advanceTimersByTime(80) })
    expect(onChange).toHaveBeenLastCalledWith(xml, code)
    expect(ref.current?.getLegacySnapshot?.()).toEqual({ xml, cpp: code })
    act(() => ref.current?.undo()); expect(workspace.undo).toHaveBeenCalledWith(false)
    act(() => ref.current?.redo()); expect(workspace.undo).toHaveBeenCalledWith(true)
    view.unmount(); expect(workspace.removeChangeListener).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
