# Bootloader upload and address zero

The React uploader keeps one USB reader active across monitoring and upload.
During upload, incoming bytes are routed into an exclusive protocol queue;
monitor text and keyboard sends cannot consume or interleave bootloader ACKs.
Timeouts retain partial frames, cancellation removes waiters, and closing an upload
lease releases the writer and resumes monitoring. The reader is cancelled only
when actually closing/reopening the port (including changing baud).

Bootloader entry now retries the full DTR reset and GET_SYNC sequence up to three
times at 115200 baud, then tries 57600 baud for older Nano bootloaders if needed.
The same selected USB port is reused. The monitor baud returns to 115200 after
upload. DTR timing follows the repository's original Leanbot uploader: 10 ms pulse,
100 ms flush, 300 ms settle. GET_SYNC proceeds directly to LOAD_ADDRESS without
requiring ENTER_PROGMODE, matching the reference implementation.

STK500 responses can be fragmented. Startup bytes preceding INSYNC are skipped;
flash payload is read at its exact expected length. Errors identify the command,
byte address, word address, or expected/actual verified byte.

Flash byte address **0x0000 is valid** and is the reset-vector page. It is encoded
as LOAD_ADDRESS word 0x0000 and verified in full. Application pages at 0x7000 are
also retained. HEX parsing never silently filters out firmware bytes: the uploader
rejects pages beyond the application limit before programming (32256 bytes at
115200, 30720 bytes for the old-bootloader fallback). No bootloader flashing or
fuse updates are performed.

Sources for the physical communication conventions:
- [Repository reference](../public/leanbot-ide/LeanbotSerial.js)
- [Arduino AVR board definitions](https://github.com/arduino/ArduinoCore-avr/blob/master/boards.txt)
- [Chrome Web Serial stream handling](https://developer.chrome.com/docs/capabilities/serial)

Tests emulate a USB port using real ReadableStream/WritableStream objects and
STK500 flash memory, covering split/noisy replies, timeout, abort, baud switching,
address zero, write/readback, and monitor restoration. This does not replace a
physical upload test on the user's Leanbot.
