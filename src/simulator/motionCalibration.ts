/** Distance feedback calibration, separate from motor speed and field geometry.
 * User estimate: move_tank(2000,2000,33.274) travels about 350 mm on hardware.
 * The uncalibrated controller stops near 329.74 mm (3 mm brake lead).
 * Rounded gain: 350/329.74 ≈ 1.06. This is an estimate, not a precise measurement.
 * A timed runLR(2000,2000) for 5 s still travels 325 physical millimetres.
 */
export const MOTION_CALIBRATION = Object.freeze({
  physicalMmPerEncoderMm: 1.06,
});
