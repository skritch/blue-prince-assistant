Let's sketch an implementation for a "Blue Prince" drafting assistant. I'd like to build something usable in just a few hours. Mostly I am looking 


Basic idea is:
* given all the drafting mechanics in the game... 
* .... as summarized in various TFMurphy threads on reddit, for one...
* ... exactly what are the odds of hitting rooms in a certain draft?
* we might not be able to get exact %s, but it would be useful to at least present the list by gem cost/rarity/dynamic rarity.
* an initial implementation can have the user manually input their directory, current day, and buffs.
* we'll want to use artwork from the game.
* also should just track "the pool", independent of any particular location in the house.
* should be useful for bingo games / speed runs in particular. Probably it would be unethical to use this in a live competition, but it would be helpful to train intuition.



Architecture:
* All typescript. Client-side only.
* Maybe one-page-app, or just a few routes.


Inspo: 
* https://sekti.github.io/blue-paths/#Start progress tracker. Like this, we should be careful to obscure spoilers, or enable "reveal all" for speedrunners.


pre-impl todos:
* acquire asset pack for in-game art.
* collect all the relevant rules from internet.

later features / maybes:
* Snapshot current house and parse out state. Same for directory.
* Any kind of "live tracking as you play". Almost certainly would not plug into the game engine.
* Data collection on actual %s to catch anomalies/mistakes.
* Calculate joint probability of hitting multiple goals
* localstorage save/load features.
* serialize and share state.
* items calculator


deployment:
* implement in a git repo that can stand alone
* host on a subdomain of my personal site (tbd to figure out how to do this, I can't even remember where I deployed it.)

