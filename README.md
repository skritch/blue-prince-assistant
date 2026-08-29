

# Blue Prince Assistant

Visualizes the draft pool in [Blue Prince](https://www.blueprincegame.com/).

Effort has been made to reflect many of the idiosyncrasies of the game, mostly based on documentation by Reddit user [TFMurphy](https://www.reddit.com/user/TFMurphy/submitted/). 

Many rules noted in the UI as mousover tooltips.

Goal is to implement:
- [x] Track the current draft pool based on the state of the game, day, and house.
- [x] Show current room "dynamic rarities".
- [x] Account for the exact location of a draft in the house.
- [ ] Display excluded rooms along with the reason.
  - Incomplete
- [x] Sort by "effective" rarity/probability:
  - [x] Apply "conditional filters" (blessing of the king, etc.)
  - [x] Apply "weighted rooms", duct draft, library, etc.
- [x] Show the pool for each slot, depending on current gem counts
- [ ] Silver/prism keys and secret passages

At this point the tool will basically be complete.

The results will not be exactly correct, as I do not intend to fully replicate the logic of the actual game engine. It would be impossible to do so without knowing the exact order in which the house was drafted and about previous days' drafts.

Potential future features:
- Calculate probability of drawing e.g. right turn, gemless straight, etc.?
- Calculate probabilites of items, dig spots, locked doors, etc.


----

If you like this, consider [Buying Me a Coffee](https://buymeacoffee.com/skritch)!