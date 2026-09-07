"""Build DAIL's sample-based sound cues. Requires ffmpeg on PATH; Python stdlib only.
Sources and licenses: scripts/audio-sources/README.md. Run from any directory.
"""
from pathlib import Path
from array import array
import math
import subprocess
import wave

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'scripts/audio-sources'
OUT = ROOT / 'public/sfx'
SR = 44100


def source(name, filters=''):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(SRC / (name + '.ogg'))]
    if filters:
        cmd += ['-af', filters]
    data = subprocess.check_output(cmd + ['-ar', str(SR), '-ac', '1', '-f', 'f32le', '-'])
    samples = array('f'); samples.frombytes(data)
    peak = max(abs(v) for v in samples) or 1
    return array('f', (v / peak for v in samples))


def mix(duration, layers, peak_limit=.65):
    stereo = [array('f', [0]) * int(duration * SR) for _ in range(2)]
    for samples, at, level, fade_in, fade_out, pan in layers:
        start = round(at * SR)
        length = min(len(samples), len(stereo[0]) - start)
        for i in range(length):
            envelope = min(1, i / max(1, fade_in * SR), (length - 1 - i) / max(1, fade_out * SR))
            v = samples[i] * level * max(0, envelope)
            stereo[0][start + i] += v * math.sqrt((1 - pan) / 2)
            stereo[1][start + i] += v * math.sqrt((1 + pan) / 2)
    peak = max(max(abs(v) for v in channel) for channel in stereo) or 1
    gain = min(1, peak_limit / peak)
    pcm = array('h')
    for left, right in zip(*stereo):
        pcm.extend((round(left * gain * 32767), round(right * gain * 32767)))
    return pcm


def save(name, duration, layers, peak=.65):
    samples = mix(duration, layers, peak)
    path = OUT / (name + '.wav')
    with wave.open(str(path), 'wb') as f:
        f.setparams((2, 2, SR, 0, 'NONE', 'not compressed'))
        f.writeframes(samples.tobytes())
    print(f'{name}: {duration:.2f}s, {path.stat().st_size / 1024:.0f} KiB')


OUT.mkdir(exist_ok=True)
engine = source('engineCircular_000', 'asetrate=33075,aresample=44100,highpass=f=60,lowpass=f=1000')
texture = source('spaceEngineLow_000', 'highpass=f=45,lowpass=f=400')
latch = source('doorOpen_000', 'asetrate=35280,aresample=44100,highpass=f=70,lowpass=f=3500')
metal = source('impactPlate_heavy_000', 'asetrate=33075,aresample=44100,highpass=f=95,lowpass=f=2400')
body = source('lowFrequency_explosion_000', 'highpass=f=40,lowpass=f=160')
click = source('click_001', 'asetrate=37485,aresample=44100,highpass=f=160,lowpass=f=3500')
switch = source('switch_002', 'asetrate=35280,aresample=44100,atrim=duration=0.2,highpass=f=90,lowpass=f=1800')
whoosh = source('doorClose_000', 'areverse,highpass=f=500,lowpass=f=2300,atrim=duration=0.3')


def release(at, strength=1):
    return [
        (latch, at, .55 * strength, .005, .14, 0),
        (metal, at + .035, .25 * strength, .002, .3, -.15),
        (body, at + .025, .42 * strength, .012, .8, 0),
        (metal, at + .13, .07 * strength, .006, .4, .35),
        (latch, at + .18, .045 * strength, .02, .25, -.35),
    ]


for name, impact, charge, duration in [('unlock', 1.5, 1.38, 3.6), ('finale', 4.2, 3.08, 6.3)]:
    layers = [
        (engine[:int(charge * SR)], 0, .24, .16, .22, -.1),
        (texture[:int(charge * SR)], 0, .14, .25, .22, .1),
    ]
    # A few physical relays; no pitched confirmation notes or beeps.
    for t in [.12, charge * .48, charge * .8]:
        layers.append((switch, t, .11, .003, .08, 0))
    layers += release(impact, 1 if name == 'finale' else .8)
    save(name, duration, layers)
save('release', 1.2, release(0, .7))
save('click', .18, [(click, 0, .16, .002, .03, 0)])
save('select', .24, [(switch, 0, .16, .002, .06, 0)])
save('deny', .36, [(switch, 0, .16, .002, .06, 0), (switch, .15, .1, .002, .06, 0)])
save('transition', .32, [(whoosh, 0, .12, .03, .12, 0)])
