# Synthetic audio fixture

`tone.mp3` is an unrelated 440 Hz tone generated locally with ffmpeg, not speech or Fish/Drama 3 output. It is used for byte, transport, cache and playback tests only. It cannot qualify a scene or enter the prepared pack.

Tests named `simulatedTake`/`simulatedBank` use simulated metadata to exercise the server's approval contract in isolated memory or OS temporary folders. No test writes approvals or fixture audio into the application’s `data/prepared` directory or real manifest.
