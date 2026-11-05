#!/usr/bin/env python3
"""Small POSIX serial RPC transport, using only Python's standard library."""
import base64
import errno
import fcntl
import json
import os
import select
import struct
import sys
import termios
import time
import tty

fd = None


def set_baud(baud):
    speed = getattr(termios, 'B' + str(baud), None)
    if speed is None:
        raise ValueError('Unsupported baud rate: ' + str(baud))
    tty.setraw(fd, termios.TCSANOW)
    attrs = termios.tcgetattr(fd)
    attrs[2] |= termios.CLOCAL | termios.CREAD
    attrs[2] &= ~(getattr(termios, 'CRTSCTS', 0))
    attrs[4] = attrs[5] = speed
    termios.tcsetattr(fd, termios.TCSANOW, attrs)


def read_exact(length, timeout):
    end = time.monotonic() + timeout / 1000
    data = bytearray()
    while len(data) < length:
        remaining = end - time.monotonic()
        if remaining <= 0 or not select.select([fd], [], [], remaining)[0]:
            raise TimeoutError('USB read timeout: %s/%s bytes' % (len(data), length))
        try:
            chunk = os.read(fd, length - len(data))
        except BlockingIOError:
            continue
        if not chunk:
            raise OSError('Serial device disconnected')
        data.extend(chunk)
    return bytes(data)


def execute(request):
    global fd
    op = request['op']
    if op == 'open':
        path = request['port']
        if not path.startswith('/dev/cu.usb') and not path.startswith('/dev/tty.usb'):
            raise ValueError('Only an explicitly selected USB serial device is allowed')
        fd = os.open(path, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        try:
            fcntl.ioctl(fd, termios.TIOCEXCL)
            set_baud(request.get('baud', 115200))
        except BaseException:
            os.close(fd)
            fd = None
            raise
        return {'opened': path}
    if fd is None:
        raise OSError('Serial port is not open')
    if op == 'baud':
        set_baud(request['value'])
    elif op == 'dtr':
        code = termios.TIOCMBIS if request['value'] else termios.TIOCMBIC
        fcntl.ioctl(fd, code, struct.pack('I', termios.TIOCM_DTR))
    elif op == 'write':
        data = base64.b64decode(request['data'])
        deadline = time.monotonic() + 3
        while data:
            if time.monotonic() > deadline:
                raise TimeoutError('Serial write timeout')
            try:
                data = data[os.write(fd, data):]
            except BlockingIOError:
                select.select([], [fd], [], 0.1)
    elif op == 'read':
        return {'data': base64.b64encode(read_exact(request['length'], request['timeout'])).decode('ascii')}
    elif op == 'flush':
        deadline = time.monotonic() + request['duration'] / 1000
        while time.monotonic() < deadline:
            if select.select([fd], [], [], max(0, deadline - time.monotonic()))[0]:
                try:
                    os.read(fd, 4096)
                except BlockingIOError:
                    pass
        termios.tcflush(fd, termios.TCIFLUSH)
    elif op == 'close':
        os.close(fd)
        fd = None
    else:
        raise ValueError('Unknown serial operation: ' + op)
    return {}


try:
    for line in sys.stdin:
        request = {}
        try:
            request = json.loads(line)
            result = execute(request)
            print(json.dumps({'id': request['id'], 'ok': True, **result}), flush=True)
        except Exception as error:
            print(json.dumps({'id': request.get('id'), 'ok': False, 'error': str(error)}), flush=True)
finally:
    if fd is not None:
        os.close(fd)
