// ==UserScript==
// @name        Clickpocalypse2Clicker Beta
// @namespace   C2C
// @description Clicker Bot for Clickpocalypse2 (Beta channel — new features land here first, may be less stable)
// @include     http://minmaxia.com/c2/
// @include     https://minmaxia.com/c2/
// @version     2.6.1
// @grant       GM_setValue
// @grant       GM_getValue
// @grant		GM.setValue
// @grant		GM.getValue
// @updateURL   https://github.com/justinmiller87/Clickpocalypse2Clicker/raw/refs/heads/master/c2c.user.beta.js
// @downloadURL https://github.com/justinmiller87/Clickpocalypse2Clicker/raw/refs/heads/master/c2c.user.beta.js
// @require https://code.jquery.com/jquery-3.1.0.slim.min.js
// ==/UserScript==

// Removes eslint errors in Tampermonkey.
/* global $ */

// This saves scrolls for boss encounters.
const scrollReserve = 15;

// This will fire scrolls no matter what, if we hit this limit... (so we can pick up new scrolls).
const scrollUpperBound = 29;

// A character's skill tree tops out at 36 skills (4 columns x 9 rows), and the last one's level
// requirement is met by level 37 at the latest — so there's no point scanning for new skill
// unlocks from further level-ups past this point.
const MAX_SKILL_UNLOCK_LEVEL = 37;

// Upgrade skip list — each entry has a key (used for saved settings), a label (matched against
// the button text), an optional display name for the UI, and a default skip value.
const UPGRADE_CATEGORIES = [
  {
    name: "Stat Upgrades",
    items: [
      { key: "moreGoldDrops", label: "More Gold Drops", defaultSkip: false },
      {
        key: "moreGoodGoldDrops",
        label: "More Good Gold Drops",
        defaultSkip: false,
      },
      {
        key: "lessBadGoldDrops",
        label: "Less Bad Gold Drops",
        defaultSkip: false,
      },
      { key: "moreItemDrops", label: "More Item Drops", defaultSkip: false },
      {
        key: "moreScrollDrops",
        label: "More Scroll Drops",
        defaultSkip: false,
      },
      {
        key: "morePotionDrops",
        label: "More Potion Drops",
        defaultSkip: false,
      },
      { key: "rareItemDrops", label: "Rare Item Drops", defaultSkip: false },
      { key: "moreMonsters", label: "More Monsters", defaultSkip: false },
      {
        key: "averageMonsterCount",
        label: "Average Monster Count",
        defaultSkip: false,
      },
      { key: "itemLevelBonus", label: "Item Level Bonus", defaultSkip: false },
      {
        key: "moreTreasureChests",
        label: "More Treasure Chests",
        defaultSkip: false,
      },
    ],
  },
  {
    name: "Monster Level Upgrades",
    items: [
      {
        key: "unlockMonsterLevel",
        label: "Unlock Monster Level",
        defaultSkip: false,
      },
      {
        key: "retireMonsterLevel",
        label: "Retire Monster Level",
        defaultSkip: false,
      },
    ],
  },
  {
    name: "Unlock Monster Level — Skip by Assessment",
    items: [
      {
        key: "assessEasyMonsters",
        label: "Assessment: Easy Monsters",
        defaultSkip: false,
      },
      {
        key: "assessChallenging",
        label: "Assessment: Challenging",
        defaultSkip: false,
      },
      {
        key: "assessVeryTough",
        label: "Assessment: Very Tough!",
        defaultSkip: false,
      },
      {
        key: "assessTooHard",
        label: "Assessment: TOO HARD!",
        defaultSkip: false,
      },
    ],
  },
  {
    name: "Castle / Farm Actions",
    items: [
      { key: "attackCastle", label: "Attack Castle", defaultSkip: false },
      { key: "buyMonsterFarm", label: "Buy Monster Farm", defaultSkip: false },
      { key: "harvestRewards", label: "Harvest Rewards", defaultSkip: false },
      {
        key: "collectItemSales",
        label: "Collect Item Sales",
        defaultSkip: false,
      },
    ],
  },
  {
    name: "Character / Item Actions",
    items: [
      { key: "equipAllItems", label: "Equip All Items", defaultSkip: false },
      {
        key: "equipItem",
        label: "Equip ",
        defaultSkip: false,
        display: "Equip (individual items)",
      },
      {
        key: "levelUp",
        label: "Level Up",
        defaultSkip: false,
        display: "Level Up (characters)",
      },
    ],
  },
  {
    name: "Achievements",
    items: [{ key: "achievement", label: "Achievement", defaultSkip: false }],
  },
];

