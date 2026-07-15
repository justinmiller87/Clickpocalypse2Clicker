// ==UserScript==
// @name        Clickpocalypse2Clicker
// @namespace   C2C
// @description Clicker Bot for Clickpocalypse2
// @include     http://minmaxia.com/c2/
// @include     https://minmaxia.com/c2/
// @version     2.4.5
// @grant       GM_setValue
// @grant       GM_getValue
// @grant		GM.setValue
// @grant		GM.getValue
// @updateURL   https://github.com/justinmiller87/Clickpocalypse2Clicker/raw/refs/heads/master/c2c.user.js
// @downloadURL https://github.com/justinmiller87/Clickpocalypse2Clicker/raw/refs/heads/master/c2c.user.js
// @require https://code.jquery.com/jquery-3.1.0.slim.min.js
// ==/UserScript==

// Removes eslint errors in Tampermonkey.
/* global $ */

// This saves scrolls for boss encounters.
const scrollReserve = 15;

// This will fire scrolls no matter what, if we hit this limit... (so we can pick up new scrolls).
const scrollUpperBound = 29;

// Upgrade skip list — each entry has a key (used for saved settings), a label (matched against
// the button text), an optional display name for the UI, and a default skip value.
const UPGRADE_CATEGORIES = [
	{
		name: 'Stat Upgrades',
		items: [
			{ key: 'moreGoldDrops', label: 'More Gold Drops', defaultSkip: false },
			{ key: 'moreGoodGoldDrops', label: 'More Good Gold Drops', defaultSkip: false },
			{ key: 'lessBadGoldDrops', label: 'Less Bad Gold Drops', defaultSkip: false },
			{ key: 'moreItemDrops', label: 'More Item Drops', defaultSkip: false },
			{ key: 'moreScrollDrops', label: 'More Scroll Drops', defaultSkip: false },
			{ key: 'morePotionDrops', label: 'More Potion Drops', defaultSkip: false },
			{ key: 'rareItemDrops', label: 'Rare Item Drops', defaultSkip: false },
			{ key: 'moreMonsters', label: 'More Monsters', defaultSkip: false },
			{ key: 'averageMonsterCount', label: 'Average Monster Count', defaultSkip: false },
			{ key: 'itemLevelBonus', label: 'Item Level Bonus', defaultSkip: false },
			{ key: 'moreTreasureChests', label: 'More Treasure Chests', defaultSkip: false },
		]
	},
	{
		name: 'Monster Level Upgrades',
		items: [
			{ key: 'unlockMonsterLevel', label: 'Unlock Monster Level', defaultSkip: false },
			{ key: 'retireMonsterLevel', label: 'Retire Monster Level', defaultSkip: false },
		]
	},
	{
		name: 'Unlock Monster Level — Skip by Assessment',
		items: [
			{ key: 'assessEasyMonsters', label: 'Assessment: Easy Monsters', defaultSkip: false },
			{ key: 'assessChallenging', label: 'Assessment: Challenging', defaultSkip: false },
			{ key: 'assessVeryTough', label: 'Assessment: Very Tough!', defaultSkip: false },
			{ key: 'assessTooHard', label: 'Assessment: TOO HARD!', defaultSkip: false },
		]
	},
	{
		name: 'Castle / Farm Actions',
		items: [
			{ key: 'attackCastle', label: 'Attack Castle', defaultSkip: false },
			{ key: 'buyMonsterFarm', label: 'Buy Monster Farm', defaultSkip: false },
			{ key: 'harvestRewards', label: 'Harvest Rewards', defaultSkip: false },
			{ key: 'collectItemSales', label: 'Collect Item Sales', defaultSkip: false },
		]
	},
	{
		name: 'Character / Item Actions',
		items: [
			{ key: 'equipAllItems', label: 'Equip All Items', defaultSkip: false },
			{ key: 'equipItem', label: 'Equip ', defaultSkip: false, display: 'Equip (individual items)' },
			{ key: 'levelUp', label: 'Level Up', defaultSkip: false, display: 'Level Up (characters)' },
		]
	},
	{
		name: 'Achievements',
		items: [
			{ key: 'achievement', label: 'Achievement', defaultSkip: false },
		]
	},
];

