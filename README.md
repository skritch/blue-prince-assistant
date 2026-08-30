

# Blue Prince Assistant

Visualizes the draft pool in [Blue Prince](https://www.blueprincegame.com/).

Effort has been made to reflect many of the idiosyncrasies of the game, mostly based on documentation by Reddit user [TFMurphy](https://www.reddit.com/user/TFMurphy/submitted/). 
Many obscure rules are noted in the UI as mousover tooltips, so this might provide a good way to learn the mechanics.

The results will not be exactly correct, as I do not replicate the logic of the game engine. Instead I track probabilities through a few stages of the draft process.


The following features are implemented 
- [x] Track the current draft pool based on the state of the game, day, and house.
- [x] Show current room "dynamic rarities".
- [x] Filter for the exact location of a draft in the house.
- [x] Sort by "effective" rarity/probability
- [x] Apply "conditional filters" (blessing of the king, etc.)
- [x] Apply "weighted rooms", duct draft, library, etc.
- [x] Show the pool for each slot


I'd like to add the following:
- [ ] Silver/prism keys and secret passages
- [ ] Display some information as to why a room gets the probability it does
  - Incomplete

The following I am not currently planning to implement:
- The "validation" stage of drafting, which removes duplicates, 3x dead ends, etc.
- Draw 3, which is mostly relevant when the draw pool is very depleted
- Idiosyncrasies of duplicated rooms, e.g. classrooms, chamber of mirrors
- Probability of drawing e.g. right turn, gemless straight, etc.
- Probabilites of items, dig spots, locked doors, etc.
- A full map of the house to track drafted rooms
- Tracking of the exact order of rooms drafted



----

If you like this tool, consider [Buying Me a Coffee](https://buymeacoffee.com/skritch)!

Issues are welcome. 

PRs are welcome if they checked and tested carefully by a competent human. I vibe-coded the front-end of this app, but the game logic is largely hand-written; AIs are bad that kind of thing.