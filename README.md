

# Blue Prince Assistant

Visualizes the draft pool in [Blue Prince](https://www.blueprincegame.com/).

Effort has been made to reflect many of the idiosyncrasies of the game, mostly based on documentation by Reddit user [TFMurphy](https://www.reddit.com/user/TFMurphy/submitted/). Many are noted in the UI as mousover tooltips.

This is a work in progress.
- [x] Track the current draft pool based on the state of the game, day, and house.
- [x] Show current room "dynamic rarities".
- [x] Account for the exact location of a draft in the house.
- [ ] Display excluded rooms along with the reason.
- [ ] Sort by "effective" rarity/probability:
  - [ ] Apply "conditional filters" (blessing of the king, etc.)
  - [ ] Apply "weighted rooms", duct draft, library, etc.

At this point the tool will basically be complete.

The results will not be exactly correct, as I do not intend to fully replicate the logic of the actual game engine. It would be impossible to do so without knowing the exact order in which the house was drafted, and lots of details of the house history, which would be infeasible to ingest.

Maybe we can go on to simulate a 3-room draft to some degree:
  - Show the pool for each slot, depending on current gem counts
  - Determine chance of a room appearing in a 3-room draft?
  - Calculate probability of drawing e.g. right turn, gemless straight, etc.?