// Potion list — each entry has a key (used for saved settings) and a label (matched exactly
// against the potion name). Each potion has two independent settings: skipUse (don't auto-drink
// it) and autoDrop (discard it on sight via the in-game dropPotionButton, regardless of skipUse).
// Sourced from the game's own potion definitions (the Mq array in c2.js), listed in the same order.
const POTION_CATEGORIES = [
	{
		name: 'Potion Effects',
		items: [
			{ key: 'potionDoubleKills', label: 'Double Kills' },
			{ key: 'potionDoubleGoldDropValue', label: 'Double Gold' },
			{ key: 'potionDoubleExperience', label: 'Double Experience' },
			{ key: 'potionFastWalking', label: 'Fast Walking' },
			{ key: 'potionFasterFarming', label: 'Faster Farming' },
			{ key: 'potionFasterInfestation', label: 'Faster Infestation' },
			{ key: 'potionInfiniteScrolls', label: 'Infinite Scrolls' },
			{ key: 'potionMoreMonsters', label: 'More Monsters' },
			{ key: 'potionGuaranteedItemDrops', label: '100% Item Drops' },
			{ key: 'potionPotionsLastLonger', label: 'Potions Last Longer' },
			{ key: 'potionFreeSpellCasting', label: 'Spells Cost Nothing' },
			{ key: 'potionMoreKillsPerFarm', label: 'More Kills Per Farm' },
			{ key: 'potionDocileMonsters', label: 'Docile Monsters' },
			{ key: 'potionHigherItemValues', label: 'Item Gold Values' },
			{ key: 'potionFrailMonsters', label: 'Frail Monsters' },
			{ key: 'potionScrollsAutoFire', label: 'Scrolls Auto Fire' },
			{ key: 'potionDoubleGoldDrops', label: 'Double Gold Drops' },
			{ key: 'potionDoubleItemDrops', label: 'Double Item Drops' },
			{ key: 'potionRandomTreasureRooms', label: 'Random Treasure Rooms' },
			{ key: 'potionRandomBossFights', label: 'Random Boss Fights' },
		]
	},
];

// In-memory cache of skip settings, loaded from GM storage on startup and updated on checkbox change.
let skipSettings = {};

// In-memory cache of potion settings ({ skipUse, autoDrop } per potion key), loaded from GM storage.
let potionSettings = {};

