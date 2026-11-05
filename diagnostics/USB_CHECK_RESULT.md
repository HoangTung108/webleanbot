# Leanbot USB diagnostic — 2026-11-05

Device: `/dev/cu.usbserial-1120`, CH340 (VID 1A86, PID 7523).

- Cloud compilation succeeded: `LeanbotUsbCheck.ino`, 7328 flash bytes.
- STK500 sync succeeded at 115200 baud.
- Reported MCU signature: `1E 95 0F`; bootloader version parameters: 4.4.
- All programmed pages returned ACK, addresses 0x0000 through 0x1C80.
- Verification FAILED: expected first byte 0x0C, received 0x62.
- Separate READ_PAGE probes at byte addresses 0x0000, 0x0080, 0x0100 and 0x1C00 returned sixteen bytes of 0x62 each, framed by valid INSYNC/OK.
- ENTER_PROGMODE did not change the readback result.
- LEAVE_PROGMODE returned ACK. No diagnostic heartbeat was received within eight seconds afterward.
- Reset/listen also did not receive the expected diagnostic banner.

This confirms USB communication with the bootloader, but does NOT confirm a successful application upload. Constant readback alone does not establish whether flash protection, bootloader implementation or flash programming is responsible. Verification was not bypassed. Bootloader/fuses were not rewritten.

Diagnostic firmware stops motors and does not move the gripper. Its expected Serial messages at 115200 are `LEANBOT_USB_CHECK_READY`, `LEANBOT_USB_CHECK_OK uptime_ms=...`, and `LEANBOT_USB_ECHO_OK` in response to `?`.

Reproduce on macOS with Node/tsx and Python 3:

```sh
node --import tsx scripts/leanbot-usb-check.ts --port /dev/cu.usbserial-1120
```

This command replaces the application firmware. The original application is not backed up; its source must be recompiled to restore it. Compiler output, HEX and upload transcript are saved in the temporary directory printed by the command.

## Independent Arduino tool check

The user confirmed the MCU is ATmega328P and this board previously accepted uploads. Installed Arduino avrdude 8.0-arduino.1 reproduced the exact mismatch using the same diagnostic HEX at 115200 baud. A separately compiled 1768-byte sketch using only Arduino Serial (no Leanbot library) also failed verification at 0x0000 (0x62 instead of 0x0C), and no expected heartbeat appeared in ten seconds. Thus the failure is reproducible independently of both the web uploader and Leanbot library initialization.

No successful upload has been established. The next recovery path, if the USB tests remain unsuccessful, is ISP inspection using USBasp or a second Arduino. Read the actual fuse/lock values and preserve available board data before choosing bootloader/fuse settings; do not assume Uno bootloader settings solely from the MCU signature.

Old-bootloader check: avrdude at 57600 baud did not sync after ten attempts. The responding bootloader baud is 115200. Software validation after the improved error message: 16 serial/uploader tests passed.