// Potion list — each entry has a key (used for saved settings) and a label (matched exactly
// against the potion name). Each potion has two independent settings: skipUse (don't auto-drink
// it) and autoDrop (discard it on sight via the in-game dropPotionButton, regardless of skipUse).
// Sourced from the game's own potion definitions (the Mq array in c2.js), listed in the same order.
const POTION_CATEGORIES = [
  {
    name: "Potion Effects",
    items: [
      { key: "potionDoubleKills", label: "Double Kills" },
      { key: "potionDoubleGoldDropValue", label: "Double Gold" },
      { key: "potionDoubleExperience", label: "Double Experience" },
      { key: "potionFastWalking", label: "Fast Walking" },
      { key: "potionFasterFarming", label: "Faster Farming" },
      { key: "potionFasterInfestation", label: "Faster Infestation" },
      { key: "potionInfiniteScrolls", label: "Infinite Scrolls" },
      { key: "potionMoreMonsters", label: "More Monsters" },
      { key: "potionGuaranteedItemDrops", label: "100% Item Drops" },
      { key: "potionPotionsLastLonger", label: "Potions Last Longer" },
      { key: "potionFreeSpellCasting", label: "Spells Cost Nothing" },
      { key: "potionMoreKillsPerFarm", label: "More Kills Per Farm" },
      { key: "potionDocileMonsters", label: "Docile Monsters" },
      { key: "potionHigherItemValues", label: "Item Gold Values" },
      { key: "potionFrailMonsters", label: "Frail Monsters" },
      { key: "potionScrollsAutoFire", label: "Scrolls Auto Fire" },
      { key: "potionDoubleGoldDrops", label: "Double Gold Drops" },
      { key: "potionDoubleItemDrops", label: "Double Item Drops" },
      { key: "potionRandomTreasureRooms", label: "Random Treasure Rooms" },
      { key: "potionRandomBossFights", label: "Random Boss Fights" },
    ],
  },
];

// In-memory cache of skip settings, loaded from GM storage on startup and updated on checkbox change.
let skipSettings = {};

// In-memory cache of potion settings ({ skipUse, autoDrop } per potion key), loaded from GM storage.
let potionSettings = {};

// In-memory cache of character skill-tree column priorities: skillPrioritySettings[charPos] is a
// 4-element array (one per skill column, 0-indexed) of priority ranks. 0 means unprioritized —
// that column is only bought as part of the default full-tree scan. A positive rank (1, 2, ...)
// makes a column claim the character's shared skill points before lower-ranked/unprioritized ones.
let skillPrioritySettings = {};

// How often (in seconds) to scan the AP upgrade tree. AP upgrades are rare/expensive, so there's
// no need to hammer the DOM every second — this is user-configurable in the settings panel.
let apUpgradeCheckIntervalSeconds = 60;

// Cached reference to the next not-yet-owned AP upgrade cell, so clickAPUpgrades doesn't need to
// re-scan the whole 22-cell tree on every check — only when the cached target gets bought.
let nextAPUpgradeCell = null;

// Character positions (0-4) whose skill trees need scanning this tick. Populated when a
// character's "Level Up" quickbar button is clicked (the only source of new skill points),
// drained after each scan. Starts full so we catch any skill points already pending at script
// startup.
let pendingSkillCheckCharPositions = new Set([0, 1, 2, 3, 4]);

function loadSkipSettings() {
  apUpgradeCheckIntervalSeconds = GM_getValue(
    "apUpgradeCheckIntervalSeconds",
    60,
  );
  for (const category of UPGRADE_CATEGORIES) {
    for (const item of category.items) {
      skipSettings[item.key] = GM_getValue(item.key, item.defaultSkip);
    }
  }
  for (const category of POTION_CATEGORIES) {
    for (const item of category.items) {
      potionSettings[item.key] = {
        skipUse: GM_getValue(`${item.key}_skipUse`, false),
        autoDrop: GM_getValue(`${item.key}_autoDrop`, false),
      };
    }
  }
  for (let charPos = 0; charPos < 5; charPos++) {
    skillPrioritySettings[charPos] = [0, 1, 2, 3].map((col) =>
      GM_getValue(`skillPriorityChar${charPos}Col${col}`, 0),
    );
  }
}

