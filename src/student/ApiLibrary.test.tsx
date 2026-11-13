import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiLibrary } from './ApiLibrary'
afterEach(cleanup)
it('shows documented APIs, filters and switches groups', () => {
  render(<ApiLibrary />)
  expect(screen.getByText('LbMotion.runLR(1000, 1000);')).toBeTruthy()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-such-api' } })
  expect(screen.getByText('Không tìm thấy API trong nhóm này.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Leanbot IoT' }))
  expect(screen.getByText('LbIoT.Asset.begin(F("AssetID"));')).toBeTruthy()
  expect(screen.getByText(/Kênh IoT lưu màu mới nhất/)).toBeTruthy()
})
it('copies the annotated example and confirms success', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  render(<ApiLibrary />)
  fireEvent.click(screen.getByRole('button', { name: 'Sao chép code' }))
  expect(await screen.findByText('Đã sao chép')).toBeTruthy()
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('// Khởi tạo phần cứng'))
})
it('shows parameter and return explanations and copies an individual API example', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  render(<ApiLibrary />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'runLR(1000' } })
  expect(screen.getByText('Tham số / đơn vị')).toBeTruthy()
  expect(screen.getByText(/L, R: tốc độ động cơ/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Sao chép ví dụ LbMotion.runLR(1000, 1000);' }))
  expect(await screen.findByText('Đã sao chép')).toBeTruthy()
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('LbMotion.runLR(1000, 1000);'))
})
