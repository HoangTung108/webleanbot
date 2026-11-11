export const MAX_ROBOT_MESSAGE_BYTES = 1024

export function isValidRobotMessage(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && new TextEncoder().encode(value).length <= MAX_ROBOT_MESSAGE_BYTES
}