function loadSkipSettings() {
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

function appendSectionHeader(container, text) {
	const headerWrap = document.createElement('div');
	headerWrap.style.cssText = 'margin: 14px 0 5px;';
	const header = document.createElement('span');
	header.style.cssText = 'background-color: #4A4A55; color: #FFF; padding: 5px 9px; display: inline-block; font-size: 13px; font-weight: bold;';
	header.textContent = text;
	headerWrap.appendChild(header);
	container.appendChild(headerWrap);
}

function appendCategoryHeader(container, text) {
	const headerWrap = document.createElement('div');
	headerWrap.style.cssText = 'margin: 8px 0 3px;';
	const header = document.createElement('span');
	header.style.cssText = 'background-color: #2B2B32; color: #FFF; padding: 4px 7px; display: inline-block;';
	header.textContent = text;
	headerWrap.appendChild(header);
	container.appendChild(headerWrap);
}

function appendUpgradeRow(container, item) {
	const row = document.createElement('label');
	row.style.cssText = 'display: flex; align-items: center; padding: 3px 5px; border: 1px solid #2B2B32; margin-bottom: 2px; cursor: pointer;';

	const checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.checked = skipSettings[item.key];
	checkbox.style.marginRight = '6px';
	checkbox.addEventListener('change', () => {
		skipSettings[item.key] = checkbox.checked;
		GM_setValue(item.key, checkbox.checked);
	});

	const labelText = document.createElement('span');
	labelText.textContent = item.display ?? item.label.trim();

	row.appendChild(checkbox);
	row.appendChild(labelText);
	container.appendChild(row);
}

function appendPotionRow(container, item) {
	const row = document.createElement('div');
	row.style.cssText = 'display: flex; align-items: center; padding: 3px 5px; border: 1px solid #2B2B32; margin-bottom: 2px;';

	const labelText = document.createElement('span');
	labelText.textContent = item.display ?? item.label.trim();
	labelText.style.cssText = 'flex: 1;';
	row.appendChild(labelText);

	const makeToggle = (settingKey, text) => {
		const toggleLabel = document.createElement('label');
		toggleLabel.style.cssText = 'display: flex; align-items: center; margin-left: 14px; cursor: pointer; white-space: nowrap;';

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = potionSettings[item.key][settingKey];
		checkbox.style.marginRight = '4px';
		checkbox.addEventListener('change', () => {
			potionSettings[item.key][settingKey] = checkbox.checked;
			GM_setValue(`${item.key}_${settingKey}`, checkbox.checked);
		});

		const span = document.createElement('span');
		span.textContent = text;

		toggleLabel.appendChild(checkbox);
		toggleLabel.appendChild(span);
		return toggleLabel;
	};

	row.appendChild(makeToggle('skipUse', 'Skip Use'));
	row.appendChild(makeToggle('autoDrop', 'Auto Drop'));
	container.appendChild(row);
}

function buildSettingsContent(container) {
	appendSectionHeader(container, 'Upgrades');

	const intro = document.createElement('div');
	intro.style.cssText = 'padding: 5px; margin-bottom: 8px; border: 1px solid #2B2B32; color: #AAA; font-size: 11px;';
	intro.textContent = 'Checked upgrades will NOT be auto-clicked. Settings are saved automatically.';
	container.appendChild(intro);

	for (const category of UPGRADE_CATEGORIES) {
		appendCategoryHeader(container, category.name);
		for (const item of category.items) {
			appendUpgradeRow(container, item);
		}
	}

	appendSectionHeader(container, 'Potions');

	const potionIntro = document.createElement('div');
	potionIntro.style.cssText = 'padding: 5px; margin-bottom: 8px; border: 1px solid #2B2B32; color: #AAA; font-size: 11px;';
	potionIntro.textContent = '"Skip Use" leaves the potion alone instead of auto-drinking it. "Auto Drop" discards the potion on sight using the in-game X button, and takes priority over Skip Use.';
	container.appendChild(potionIntro);

	for (const category of POTION_CATEGORIES) {
		appendCategoryHeader(container, category.name);
		for (const item of category.items) {
			appendPotionRow(container, item);
		}
	}
}

function addBotTab() {
	const tabMenu = document.getElementById('gameTabMenu');
	// .mainTabContainer is the sibling of #gameTabMenu that holds all tab content divs.
	const mainTabContainer = document.querySelector('.mainTabContainer');

	if (!tabMenu || !mainTabContainer) {
		setTimeout(addBotTab, 500);
		return;
	}

	const ul = tabMenu.querySelector('ul');
	if (!ul) {
		setTimeout(addBotTab, 500);
		return;
	}

	// Insert our panel as a proper sibling of the game's other .tabContainer divs.
	// position: absolute + all-zero insets fills the same bounds as every other tab.
	const settingsPanel = document.createElement('div');
	settingsPanel.id = 'c2c-settings';
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
	const li = document.createElement('li');
	const a = document.createElement('a');
	a.textContent = 'Script Options';
	a.href = '#';

	a.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		const isOpen = settingsPanel.style.display !== 'none';
		settingsPanel.style.display = isOpen ? 'none' : 'block';
		li.className = isOpen ? '' : 'selectedTab';
		const dungeonNotif = document.querySelector('.dungeonNotificationDiv');
		if (dungeonNotif) dungeonNotif.style.display = isOpen ? '' : 'none';
		return false;
	});

	// Close our panel whenever any game tab is clicked.
	ul.querySelectorAll('a').forEach(existingA => {
		existingA.addEventListener('click', () => {
			settingsPanel.style.display = 'none';
			li.className = '';
			const dungeonNotif = document.querySelector('.dungeonNotificationDiv');
			if (dungeonNotif) dungeonNotif.style.removeProperty('display');
		});
	});

	li.appendChild(a);
	ul.appendChild(li);
}

function checkDifficultEncounter() {
	const pos = ['A', 'B', 'C', 'E', 'E', 'F'];
	for (const letter of pos) {
		for (let char = 0; char < 5; char++) {
			const selector = $(`#adventurerEffectIcon${letter}${char}`);
			if (selector.attr('title') === 'Stunned' && selector.css('display') !== 'none') {
				return true;
			}
		}
	}
	return false;
}

