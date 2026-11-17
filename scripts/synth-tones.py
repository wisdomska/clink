import math, struct, wave
SR = 44100

def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(name, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s / peak * 0.85)) * 32767)) for s in samples))

def silence(sec): return [0.0] * int(SR * sec)

def mallet(freq, dur, amp=1.0):
    """A soft marimba/glass mallet: fundamental + a few partials, quick attack, warm decay."""
    out = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        env = min(1.0, t / 0.004) * math.exp(-t * 5.5)
        s = (math.sin(2 * math.pi * freq * t)
             + 0.35 * math.sin(2 * math.pi * freq * 2.0 * t) * math.exp(-t * 9)
             + 0.18 * math.sin(2 * math.pi * freq * 3.98 * t) * math.exp(-t * 16)
             + 0.08 * math.sin(2 * math.pi * freq * 6.2 * t) * math.exp(-t * 24))
        out.append(s * env * amp)
    return out

def mix(base, add, at):
    start = int(SR * at)
    need = start + len(add)
    if len(base) < need: base.extend([0.0] * (need - len(base)))
    for i, s in enumerate(add): base[start + i] += s
    return base

# Ringtone: a bright, flirty two-bar phrase (E major arpeggio with a lift), then a breath.
note = {"E5": 659.25, "G#5": 830.61, "B5": 987.77, "C#6": 1108.73, "E6": 1318.51, "B4": 493.88}
phrase = [("E5",0.00),("G#5",0.16),("B5",0.32),("E6",0.48),("C#6",0.80),("B5",0.96),("G#5",1.12),("B5",1.28),
          ("E5",1.70),("G#5",1.86),("B5",2.02),("E6",2.18),("B5",2.50)]
ring = []
for n, at in phrase: mix(ring, mallet(note[n], 0.9, 0.9), at)
mix(ring, mallet(note["B4"], 1.4, 0.4), 0.0); mix(ring, mallet(note["B4"], 1.4, 0.4), 1.70)
ring.extend(silence(max(0.0, 3.6 - len(ring) / SR)))
write("ringtone.wav", ring)

# Ringback (what the caller hears): a soft double ring, 400+450 Hz, like a landline, gentle edges.
def dual(dur):
    out = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        env = min(1, t / 0.02) * min(1, (dur - t) / 0.03)
        out.append((math.sin(2*math.pi*400*t) + math.sin(2*math.pi*450*t)) * 0.5 * env)
    return out
back = dual(0.4) + silence(0.2) + dual(0.4) + silence(2.0)
write("ringback.wav", back)

# Message tone: two glassy notes, short and sweet (a little clink).
msg = []
mix(msg, mallet(1318.51, 0.6, 1.0), 0.0)
mix(msg, mallet(1975.53, 0.7, 0.8), 0.09)
write("message.wav", msg)

# Hang-up: three soft notes falling away (G#5, E5, B4), so the end of a call
# is heard as clearly as its start, without being harsh.
bye = []
mix(bye, mallet(830.61, 0.5, 0.8), 0.00)
mix(bye, mallet(659.25, 0.5, 0.7), 0.13)
mix(bye, mallet(493.88, 0.8, 0.6), 0.26)
write("hangup.wav", bye)