function shouldSkipUpgrade(upgradeText) {
  for (const category of UPGRADE_CATEGORIES) {
    for (const item of category.items) {
      if (skipSettings[item.key] && upgradeText.indexOf(item.label) !== -1) {
        return true;
      }
    }
  }
  return false;
}

function shouldSkipPotionUse(potionName) {
  for (const category of POTION_CATEGORIES) {
    for (const item of category.items) {
      // Exact match — some potion names are substrings of others (e.g. "Double Gold" vs.
      // "Double Gold Drops"), unlike upgrade button text which always has extra decoration.
      if (potionSettings[item.key].skipUse && potionName === item.label) {
        return true;
      }
    }
  }
  return false;
}

function shouldAutoDropPotion(potionName) {
  for (const category of POTION_CATEGORIES) {
    for (const item of category.items) {
      if (potionSettings[item.key].autoDrop && potionName === item.label) {
        return true;
      }
    }
  }
  return false;
}

// Major section headers (Purchasable Upgrades, Potions, Character Skill Priority) double as
// collapse/expand toggles for their own content. setExpanded() is registered in
// collapsibleSections so the Expand All / Collapse All buttons can drive every section at once.
const collapsibleSections = [];

// Creates a clickable, collapsible section header and returns the <div> that section's content
// should be appended into (instead of appending directly to `container`).
function appendSectionHeader(container, text) {
  const headerWrap = document.createElement("div");
  headerWrap.style.cssText =
    "margin: 14px 0 5px; cursor: pointer; user-select: none;";

  const header = document.createElement("span");
  header.style.cssText =
    "background-color: #4A4A55; color: #FFF; padding: 5px 9px; display: inline-block; font-size: 13px; font-weight: bold;";
  headerWrap.appendChild(header);
  container.appendChild(headerWrap);

  const body = document.createElement("div");
  container.appendChild(body);

  let expanded = true;
  const setExpanded = (value) => {
    expanded = value;
    body.style.display = expanded ? "" : "none";
    header.textContent = `${expanded ? "▼" : "▶"} ${text}`;
  };
  setExpanded(true);

  headerWrap.addEventListener("click", () => setExpanded(!expanded));
  collapsibleSections.push({ setExpanded });

  return body;
}

function appendExpandCollapseControls(container) {
  const row = document.createElement("div");
  row.style.cssText = "display: flex; gap: 6px; margin-bottom: 10px;";

  const makeButton = (label, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText =
      "background-color: #2B2B32; color: #FFF; border: 1px solid #4A4A55; padding: 4px 10px; cursor: pointer; font-size: 11px;";
    button.addEventListener("click", onClick);
    return button;
  };

  row.appendChild(
    makeButton("Expand All", () =>
      collapsibleSections.forEach((s) => s.setExpanded(true)),
    ),
  );
  row.appendChild(
    makeButton("Collapse All", () =>
      collapsibleSections.forEach((s) => s.setExpanded(false)),
    ),
  );

  container.appendChild(row);
}

function appendCategoryHeader(container, text) {
  const headerWrap = document.createElement("div");
  headerWrap.style.cssText = "margin: 8px 0 3px;";
  const header = document.createElement("span");
  header.style.cssText =
    "background-color: #2B2B32; color: #FFF; padding: 4px 7px; display: inline-block;";
  header.textContent = text;
  headerWrap.appendChild(header);
  container.appendChild(headerWrap);
}

function appendUpgradeRow(container, item) {
  const row = document.createElement("label");
  row.style.cssText =
    "display: flex; align-items: center; padding: 3px 5px; border: 1px solid #2B2B32; margin-bottom: 2px; cursor: pointer;";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = skipSettings[item.key];
  checkbox.style.marginRight = "6px";
  checkbox.addEventListener("change", () => {
    skipSettings[item.key] = checkbox.checked;
    GM_setValue(item.key, checkbox.checked);
  });

  const labelText = document.createElement("span");
  labelText.textContent = item.display ?? item.label.trim();

  row.appendChild(checkbox);
  row.appendChild(labelText);
  container.appendChild(row);
}