function lootChests() {
	clickSelector($('#treasureChestLootButtonPanel').find('.gameTabLootButtonPanel'));
	clickSelector($('#treasureChestLootButtonPanel').find('.lootButton'));
}

function clickAPUpgrades() {
	for (let row = 0; row < 12; row++) {
		if (row === 3) continue; // skip 'Offline Time Bonus' upgrade
		for (let col = 0; col < 2; col++) {
			clickIt(`#pointUpgradesContainer_${row}_${col}_${row}`);
		}
	}
}

// A "Level Up" quickbar button's second row shows the level the character will reach after
// this upgrade (e.g. "Level 34"). Reading that lets us keep characters level with each other
// without needing to cross-reference the separate character info panel.
function getLevelUpTargetLevel(upgradeBtn) {
	const levelText = upgradeBtn.find('tr').eq(1).find('td span').eq(0).text();
	const match = levelText.match(/\d+/);
	return match ? parseInt(match[0], 10) : null;
}

function clickQuickBarUpgrades() {
	// Find the lowest target level among all pending character level-ups, so we level everyone
	// to N before anyone moves to N+1, rather than favoring whichever character's button happens
	// to land at a given quickbar index.
	let minTargetLevel = Infinity;
	for (let i = 43; i >= 0; i--) {
		const upgradeBtn = $(`#upgradeButtonContainer_${i}`);
		if (upgradeBtn.text().indexOf('Level Up') === -1) continue;
		const targetLevel = getLevelUpTargetLevel(upgradeBtn);
		if (targetLevel !== null && targetLevel < minTargetLevel) minTargetLevel = targetLevel;
	}

	for (let i = 43; i >= 0; i--) {
		const upgradeBtn = $(`#upgradeButtonContainer_${i}`);
		const upgradeText = upgradeBtn.text();
		if (shouldSkipUpgrade(upgradeText)) continue;

		if (upgradeText.indexOf('Level Up') !== -1 && getLevelUpTargetLevel(upgradeBtn) !== minTargetLevel) {
			continue;
		}

		clickIt(`#upgradeButtonContainer_${i}`);
	}
}

function clickCharacterSkills() {
	for (let charPos = 0; charPos < 5; charPos++) {
		for (let col = 0; col < 9; col++) {
			for (let row = 0; row < 4; row++) {
				// There is an ending col on all, not sure why yet
				clickIt(`#characterSkillsContainer${charPos}_${col}_${row}_${col}`);
			}
		}
	}
}

function handlePotions(isBossEncounter, isEncounter) {
	let isPotionActive_ScrollsAutoFire = false;
	let isPotionActive_InfiniteScrolls = false;
	let potionCount = 0;

	// First pass: gather potion state before taking any actions
	for (let row = 0; row < 4; row++) {
		for (let col = 0; col < 2; col++) {
			const potionSelector = $(`#potionButton_Row${row}_Col${col}`).find('.potionContentContainer');
			const potionName = potionSelector.find('td').eq(1).text();
			const potionActive = (potionSelector.find('.potionButtonActive').length > 0);

			if (potionName.length === 0) continue;
			potionCount++;

			if (potionName === 'Scrolls Auto Fire') isPotionActive_ScrollsAutoFire = potionActive;
			if (potionName === 'Infinite Scrolls') isPotionActive_InfiniteScrolls = potionActive;
		}
	}

	// Second pass: click potions
	for (let row = 0; row < 4; row++) {
		for (let col = 0; col < 2; col++) {
			const potionSelector = $(`#potionButton_Row${row}_Col${col}`).find('.potionContentContainer');
			const potionName = potionSelector.find('td').eq(1).text();
			const potionActive = (potionSelector.find('.potionButtonActive').length > 0);

			if (potionName.length === 0) continue;

			// Auto Drop takes priority over everything else, including potions currently active/in use.
			if (shouldAutoDropPotion(potionName)) {
				clickSelector(potionSelector.find('.dropPotionButton'));
				continue;
			}

			if (potionActive || shouldSkipPotionUse(potionName)) continue;

			// We don't want to use AutoFire and InfiniteScrolls together, since they have similar functions.
			if (potionName === 'Infinite Scrolls' && isPotionActive_ScrollsAutoFire) continue;
			if (potionName === 'Scrolls Auto Fire' && isPotionActive_InfiniteScrolls) continue;

			// Always click farm bonus or fast walking potions as soon as we get them, since they are useful anywhere.
			if (potionName === 'Faster Infestation' || potionName === 'More Kills Per Farm' || potionName === 'Faster Farming' || potionName === 'Fast Walking') {
				clickSelector(potionSelector);
				continue;
			}

			// Only click these if we are in battle, no need to chug potions if we are walking around peaceful overworld.
			if (isBossEncounter || isEncounter) {
				if (potionName === 'Infinite Scrolls') isPotionActive_InfiniteScrolls = true;
				if (potionName === 'Scrolls Auto Fire') isPotionActive_ScrollsAutoFire = true;

				if (potionName === 'Potions Last Longer') {
					if (potionCount < 6 && !(isPotionActive_InfiniteScrolls || isPotionActive_ScrollsAutoFire)) continue;
				}

				if ((potionName === 'Random Treasure Rooms' || potionName === 'Double Item Drops' || potionName === 'Double Gold Drops')
					&& (isPotionActive_InfiniteScrolls || isPotionActive_ScrollsAutoFire)) continue;

				clickSelector(potionSelector);
			}
		}
	}

	return { isPotionActive_ScrollsAutoFire, isPotionActive_InfiniteScrolls };
}

