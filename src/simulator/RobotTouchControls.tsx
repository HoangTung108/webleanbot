const buttons = [
  { mask: 1, label: 'TB1A · Line' },
  { mask: 3, label: 'TB1A + TB1B · Bài' },
  { mask: 4, label: 'TB2A · WiFi' },
  { mask: 8, label: 'TB2B · Reset' },
];

export function RobotTouchControls({ disabled, onPress }: {
  disabled: boolean;
  onPress: (mask: number) => void;
}) {
  return <div role="group" aria-label="Nút chạm Leanbot" className="sim-speed">
    <span>Nút robot</span>
    {buttons.map(({ mask, label }) => <button key={mask} className="sim-button"
      disabled={disabled} onClick={() => onPress(mask)}>{label}</button>)}
  </div>;
}


