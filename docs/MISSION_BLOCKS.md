# Custom mission blocks

Both simulator interfaces use the same `MissionWorld` and mission editor.
Blockly labels now use English, including old `_vi` block IDs, which remain
unchanged so imported XML continues to open.

## Setup

- Choose a colored palette item and click a numbered site, or drag it from the
  palette to the mat. Drag a placed block to move it. Erase removes a block;
  Robot restores the normal robot-placement tool.
- Pollution has green, blue, purple, red and yellow variants and occupies a city
  site A1–H4. Neutralizers have green, blue and purple variants, a white stripe,
  and initially occupy Storage S1–S6.
- Enter quantities (0–32 pollution, 0–6 neutralizers) and a numeric seed, then
  Randomize layout. This replaces the setup without duplicate occupied slots.
- Download/Open mission stores the starting layout, colors and friction in JSON.
  Reset restores the starting layout, not the final state of the last run.
- Editing is disabled while running or paused. On Stop, moving/falling objects
  can finish settling. The starting layout is autosaved in browser storage, so
  returning to the IDE and opening either simulator restores it. Active physical
  state remains separate for each running simulator instance.

## Dimensions and physical model

Source: the FIELD MODEL image provided in the conversation. Every block has
length 15 mm, width 25 mm, height 75 mm. Standing footprints are 15 × 25 mm;
fallen footprints are 75 × 25 mm, with intermediate footprint during tipping.
Neutralizer stripes cross the middle of the long side when fallen.

This is a **2.5D approximation**, not a calibrated 3D dynamics engine:

- Oriented rectangle contacts with positional separation, normal collision
  impulses, mass and restitution; off-centre chassis contacts produce yaw.
- Coulomb floor friction, adjustable from 0 to 1 (default 0.35), angular damping,
  restitution 0.1 and gravity 9810 mm/s². Mass is estimated at 25 g per block;
  neither mass nor material coefficients were supplied in the image.
- Contacts tip standing blocks when estimated contact torque exceeds restoring
  gravity torque. Tipping animates to a horizontal resting state.
- Chassis and wheels push blocks; block–block contacts and field edges constrain
  movement. The robot remains kinematic and keeps its measured speed calibration.
- Closing **both** grippers to at least 55° can capture one block inside the jaw
  reach. It follows the gripper position and robot rotation until either jaw
  opens. Closing far from a block does not capture it. Release while moving can
  cause a fall; stop before opening to place an upright block.
- C++ `LbGripper.open/close/moveTo/moveToLR` controls the physical grasp. Blocks
  provide ultrasonic distance readings; carried blocks are excluded, and low
  fallen blocks are below the estimated 35 mm sensor height.

No competition scoring, automatic neutralization, or chemistry/color matching is
inferred. Pollution and neutralizer types are stored distinctly for later rules.
