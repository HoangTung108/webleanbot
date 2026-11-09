import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SimulatorDock } from './SimulatorDock';
afterEach(cleanup);
it('keeps panels mounted, toggles one panel, and counts new logs while closed', () => {
  const onPanelChange = vi.fn();
  const panels = [
    { id: 'robot', label: 'Robot', icon: null, content: <input aria-label="Saved value" defaultValue="keep" /> },
    { id: 'logs', label: 'Logs', icon: null, content: <div>Log detail</div> },
  ];
  const view = render(<SimulatorDock panels={panels} onPanelChange={onPanelChange}><div>Board</div></SimulatorDock>);
  expect(screen.getByText('Log detail')).not.toBeVisible();
  view.rerender(<SimulatorDock panels={panels} onPanelChange={onPanelChange} logEvent={{ message: 'new' }}><div>Board</div></SimulatorDock>);
  expect(screen.getByLabelText('1 log mới')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Logs/ }));
  expect(screen.getByText('Log detail')).toBeVisible();
  expect(screen.queryByLabelText('1 log mới')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Robot' }));
  expect(screen.getByText('Log detail')).not.toBeVisible();
  expect(screen.getByLabelText('Saved value')).toHaveValue('keep');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByLabelText('Saved value')).not.toBeVisible();
  expect(onPanelChange).toHaveBeenLastCalledWith(null);
});
