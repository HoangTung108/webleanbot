import { describe, expect, it, vi } from 'vitest'
import { RealRobotColorBridge } from './realRobotColorBridge'
import { RobotNetworkManager } from './robotNetworkManager'
import { LeanbotSerialClient } from './serial'

describe('RealRobotColorBridge', () => {
  it('forwards serial color print from real robot to WebSocket network', () => {
    const manager = new RobotNetworkManager()
    const serial = new LeanbotSerialClient()
    const sendSpy = vi.spyOn(manager, 'sendColorSignal').mockReturnValue(true)

    const bridge = new RealRobotColorBridge(serial, manager)
    bridge.start()

    const historyListener = vi.fn()
    bridge.onColorExchange(historyListener)

    // Simulate real robot serial output
    serial['emitText']('System initialized\n')
    expect(sendSpy).not.toHaveBeenCalled()

    serial['emitText']('COLOR:RED\n')
    expect(sendSpy).toHaveBeenCalledWith('RED')
    expect(historyListener).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'out',
      source: 'serial',
      color: 'RED',
    }))

    serial['emitText']('[COLOR]: BLUE\n')
    expect(sendSpy).toHaveBeenCalledWith('BLUE')

    expect(bridge.getHistory().length).toBe(2)
    bridge.dispose()
  })

  it('forwards network color signal to physical robot via serial write', async () => {
    const manager = new RobotNetworkManager()
    const serial = new LeanbotSerialClient()
    const serialSendSpy = vi.spyOn(serial, 'send').mockResolvedValue(undefined)
    Object.defineProperty(serial, 'connected', { get: () => true })

    const bridge = new RealRobotColorBridge(serial, manager)
    bridge.start()

    const historyListener = vi.fn()
    bridge.onColorExchange(historyListener)

    // Simulate incoming color-signal event on network manager
    manager['emit']('color-signal', {
      type: 'color-signal',
      color: 'GREEN',
      peerId: 'peer-robot-2',
      senderRobotId: 'Robot-2',
      timestamp: 123456,
    })

    expect(serialSendSpy).toHaveBeenCalledWith('COLOR:GREEN\n')
    expect(historyListener).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'in',
      source: 'websocket',
      color: 'GREEN',
      peerId: 'peer-robot-2',
    }))

    bridge.dispose()
  })

  it('allows sending manual color signal', async () => {
    const manager = new RobotNetworkManager()
    const serial = new LeanbotSerialClient()
    const sendSpy = vi.spyOn(manager, 'sendColorSignal').mockReturnValue(true)
    const serialSendSpy = vi.spyOn(serial, 'send').mockResolvedValue(undefined)
    Object.defineProperty(serial, 'connected', { get: () => true })

    const bridge = new RealRobotColorBridge(serial, manager)
    bridge.start()

    const result = await bridge.sendColor('YELLOW', true)
    expect(result).toBe(true)
    expect(sendSpy).toHaveBeenCalledWith('YELLOW')
    expect(serialSendSpy).toHaveBeenCalledWith('COLOR:YELLOW\n')

    expect(bridge.getHistory()[0].color).toBe('YELLOW')
    expect(bridge.getHistory()[0].source).toBe('manual')

    bridge.dispose()
  })

  it('does not forward when bridge is stopped', () => {
    const manager = new RobotNetworkManager()
    const serial = new LeanbotSerialClient()
    const sendSpy = vi.spyOn(manager, 'sendColorSignal').mockReturnValue(true)

    const bridge = new RealRobotColorBridge(serial, manager)
    bridge.stop()

    serial['emitText']('COLOR:RED\n')
    expect(sendSpy).not.toHaveBeenCalled()
    expect(bridge.getHistory().length).toBe(0)

    bridge.dispose()
  })
})

