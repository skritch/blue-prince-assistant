

# Blue Prince Assistant

Visualizes the draft pool in [Blue Prince](https://www.blueprincegame.com/).

Effort has been made to reflect many of the idiosyncrasies of the game, as documented by Reddit user [TFMurphy](https://www.reddit.com/user/TFMurphy/submitted/). Many are noted in the UI as mousover tooltips. I discovered a lot of mechanics while making this.

This is a work in progress. Current TODO list is:
- [x] Track the current draft pool based on the state of the game, day, and house.
- [x] Show current room "dynamic rarities".
- [ ] Apply "conditional filters" (blessing of the king, etc.) accurately, and display an "effective" rarity in some manner.
- [ ] Account for the exact location of a draft in the house.
- [ ] Show the pool for each slot of a 3-room draft, depending on current gem counts.
- [ ] Determine actual odds of a room appearing in a 3-room draft
- [ ] (Maybe?) Calculate probability of drawing e.g. right turn, gemless straight, etc.

The results will not be exactly correct, as I do not intend to fully replicate the logic of the actual game engine, and could not do so without knowing the exact order in which the house was drafted. (E.g. schoolhouse classrooms are added to the pool over time.) But hopefully this tool will be helpful for something.