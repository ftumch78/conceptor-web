# Conceptor (web app)

Live at **https://ftumch78.github.io/conceptor-web/**

- `index.html`: download and install page (iPhone, iPad, Android, Mac, PC)
- `app/`: the Conceptor web app (works offline once opened, can be added to the home screen)

Version 0.2. Same features as the Android app: 12 tracks with an add-track button, eight effects per track,
import audio, the "Gillian and Stephen" drum grid, mastering with a limiter, export of the mix or one track
(raw or with effects) as WAV or MP3 320k, with crop.

MP3 export uses lamejs (LGPL, see `app/LAMEJS-LICENSE.txt`), a JavaScript port of LAME (lame.sourceforge.net).