function appendPotionRow(container, item) {
  const row = document.createElement("div");
  row.style.cssText =
    "display: flex; align-items: center; padding: 3px 5px; border: 1px solid #2B2B32; margin-bottom: 2px;";

  const labelText = document.createElement("span");
  labelText.textContent = item.display ?? item.label.trim();
  labelText.style.cssText = "flex: 1;";
  row.appendChild(labelText);

  const makeToggle = (settingKey, text) => {
    const toggleLabel = document.createElement("label");
    toggleLabel.style.cssText =
      "display: flex; align-items: center; margin-left: 14px; cursor: pointer; white-space: nowrap;";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = potionSettings[item.key][settingKey];
    checkbox.style.marginRight = "4px";
    checkbox.addEventListener("change", () => {
      potionSettings[item.key][settingKey] = checkbox.checked;
      GM_setValue(`${item.key}_${settingKey}`, checkbox.checked);
    });

    const span = document.createElement("span");
    span.textContent = text;

    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(span);
    return toggleLabel;
  };

  row.appendChild(makeToggle("skipUse", "Skip Use"));
  row.appendChild(makeToggle("autoDrop", "Auto Drop"));
  container.appendChild(row);
}

function appendAPCheckIntervalControl(container) {
  const row = document.createElement("label");
  row.style.cssText =
    "display: flex; align-items: center; padding: 3px 5px; border: 1px solid #2B2B32; margin-bottom: 8px;";

  const labelText = document.createElement("span");
  labelText.textContent = "Check AP upgrades every (seconds):";
  labelText.style.cssText = "flex: 1;";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "5";
  input.step = "5";
  input.value = apUpgradeCheckIntervalSeconds;
  input.style.cssText = "width: 60px; margin-left: 6px;";
  input.addEventListener("change", () => {
    const value = Math.max(5, parseInt(input.value, 10) || 60);
    apUpgradeCheckIntervalSeconds = value;
    input.value = value;
    GM_setValue("apUpgradeCheckIntervalSeconds", value);
  });

  row.appendChild(labelText);
  row.appendChild(input);
  container.appendChild(row);
}

// <span> elements from appendSkillPriorityRow, indexed by charPos, so refreshSkillPriorityLabels
// can update their text with the live character name/class without rebuilding the settings panel.
const skillPriorityLabels = [];

function appendSkillPriorityRow(container, charPos) {
  const row = document.createElement("div");
  row.style.cssText =
    "display: flex; align-items: center; padding: 3px 5px; border: 1px solid #2B2B32; margin-bottom: 2px;";

  const label = document.createElement("span");
  label.textContent = `Character ${charPos + 1}:`;
  label.style.cssText = "flex: 1;";
  skillPriorityLabels[charPos] = label;
  row.appendChild(label);

  for (let col = 0; col < 4; col++) {
    const colLabel = document.createElement("label");
    colLabel.style.cssText =
      "display: flex; align-items: center; margin-left: 10px; white-space: nowrap;";

    const colText = document.createElement("span");
    colText.textContent = `Col ${col + 1}:`;
    colText.style.marginRight = "3px";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "4";
    input.step = "1";
    input.value = skillPrioritySettings[charPos][col];
    input.style.width = "36px";
    input.addEventListener("change", () => {
      const value = Math.max(0, parseInt(input.value, 10) || 0);
      skillPrioritySettings[charPos][col] = value;
      input.value = value;
      GM_setValue(`skillPriorityChar${charPos}Col${col}`, value);
    });

    colLabel.appendChild(colText);
    colLabel.appendChild(input);
    row.appendChild(colLabel);
  }

  container.appendChild(row);
}

// The settings panel is built once at startup, before character names/classes may be loaded, and
// is only ever shown/hidden afterward rather than rebuilt — so labels are refreshed here instead,
// each time the panel is opened, to reflect whatever's currently live in the game.
function refreshSkillPriorityLabels() {
  for (let charPos = 0; charPos < skillPriorityLabels.length; charPos++) {
    const label = skillPriorityLabels[charPos];
    if (!label) continue;
    const name = getCharacterNameByPos(charPos);
    const characterClass = getCharacterClassByPos(charPos);
    label.textContent = name
      ? `${name}${characterClass ? ` (${characterClass})` : ""}:`
      : `Character ${charPos + 1}:`;
  }
}

