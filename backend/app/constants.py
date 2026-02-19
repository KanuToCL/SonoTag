# Default prompts for audio classification
DEFAULT_PROMPTS = [
    "speech",
    "music",
    "applause",
    "silence",
    "car horn",
    "engine running",
    "dog barking",
    "glass breaking",
    "gunshot",
    "siren",
]

SAMPLE_RATE = 48000  # FLAM requires 48kHz
MAX_DURATION_SECONDS = 10  # Max audio duration per request
EXPECTED_SAMPLES = (
    SAMPLE_RATE * MAX_DURATION_SECONDS
)  # 480,000 samples - FLAM expects exactly this

# Loudness Relabel postprocessing parameters (Paper Section C.4)
# Frame rate for postprocessing: 50Hz (hop size 1200 at 48kHz)
POSTPROCESS_FRAME_RATE = 50.0  # Hz
MIN_GAP_FRAMES = 10  # 200ms - short gaps to fill between positive segments
MIN_SPIKE_FRAMES = 2  # 40ms - short spikes to remove in long events
MIN_EVENT_FRAMES = 10  # 200ms - minimum event length to apply spike removal
