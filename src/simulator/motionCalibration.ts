/** Latest straight-run measurement: 325 mm command stopped at 322 encoder mm,
 * travelling 320 physical mm. The base now removes the 3 mm early stop and
 * applies DISTANCE_SCALE = 322/320. Keep its inverse here to avoid double compensation.
 * Timed runLR(2000,2000) remains 65 physical mm/s.
 */
export const MOTION_CALIBRATION = Object.freeze({
  physicalMmPerEncoderMm: 320 / 322,
});