function buildSettingsContent(container) {
  appendExpandCollapseControls(container);

  const quickUpgradesBody = appendSectionHeader(
    container,
    "Purchasable Upgrades",
  );

  const intro = document.createElement("div");
  intro.style.cssText =
    "padding: 5px; margin-bottom: 8px; border: 1px solid #2B2B32; color: #AAA; font-size: 11px;";
  intro.textContent =
    "Checked upgrades will NOT be auto-clicked. Settings are saved automatically.";
  quickUpgradesBody.appendChild(intro);

  for (const category of UPGRADE_CATEGORIES) {
    appendCategoryHeader(quickUpgradesBody, category.name);
    for (const item of category.items) {
      appendUpgradeRow(quickUpgradesBody, item);
    }
  }

  const potionsBody = appendSectionHeader(container, "Potions");

  const potionIntro = document.createElement("div");
  potionIntro.style.cssText =
    "padding: 5px; margin-bottom: 8px; border: 1px solid #2B2B32; color: #AAA; font-size: 11px;";
  potionIntro.textContent =
    '"Skip Use" leaves the potion alone instead of auto-drinking it. "Auto Drop" discards the potion on sight using the in-game X button, and takes priority over Skip Use.';
  potionsBody.appendChild(potionIntro);

  for (const category of POTION_CATEGORIES) {
    appendCategoryHeader(potionsBody, category.name);
    for (const item of category.items) {
      appendPotionRow(potionsBody, item);
    }
  }

  const skillPriorityBody = appendSectionHeader(
    container,
    "Character Skill Priority",
  );

  const skillIntro = document.createElement("div");
  skillIntro.style.cssText =
    "padding: 5px; margin-bottom: 8px; border: 1px solid #2B2B32; color: #AAA; font-size: 11px;";
  skillIntro.textContent =
    "Each character's skill tree has 4 independent columns that each unlock top-to-bottom on their own pace, sharing one pool of skill points. Give a column priority 1, 2, 3... to have it claim the character's skill points before other columns. Leave a column at 0 to keep the default behavior (bought as part of the normal full-tree scan, in column order).";
  skillPriorityBody.appendChild(skillIntro);

  for (let charPos = 0; charPos < 5; charPos++) {
    appendSkillPriorityRow(skillPriorityBody, charPos);
  }

  appendAPCheckIntervalControl(container);
}

function addBotTab() {
  const tabMenu = document.getElementById("gameTabMenu");
  // .mainTabContainer is the sibling of #gameTabMenu that holds all tab content divs.
  const mainTabContainer = document.querySelector(".mainTabContainer");

  if (!tabMenu || !mainTabContainer) {
    setTimeout(addBotTab, 500);
    return;
  }

  const ul = tabMenu.querySelector("ul");
  if (!ul) {
    setTimeout(addBotTab, 500);
    return;
  }

  // Insert our panel as a proper sibling of the game's other .tabContainer divs.
  // position: absolute + all-zero insets fills the same bounds as every other tab.
  const settingsPanel = document.createElement("div");
  settingsPanel.id = "c2c-settings";
  settingsPanel.style.cssText = `
		display: none;
		position: absolute;
		left: 0; right: 0; top: 0; bottom: 0;
		overflow-y: auto;
		background-color: #0B0B12;
		z-index: 200;
		font-family: Arial, Gadget, sans-serif;
		font-size: 12px;
		color: #FFF;
		padding: 8px;
		box-sizing: border-box;
	`;

  buildSettingsContent(settingsPanel);
  mainTabContainer.appendChild(settingsPanel);

  // Create the Script Options tab.
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.textContent = "Script Options";
  a.href = "#";

  a.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = settingsPanel.style.display !== "none";
    if (!isOpen) refreshSkillPriorityLabels();
    settingsPanel.style.display = isOpen ? "none" : "block";
    li.className = isOpen ? "" : "selectedTab";
    const dungeonNotif = document.querySelector(".dungeonNotificationDiv");
    if (dungeonNotif) dungeonNotif.style.display = isOpen ? "" : "none";
    return false;
  });

  // Close our panel whenever any game tab is clicked.
  ul.querySelectorAll("a").forEach((existingA) => {
    existingA.addEventListener("click", () => {
      settingsPanel.style.display = "none";
      li.className = "";
      const dungeonNotif = document.querySelector(".dungeonNotificationDiv");
      if (dungeonNotif) dungeonNotif.style.removeProperty("display");
    });
  });

  li.appendChild(a);
  ul.appendChild(li);
}

function checkDifficultEncounter() {
  const pos = ["A", "B", "C", "E", "E", "F"];
  for (const letter of pos) {
    for (let char = 0; char < 5; char++) {
      const selector = $(`#adventurerEffectIcon${letter}${char}`);
      if (
        selector.attr("title") === "Stunned" &&
        selector.css("display") !== "none"
      ) {
        return true;
      }
    }
  }
  return false;
}