function clickScrolls(isBossEncounter, isDifficultEncounter, isPotionActive_ScrollsAutoFire, isPotionActive_InfiniteScrolls) {
	for (let i = 0; i < 6; i++) {
		const scrollCell = $(`#scrollButtonCell${i}`);
		const scrollButton = scrollCell.find('.scrollButton');
		const scrollAmount = scrollCell.find('tr').eq(1).text().replace('x', '');

		if (!scrollAmount.length) continue;

		// Hitting limit, fire scrolls so we can pick up new ones.
		if (scrollAmount > scrollUpperBound) {
			clickSelector(scrollButton);
			continue;
		}

		// Spam spells if Infinite Scrolls potion is active.
		if (scrollAmount === 'Infinite' || isPotionActive_InfiniteScrolls) {
			// 4 times per second
			clickSelector(scrollButton);
			setTimeout(clickSelector, 250, scrollButton);
			setTimeout(clickSelector, 500, scrollButton);
			setTimeout(clickSelector, 750, scrollButton);
			continue;
		}

		// Fire 0 scrolls if Autofire is active... it fires them for free, so let's not waste ours.
		// unless boss encounter, we still want to double up on the big guys...
		if (isPotionActive_ScrollsAutoFire && !isBossEncounter && !isDifficultEncounter) continue;

		// 1 === spider web scroll. Always fire at normal encounters.
		// Boss are immune to spider web, so won't fire them.
		if (i === 1 && !isBossEncounter) {
			clickSelector(scrollButton);
		}

		if (i !== 1) {
			// Keep scrolls in reserve if generic encounter so we have them for boss.
			// No limit if this is a boss encounter.
			if (scrollAmount > scrollReserve || isBossEncounter || isDifficultEncounter) {
				clickSelector(scrollButton);
			}
		}
	}
}

$(() => {
	console.log(`Starting Clickpocalypse2Clicker: ${GM_info.script.version}`);
	loadSkipSettings();
	addBotTab();

	setInterval(() => {
		const isBossEncounter = ($('.bossEncounterNotificationDiv').length > 0);
		const isEncounter = ($('#encounterNotificationPanel').css('display') !== 'none');
		const isDifficultEncounter = checkDifficultEncounter();

		lootChests();
		clickAPUpgrades();
		clickQuickBarUpgrades();
		clickCharacterSkills();

		const { isPotionActive_ScrollsAutoFire, isPotionActive_InfiniteScrolls } = handlePotions(isBossEncounter, isEncounter);
		clickScrolls(isBossEncounter, isDifficultEncounter, isPotionActive_ScrollsAutoFire, isPotionActive_InfiniteScrolls);
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
