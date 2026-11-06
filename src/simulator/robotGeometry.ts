/** Millimetres, axle midpoint as origin, +X toward the gripper.
 * Robot dimensions are a photo-based estimate, not a measured device profile.
 * Reference: the supplied 2026-11-06 photos and a 25 mm wide / 75 mm tall block.
 * Mat and mission-block dimensions remain the known competition dimensions.
 */
export const LEANBOT_GEOMETRY = {
  length: 180,
  width: 100,
  collisionRadius: 100,
  wheelBase: 84,
  graspOffset: 75,
  body: { x: -27, y: 0, length: 130, width: 64 },
  wheel: { length: 28, width: 16 },
} as const;