function lootChests() {
  clickSelector(
    $("#treasureChestLootButtonPanel").find(".gameTabLootButtonPanel"),
  );
  clickSelector($("#treasureChestLootButtonPanel").find(".lootButton"));
}

// Finds the next AP upgrade cell that isn't owned yet. Upgrade cells are 'ownedUpgradeButton'
// once purchased, 'disabledUpgradeButton' while too expensive to afford, and plain
// 'upgradeButton' once affordable — so we don't need to read AP totals or costs at all, just
// walk forward until we find one that isn't owned.
function findNextAPUpgradeCell() {
  for (let row = 0; row < 12; row++) {
    if (row === 3) continue; // skip 'Offline Time Bonus' upgrade
    for (let col = 0; col < 2; col++) {
      const cell = $(`#pointUpgradesContainer_${row}_${col}_${row}`);
      if (cell.length && !cell.hasClass("ownedUpgradeButton")) {
        return cell;
      }
    }
  }
  return null;
}

function clickAPUpgrades() {
  if (
    !nextAPUpgradeCell ||
    !nextAPUpgradeCell.length ||
    nextAPUpgradeCell.hasClass("ownedUpgradeButton")
  ) {
    nextAPUpgradeCell = findNextAPUpgradeCell();
  }
  if (!nextAPUpgradeCell) return;

  // Not disabled means it's either affordable now or the repeatable Offline Time Bonus slot —
  // go ahead and click it, then immediately look up the next target for the following check.
  if (!nextAPUpgradeCell.hasClass("disabledUpgradeButton")) {
    clickSelector(nextAPUpgradeCell);
    nextAPUpgradeCell = findNextAPUpgradeCell();
  }
}

