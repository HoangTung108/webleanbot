import { apiReference } from './apiReference'

// Show all documented SDK APIs; select only primary BaseCode helpers.
const primaryCommands = new Set([
  'robot_delay', 'close_hand', 'open_hand',
  'close_hand_async', 'open_hand_async', 'wait_hand',
  'move_tank', 'turn_one_wheel', 'turn_two_wheels',
  'declare_wifi', 'set_wifi', 'set_line', 'measure_line', 'calibrate_line',
  'followLineCm', 'followLineSeconds', 'followLineUntilJunction',
  'followLineMultipleJunctions', 'goToJunction',
  'calibrate_color', 'read_color', 'get_color', 'is_color',
  'send_iot_color', 'read_iot_color', 'reset_iot_color', 'wait_iot_color',
  'use_wifi_color_mode', 'connect_robot_room',
  'send_real_robot_color', 'read_real_robot_color', 'wait_real_robot_color',
  'iot_queue_count', 'pop_iot_color', 'clear_iot_queue',
])

export const libraryReference = apiReference.filter(row =>
  row.group !== 'helpers' || primaryCommands.has(row.api.split('(')[0]),
).map(row => ({
  ...row,
  group: row.group === 'sensors' || row.group === 'cpp' ? 'arduino' : row.group,
}))
