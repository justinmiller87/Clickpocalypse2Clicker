# Clickpocalypse2Clicker

Greasemonkey/Tampermonkey clickbot for Clickpocalypse II

This is a Tampermonkey script for automating clicks in [Clickpocalypse II](http://minmaxia.com/c2/). It simulates "legitimate" clicks and doesn't modify any internal game data or use "cheat" codes. It was forked from [Dimecoin's](https://github.com/dimecoin/Clickpocalypse2Clicker) original script and updated to modernize the scripting, cut down on complexity, and add new features.

# Install

Requires [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) for Firefox or [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) for Chrome.

Download c2c.user.js and install as a user script.

### Beta channel

New features land first in `c2c.user.beta.js` before being promoted to the stable `c2c.user.js`. Install it instead if you want early access and don't mind the occasional rough edge — it installs as a separate script (own name, own update URL), so it runs side by side with the stable version without conflicting or sharing saved settings.

# Strategies

### Loot

- Always loots Chests, Bookcases and Weapon Racks when first entering a room.

### Quick bar

- Clicks all quickbar upgrades in reverse order (i.e., buys the most expensive items first, under the assumption they are the better upgrade).
- You can control which upgrades get auto-clicked from the **Script Options** tab added to the game's tab bar (next to Game, Priest, Ranger, etc.). Click the checkbox next to an upgrade to skip it; your choices are saved automatically and survive script updates. By default, none are skipped, so the game will click all upgrades

  The following upgrades can be toggled:

  **Stat upgrades:**
  `More Gold Drops`, `More Good Gold Drops`, `Less Bad Gold Drops`, `More Item Drops`, `More Scroll Drops`, `More Potion Drops`, `Rare Item Drops`, `More Monsters`, `Average Monster Count`, `Item Level Bonus`, `More Treasure Chests`

  **Monster level upgrades** (dynamic — level number is appended at runtime):
  `Unlock Monster Level`, `Retire Monster Level`

  **Castle/farm actions:**
  `Attack Castle`, `Buy Monster Farm`, `Harvest Rewards`, `Collect Item Sales`

  **Character/item actions:**
  `Equip All Items`, `Equip ` _(partial match — also catches individual item equips)_, `Level Up` _(partial match — character name is appended at runtime)_

  **Achievements:**
  `Achievement`

### Character Levels/Skills

- Characters are leveled up evenly
  - On each pass, only the character(s) currently at the lowest level are leveled up, so the whole party advances level-by-level together instead of one character racing ahead.
  - It will also select the first available skill upgrade in order.
  - This is the only exception to buying upgrades from the bottom to the top. Previously, it would upgrade the lowest in the list character until it couldn't any longer before moving up the list. Because the logic said that the lowest possible option was the best option, you could potentially have your last character be several levels higher than the other party members after returning from an idle session.
- _(Beta only — see `c2c.user.beta.js`)_ Each character's skill tree has 4 independent columns that each unlock top-to-bottom on their own pace, sharing one pool of skill points. By default, whatever's available gets bought in column order. The "Character Skill Priority" section in Script Options lets you rank a character's columns (1 = highest priority, 2, 3...) so a ranked column claims that character's skill points before others; a column left at 0 just falls back to the default order of left to right, top to bottom.

### Potions

- Farm potions ('Faster Infestation', 'Faster Farming', and 'More Kills Per Farm') and 'Fast Walking' will be used as soon as they are obtained since they are beneficial outside of combat.
- Scrolls potions ('Scrolls Auto Fire' and 'Infinite Scrolls') will not be used together. Only one will be active at any given time since their functions overlap.
- Treasure Potions ('Random Treasure Room', 'Double Gold Drops' and 'Double Item Drops') aren't used if Scroll potions ('Scrolls Auto Fire' and 'Infinite Scrolls') are active (since it slows party down to much).
- All non-farm potions will only be used during encounters. This is so they aren't "wasted" while walking around in the peaceful overworld.
- 'Potions Last Longer' is only used when you have 6 or more potions in inventory or if either Scroll Potion is active ('Scrolls Auto Fire' and 'Infinite Scrolls').
- Added option to turn off the automatic use of a potion or remove the potion from the list altogether without enabling it. This can be useful if you are trying to speedrun through and you don't want more monsters or random boss fights, or for whatever reason you may find.

### Scrolls

- If the 'Infinite Scrolls' potion is active, then all scroll types will be used 4/second on all encounters.
- If the 'Scrolls Auto Fire' potion is active, no scrolls will be used for normal encounters, since the potion gives free use. Will still use non-free scrolls during boss or difficult encounters.
- 'Spider Web' scrolls will be liberally (till none are left) on normal encounters and not fired during boss encounters (bosses are immune).
- All other scrolls will be fired at normal encounters, until only 15 are left. This "reserve" quantity will be saved for boss encounters or "difficult encounters" (if one or more characters are stunned during the fight).
- Scrolls will be used if the quantity is greater than 29 (to make room to pick up more).

### Points Upgrade

- It will upgrade all AP Point Upgrades as they are available. The exception being 'Offline Time Bonus', it will never be clicked. (player can do manually if they wish).

### Game end/reset

- No logic, will not click anything if you beat the game.

# Todos

- Character skill upgrade logic could be tweaked to maximize certain skills first.
- Smarter use of Spider Web scroll (don't spam if all enemies are already stuck).
- Reserve quantity of scrolls could be done in total, instead of per scroll type.
- Potion 'Spells Cost Nothing' should be sold if no mage is in the party? Not sure if useful for fighters.
- 'Fire Rain' and 'Spider Web' should have a delay in casting.

# Updates

### 2.6.0-beta1 (`c2c.user.beta.js`)

- Added character skill column priority. Each character's skill tree has 4 independent columns that each unlock top-to-bottom on their own pace, sharing one pool of skill points. A new "Character Skill Priority" section in Script Options lets you rank a character's columns (1 = highest priority, 2, 3...) so a ranked column claims that character's skill points before others; leave a column at 0 (the default) to keep the existing behavior of just buying whatever's available in order of left to right, top to bottom.
- Not yet promoted to the stable release — try it via the beta channel (see Install above) first.

### 2.5.1

- Fixed a bug where the "level up evenly" logic could stall leveling for the entire party. The lowest-level character's Level Up button was used to set the target for everyone, even while that button was still disabled (character couldn't yet afford it) — which blocked every other character's already-affordable level-up until the lagging one caught up. Now only affordable Level Up buttons are considered when picking the target level.

### 2.5.0

- Cleaned up the code to reduce CPU usage and memory.
  - Before, it was checking every second to see if an AP point could be bought and checking every single one, performing queries 24 times per second, regardless of if it was purchased or not. This has been changed by default to checking every 60 seconds only if the next upgrade can be purchased. This change drops to a single query once every 60 seconds. The default time between checks can be changed in the 'Script Options' menu.
  - The script was additionally checking each and every skill slot on all characters every second to see if an upgrade was available to purchase, for a total of 180 queries per second. This was changed so that it will only check a character after it levels up.
  - Quick bar upgrades remain as-is, as the numbers change dynamically enough that checking if there are upgrades to purchase once per second makes sense. For the nerds, this is happening 88 times per second.

### 2.4.5

- Updated to take into account TamperMonkey and GreaseMonkey global objects

### 2.4.0

- Fixed leveling logic so all characters level up evenly after an idle session.

### 2.3.0

- Added option to manually select or dismiss a potion entirely

### 2.2.1

- Replaced the skip list (commented code) with persistent per-upgrade checkboxes backed by Tampermonkey's `GM_setValue`/`GM_getValue`. Settings survive script updates.
- Added a **Script Options** tab to the game's existing tab bar. Clicking it opens the skip-upgrade settings panel overlaid on the right-side upgrade area; clicking another tab hides it.

### 2.0.0

- Script modernized: `var` → `const`/`let`, arrow functions, template literals, strict equality, explicit `parseInt` radix.
- Logic extracted into named functions (`checkDifficultEncounter`, `lootChests`, `clickAPUpgrades`, `clickQuickBarUpgrades`, `clickCharacterSkills`, `handlePotions`, `clickScrolls`) to reduce complexity and improve readability.
- `checkDifficultEncounter` now exits as soon as a stunned character is found rather than continuing to search.
- Fixed typo: `isPotionActive_InfinteScrolls` → `isPotionActive_InfiniteScrolls`.
- Removed unused `totalScrolls` variable.
- Added upgrade skip list — individual quickbar upgrades can be excluded from auto-clicking by editing a commented list in the script.

## Dimecoin's original changes are below:

### 1.0.8

- 'Faster Farming' is used as soon as it's obtained (since it's useful outside of combat).
- Treasure Potions ('Random Treasure Room', 'Double Gold Drops' and 'Double Item Drops') aren't used if Scroll potions ('Scrolls Auto Fire' and 'Infinite Scrolls') are active (since it slows party down to much).

### 1.0.7

- fixed bug with detecting if an encounter is difficult.
- Better strategy for 'Potions Last Longer'

### 1.0.6

- Fixed bug with 'Infinite Scroll' spam.
- Fixed bug were 'Infinite Scroll' and 'Auto Fire' won't be correctly used if both were in inventory
- Added strategy for 'Potions Last Longer'.
- Add AP Point Upgrade strategy.
- Added strategy for "difficult encounters"