// A "Level Up" quickbar button's second row shows the level the character will reach after
// this upgrade (e.g. "Level 34"). Reading that lets us keep characters level with each other
// without needing to cross-reference the separate character info panel.
function getLevelUpTargetLevel(upgradeBtn) {
  const levelText = upgradeBtn.find("tr").eq(1).find("td span").eq(0).text();
  const match = levelText.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

// A "Level Up" quickbar button's first row names the character (e.g. "Level Up Hugo").
function getLevelUpCharacterName(upgradeBtn) {
  const text = upgradeBtn
    .find("tr")
    .eq(0)
    .find("td")
    .eq(1)
    .find("span")
    .eq(0)
    .text();
  return text.replace(/^Level Up /, "").trim();
}

function getCharacterNameByPos(charPos) {
  return $(`#gameTabAdventurerInfo${charPos}`).find("td").eq(1).text().trim();
}

// The adventurer info panel's "Lvl 9 Fighter" cell combines level and class in one string.
function getCharacterClassByPos(charPos) {
  const text = $(`#adventurerLevelClass${charPos}`).text().trim();
  return text.replace(/^Lvl\s*\d+\s*/, "").trim();
}

function findCharPosByName(name) {
  for (let charPos = 0; charPos < 5; charPos++) {
    if (getCharacterNameByPos(charPos) === name) return charPos;
  }
  return null;
}

function clickQuickBarUpgrades() {
  // Find the lowest target level among all AFFORDABLE character level-ups, so we level everyone
  // to N before anyone moves to N+1, rather than favoring whichever character's button happens
  // to land at a given quickbar index. Buttons the character can't afford yet (disabled) are
  // excluded from this — otherwise one lagging, currently-broke character would freeze leveling
  // for the entire party until they alone caught up.
  let minTargetLevel = Infinity;
  for (let i = 43; i >= 0; i--) {
    const upgradeBtn = $(`#upgradeButtonContainer_${i}`);
    if (upgradeBtn.text().indexOf("Level Up") === -1) continue;
    if (upgradeBtn.hasClass("disabledUpgradeButton")) continue;
    const targetLevel = getLevelUpTargetLevel(upgradeBtn);
    if (targetLevel !== null && targetLevel < minTargetLevel)
      minTargetLevel = targetLevel;
  }

  for (let i = 43; i >= 0; i--) {
    const upgradeBtn = $(`#upgradeButtonContainer_${i}`);
    const upgradeText = upgradeBtn.text();
    if (shouldSkipUpgrade(upgradeText)) continue;

    if (upgradeText.indexOf("Level Up") !== -1) {
      if (getLevelUpTargetLevel(upgradeBtn) !== minTargetLevel) continue;

      // Leveling up is the main source of new character skill points — mark this character
      // for a skill-tree scan instead of scanning every character's tree every tick. Past
      // MAX_SKILL_UNLOCK_LEVEL, no further level-up can unlock a new skill, so skip it.
      if (minTargetLevel <= MAX_SKILL_UNLOCK_LEVEL) {
        const charPos = findCharPosByName(getLevelUpCharacterName(upgradeBtn));
        if (charPos !== null) pendingSkillCheckCharPositions.add(charPos);
      }
    }

    clickIt(`#upgradeButtonContainer_${i}`);
  }
}

// Returns this character's skill-tree columns (0-3) that have a priority rank set (> 0), ordered
// highest priority (lowest rank number) first. Each column is an independent, top-to-bottom skill
// sequence — see c2.js's Zz.prototype.aa, which builds each of the 4 columns from its own separate
// array — so "prioritize a column" just means "let it claim shared skill points before the rest."
function getPrioritizedSkillColumns(charPos) {
  const priorities = skillPrioritySettings[charPos] || [0, 0, 0, 0];
  return [0, 1, 2, 3]
    .filter((col) => priorities[col] > 0)
    .sort((a, b) => priorities[a] - priorities[b]);
}

function clickCharacterSkills() {
  if (pendingSkillCheckCharPositions.size === 0) return;

  for (const charPos of pendingSkillCheckCharPositions) {
    // Give prioritized columns first claim on the character's shared skill points, in the
    // user-configured order, before the default full-tree scan below. Clicking an already-owned
    // or not-yet-affordable cell is a harmless no-op, so re-scanning everything afterward is safe
    // — and when nothing is prioritized, this loop runs zero times and behavior is unchanged.
    for (const priorityCol of getPrioritizedSkillColumns(charPos)) {
      for (let position = 0; position < 9; position++) {
        clickIt(
          `#characterSkillsContainer${charPos}_${position}_${priorityCol}_${position}`,
        );
      }
    }

    for (let col = 0; col < 9; col++) {
      for (let row = 0; row < 4; row++) {
        // There is an ending col on all, not sure why yet
        clickIt(`#characterSkillsContainer${charPos}_${col}_${row}_${col}`);
      }
    }
  }
  pendingSkillCheckCharPositions.clear();
}

function handlePotions(isBossEncounter, isEncounter) {
  let isPotionActive_ScrollsAutoFire = false;
  let isPotionActive_InfiniteScrolls = false;
  let potionCount = 0;

  // First pass: gather potion state before taking any actions
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const potionSelector = $(`#potionButton_Row${row}_Col${col}`).find(
        ".potionContentContainer",
      );
      const potionName = potionSelector.find("td").eq(1).text();
      const potionActive =
        potionSelector.find(".potionButtonActive").length > 0;

      if (potionName.length === 0) continue;
      potionCount++;

      if (potionName === "Scrolls Auto Fire")
        isPotionActive_ScrollsAutoFire = potionActive;
      if (potionName === "Infinite Scrolls")
        isPotionActive_InfiniteScrolls = potionActive;
    }
  }

  // Second pass: click potions
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const potionSelector = $(`#potionButton_Row${row}_Col${col}`).find(
        ".potionContentContainer",
      );
      const potionName = potionSelector.find("td").eq(1).text();
      const potionActive =
        potionSelector.find(".potionButtonActive").length > 0;

      if (potionName.length === 0) continue;

      // Auto Drop takes priority over everything else, including potions currently active/in use.
      if (shouldAutoDropPotion(potionName)) {
        clickSelector(potionSelector.find(".dropPotionButton"));
        continue;
      }

      if (potionActive || shouldSkipPotionUse(potionName)) continue;

      // We don't want to use AutoFire and InfiniteScrolls together, since they have similar functions.
      if (potionName === "Infinite Scrolls" && isPotionActive_ScrollsAutoFire)
        continue;
      if (potionName === "Scrolls Auto Fire" && isPotionActive_InfiniteScrolls)
        continue;

      // Always click farm bonus or fast walking potions as soon as we get them, since they are useful anywhere.
      if (
        potionName === "Faster Infestation" ||
        potionName === "More Kills Per Farm" ||
        potionName === "Faster Farming" ||
        potionName === "Fast Walking"
      ) {
        clickSelector(potionSelector);
        continue;
      }

      // Only click these if we are in battle, no need to chug potions if we are walking around peaceful overworld.
      if (isBossEncounter || isEncounter) {
        if (potionName === "Infinite Scrolls")
          isPotionActive_InfiniteScrolls = true;
        if (potionName === "Scrolls Auto Fire")
          isPotionActive_ScrollsAutoFire = true;

        if (potionName === "Potions Last Longer") {
          if (
            potionCount < 6 &&
            !(isPotionActive_InfiniteScrolls || isPotionActive_ScrollsAutoFire)
          )
            continue;
        }

        if (
          (potionName === "Random Treasure Rooms" ||
            potionName === "Double Item Drops" ||
            potionName === "Double Gold Drops") &&
          (isPotionActive_InfiniteScrolls || isPotionActive_ScrollsAutoFire)
        )
          continue;

        clickSelector(potionSelector);
      }
    }
  }

  return { isPotionActive_ScrollsAutoFire, isPotionActive_InfiniteScrolls };
}

