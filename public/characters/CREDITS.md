# Character credits

The onboarding characters in this folder are rendered from 3D models and animations by
**Quaternius** (https://quaternius.com), released under **CC0 1.0 Universal (public domain)**:
https://creativecommons.org/publicdomain/zero/1.0/

| Pack                                           | Used for                                                                 | Link                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Universal Base Characters (Standard)           | Heads, faces, eyes, eyebrows, hairstyles                                 | https://quaternius.com/packs/universalbasecharacters.html    |
| Modular Character Outfits - Fantasy (Standard) | Male peasant shirt (flattened and recoloured as a plain top), hands, rig | https://quaternius.itch.io/modular-character-outfits-fantasy |
| Universal Animation Library (Standard)         | Idle breathing clip under every pose; hand fist pose                     | https://quaternius.itch.io/universal-animation-library       |
| Universal Animation Library 2 (Standard)       | Loaded by the script (not used in the current poses)                     | https://quaternius.itch.io/universal-animation-library-2     |

CC0 requires no attribution; we credit Quaternius anyway. Consider supporting them on
Patreon: https://www.patreon.com/quaternius

Recolours, poses, facial expressions (procedural blend shapes, eyelids, mouth interior), props (heart), lighting and rendering are ours, produced by
`scripts/render-characters.mjs`. Re-render with:

```
node scripts/render-characters.mjs --src <folder with ubc/, outfits/, ual/, ual2/>
```
