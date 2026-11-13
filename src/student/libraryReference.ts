import { apiReference } from './apiReference'

// Show all documented SDK APIs; select only primary BaseCode helpers.
const primaryCommands = new Set([
  'robot_delay', 'close_hand', 'open_hand',
  'close_hand_async', 'open_hand_async', 'wait_hand',
  'move_tank', 'turn_one_wheel', 'turn_two_wheels',
  'declare_wifi', 'set_wifi', 'set_line', 'measure_line', 'calibrate_line',
  'followLineCm', 'followLineSeconds', 'followLineUntilJunction',
  'followLineMultipleJunctions', 'goToJunction',
  'read_color', 'send_iot_color', 'read_iot_color', 'connect_robot_room',
])

export const libraryReference = apiReference.filter(row =>
  row.group !== 'helpers' || primaryCommands.has(row.api.split('(')[0]),
).map(row => ({
  ...row,
  group: row.group === 'sensors' || row.group === 'cpp' ? 'arduino' : row.group,
}))