function clickScrolls(
  isBossEncounter,
  isDifficultEncounter,
  isPotionActive_ScrollsAutoFire,
  isPotionActive_InfiniteScrolls,
) {
  for (let i = 0; i < 6; i++) {
    const scrollCell = $(`#scrollButtonCell${i}`);
    const scrollButton = scrollCell.find(".scrollButton");
    const scrollAmount = scrollCell.find("tr").eq(1).text().replace("x", "");

    if (!scrollAmount.length) continue;

    // Hitting limit, fire scrolls so we can pick up new ones.
    if (scrollAmount > scrollUpperBound) {
      clickSelector(scrollButton);
      continue;
    }

    // Spam spells if Infinite Scrolls potion is active.
    if (scrollAmount === "Infinite" || isPotionActive_InfiniteScrolls) {
      // 4 times per second
      clickSelector(scrollButton);
      setTimeout(clickSelector, 250, scrollButton);
      setTimeout(clickSelector, 500, scrollButton);
      setTimeout(clickSelector, 750, scrollButton);
      continue;
    }

    // Fire 0 scrolls if Autofire is active... it fires them for free, so let's not waste ours.
    // unless boss encounter, we still want to double up on the big guys...
    if (
      isPotionActive_ScrollsAutoFire &&
      !isBossEncounter &&
      !isDifficultEncounter
    )
      continue;

    // 1 === spider web scroll. Always fire at normal encounters.
    // Boss are immune to spider web, so won't fire them.
    if (i === 1 && !isBossEncounter) {
      clickSelector(scrollButton);
    }

    if (i !== 1) {
      // Keep scrolls in reserve if generic encounter so we have them for boss.
      // No limit if this is a boss encounter.
      if (
        scrollAmount > scrollReserve ||
        isBossEncounter ||
        isDifficultEncounter
      ) {
        clickSelector(scrollButton);
      }
    }
  }
}

// AP upgrades are rare/expensive, so they get their own slower, user-configurable timer instead
// of running on the main 1-second loop. Self-rescheduling so a settings change takes effect on
// the very next check rather than requiring a page reload.
function scheduleAPUpgradeCheck() {
  clickAPUpgrades();
  setTimeout(
    scheduleAPUpgradeCheck,
    Math.max(5, apUpgradeCheckIntervalSeconds) * 1000,
  );
}

$(() => {
  console.log(`Starting Clickpocalypse2Clicker: ${GM_info.script.version}`);
  loadSkipSettings();
  addBotTab();
  scheduleAPUpgradeCheck();

  setInterval(() => {
    const isBossEncounter = $(".bossEncounterNotificationDiv").length > 0;
    const isEncounter =
      $("#encounterNotificationPanel").css("display") !== "none";
    const isDifficultEncounter = checkDifficultEncounter();

    lootChests();
    clickQuickBarUpgrades();
    clickCharacterSkills();

    const { isPotionActive_ScrollsAutoFire, isPotionActive_InfiniteScrolls } =
      handlePotions(isBossEncounter, isEncounter);
    clickScrolls(
      isBossEncounter,
      isDifficultEncounter,
      isPotionActive_ScrollsAutoFire,
      isPotionActive_InfiniteScrolls,
    );
  }, 1000);
});

/*** Click by div id ***/
function clickIt(divName) {
  const div = $(divName);
  if (!div.length) return;
  div.mouseup(); // They use mouse up instead of click()
}

/*** Click by Selector ***/
function clickSelector($selector) {
  $selector.mouseup();
}
