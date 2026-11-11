import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { LeanbotSerialClient } from '../lib/serial'
import { SerialDebugPanel } from './SerialDebugPanel'
it('buffers USB text, bounds output and clears pending data', () => {
  vi.useFakeTimers()
  const serial = new LeanbotSerialClient()
  const view = render(<SerialDebugPanel serial={serial} connected busy={false} />)
  act(() => { serial.onText('robot '); serial.onText('ready\n'); vi.advanceTimersByTime(100) })
  expect(screen.getByLabelText('Log debug Serial').textContent).toBe('robot ready\n')
  act(() => { serial.onText('x'.repeat(70000)); vi.advanceTimersByTime(100) })
  expect(screen.getByLabelText('Log debug Serial').textContent?.length).toBe(65536)
  act(() => { serial.onText('pending') })
  fireEvent.click(screen.getByText('Xóa log'))
  act(() => { vi.advanceTimersByTime(100) })
  expect(screen.getByLabelText('Log debug Serial').textContent).toBe('Chờ dữ liệu từ Leanbot…')
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
  vi.useRealTimers()
})
