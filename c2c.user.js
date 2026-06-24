// ==UserScript==
// @name        Clickpocalypse2Clicker
// @namespace   C2C
// @description Clicker Bot for Clickpocalypse2
// @include     http://minmaxia.com/c2/
// @include     https://minmaxia.com/c2/
// @version     2.1.0
// @grant       GM_setValue
// @grant       GM_getValue
// @require https://code.jquery.com/jquery-3.1.0.slim.min.js
// ==/UserScript==

// Removes eslint errors in Tampermonkey.
/* global $, GM_setValue, GM_getValue */

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
			{ key: 'moreGoldDrops',       label: 'More Gold Drops',       defaultSkip: false },
			{ key: 'moreGoodGoldDrops',   label: 'More Good Gold Drops',  defaultSkip: false },
			{ key: 'lessBadGoldDrops',    label: 'Less Bad Gold Drops',   defaultSkip: false },
			{ key: 'moreItemDrops',       label: 'More Item Drops',       defaultSkip: false },
			{ key: 'moreScrollDrops',     label: 'More Scroll Drops',     defaultSkip: false },
			{ key: 'morePotionDrops',     label: 'More Potion Drops',     defaultSkip: false },
			{ key: 'rareItemDrops',       label: 'Rare Item Drops',       defaultSkip: false },
			{ key: 'moreMonsters',        label: 'More Monsters',         defaultSkip: true  },
			{ key: 'averageMonsterCount', label: 'Average Monster Count', defaultSkip: true  },
			{ key: 'itemLevelBonus',      label: 'Item Level Bonus',      defaultSkip: false },
			{ key: 'moreTreasureChests',  label: 'More Treasure Chests',  defaultSkip: false },
		]
	},
	{
		name: 'Monster Level Upgrades',
		items: [
			{ key: 'unlockMonsterLevel',  label: 'Unlock Monster Level',  defaultSkip: true  },
			{ key: 'retireMonsterLevel',  label: 'Retire Monster Level',  defaultSkip: true  },
		]
	},
	{
		name: 'Castle / Farm Actions',
		items: [
			{ key: 'attackCastle',        label: 'Attack Castle',         defaultSkip: false },
			{ key: 'buyMonsterFarm',      label: 'Buy Monster Farm',      defaultSkip: false },
			{ key: 'harvestRewards',      label: 'Harvest Rewards',       defaultSkip: false },
			{ key: 'collectItemSales',    label: 'Collect Item Sales',    defaultSkip: false },
		]
	},
	{
		name: 'Character / Item Actions',
		items: [
			{ key: 'equipAllItems',       label: 'Equip All Items',       defaultSkip: false },
			{ key: 'equipItem',           label: 'Equip ',                defaultSkip: false, display: 'Equip (individual items)' },
			{ key: 'levelUp',             label: 'Level Up',              defaultSkip: false, display: 'Level Up (characters)'   },
		]
	},
	{
		name: 'Achievements',
		items: [
			{ key: 'achievement',         label: 'Achievement',           defaultSkip: false },
		]
	},
];

// In-memory cache of skip settings, loaded from GM storage on startup and updated on checkbox change.
let skipSettings = {};

function loadSkipSettings() {
	for (const category of UPGRADE_CATEGORIES) {
		for (const item of category.items) {
			skipSettings[item.key] = GM_getValue(item.key, item.defaultSkip);
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

function buildSettingsContent(container) {
	const title = document.createElement('div');
	title.style.cssText = 'font-size: 14px; font-weight: bold; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #444; color: #fff;';
	title.textContent = 'Skip Upgrades';
	container.appendChild(title);

	const subtitle = document.createElement('div');
	subtitle.style.cssText = 'font-size: 11px; color: #888; margin-bottom: 12px;';
	subtitle.textContent = 'Checked upgrades will NOT be auto-clicked.';
	container.appendChild(subtitle);

	for (const category of UPGRADE_CATEGORIES) {
		const catDiv = document.createElement('div');
		catDiv.style.marginBottom = '12px';

		const catName = document.createElement('div');
		catName.style.cssText = 'font-weight: bold; color: #aaa; font-size: 10px; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;';
		catName.textContent = category.name;
		catDiv.appendChild(catName);

		for (const item of category.items) {
			const row = document.createElement('label');
			row.style.cssText = 'display: flex; align-items: center; padding: 3px 0; cursor: pointer; border-bottom: 1px solid #2a2a2a;';

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = skipSettings[item.key];
			checkbox.style.marginRight = '8px';
			checkbox.addEventListener('change', () => {
				skipSettings[item.key] = checkbox.checked;
				GM_setValue(item.key, checkbox.checked);
			});

			const labelText = document.createElement('span');
			labelText.textContent = item.display ?? item.label.trim();

			row.appendChild(checkbox);
			row.appendChild(labelText);
			catDiv.appendChild(row);
		}

		container.appendChild(catDiv);
	}
}

function addBotTab() {
	const tabMenu = document.getElementById('gameTabMenu');
	const gameContent = document.getElementById('gameTabContent');

	if (!tabMenu || !gameContent) {
		setTimeout(addBotTab, 500);
		return;
	}

	const ul = tabMenu.querySelector('ul');
	if (!ul) {
		setTimeout(addBotTab, 500);
		return;
	}

	// Build the settings panel and size/position it to overlay the upgrade container.
	const settingsPanel = document.createElement('div');
	settingsPanel.id = 'c2c-settings';
	settingsPanel.style.cssText = `
		display: none;
		position: absolute;
		background: #1a1a1a;
		overflow-y: auto;
		padding: 12px 14px;
		box-sizing: border-box;
		z-index: 100;
		color: #eee;
		font-family: Arial, sans-serif;
		font-size: 13px;
	`;

	buildSettingsContent(settingsPanel);
	gameContent.style.position = 'relative';
	gameContent.appendChild(settingsPanel);

	function positionPanel() {
		const upgradeContainer = document.getElementById('upgradeButtonContainer');
		if (!upgradeContainer) return;
		const gameRect = gameContent.getBoundingClientRect();
		const upgradeRect = upgradeContainer.getBoundingClientRect();
		settingsPanel.style.top    = (upgradeRect.top  - gameRect.top)  + 'px';
		settingsPanel.style.left   = (upgradeRect.left - gameRect.left) + 'px';
		settingsPanel.style.width  = upgradeRect.width  + 'px';
		settingsPanel.style.height = upgradeRect.height + 'px';
	}

	// Create the Clicker tab.
	const li = document.createElement('li');
	const a  = document.createElement('a');
	a.textContent = 'Clicker';
	a.href = '#';

	a.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		const isOpen = settingsPanel.style.display !== 'none';
		if (isOpen) {
			settingsPanel.style.display = 'none';
			li.className = '';
		} else {
			positionPanel();
			settingsPanel.style.display = 'block';
			li.className = 'selectedTab';
		}
		return false;
	});

	// Close our panel whenever any game tab is clicked.
	ul.querySelectorAll('a').forEach(existingA => {
		existingA.addEventListener('click', () => {
			settingsPanel.style.display = 'none';
			li.className = '';
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

function clickQuickBarUpgrades() {
	for (let i = 43; i >= 0; i--) {
		const upgradeBtn = $(`#upgradeButtonContainer_${i}`);
		if (shouldSkipUpgrade(upgradeBtn.text())) continue;
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

			if (potionName.length === 0 || potionActive) continue;

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

				if ((potionName === 'Random Treasure Room' || potionName === 'Double Item Drops' || potionName === 'Double Gold Drops')
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
// ==UserScript==
// @name        Clickpocalypse2Clicker
// @namespace   C2C
// @description Clicker Bot for Clickpocalypse2
// @include     http://minmaxia.com/c2/
// @include     https://minmaxia.com/c2/
// @version     2.1.0
// @grant       GM_setValue
// @grant       GM_getValue
// @require https://code.jquery.com/jquery-3.1.0.slim.min.js
// ==/UserScript==

// Removes eslint errors in Tampermonkey.
/* global $, GM_setValue, GM_getValue */

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
			{ key: 'moreGoldDrops',       label: 'More Gold Drops',       defaultSkip: false },
			{ key: 'moreGoodGoldDrops',   label: 'More Good Gold Drops',  defaultSkip: false },
			{ key: 'lessBadGoldDrops',    label: 'Less Bad Gold Drops',   defaultSkip: false },
			{ key: 'moreItemDrops',       label: 'More Item Drops',       defaultSkip: false },
			{ key: 'moreScrollDrops',     label: 'More Scroll Drops',     defaultSkip: false },
			{ key: 'morePotionDrops',     label: 'More Potion Drops',     defaultSkip: false },
			{ key: 'rareItemDrops',       label: 'Rare Item Drops',       defaultSkip: false },
			{ key: 'moreMonsters',        label: 'More Monsters',         defaultSkip: true  },
			{ key: 'averageMonsterCount', label: 'Average Monster Count', defaultSkip: true  },
			{ key: 'itemLevelBonus',      label: 'Item Level Bonus',      defaultSkip: false },
			{ key: 'moreTreasureChests',  label: 'More Treasure Chests',  defaultSkip: false },
		]
	},
	{
		name: 'Monster Level Upgrades',
		items: [
			{ key: 'unlockMonsterLevel',  label: 'Unlock Monster Level',  defaultSkip: true  },
			{ key: 'retireMonsterLevel',  label: 'Retire Monster Level',  defaultSkip: true  },
		]
	},
	{
		name: 'Castle / Farm Actions',
		items: [
			{ key: 'attackCastle',        label: 'Attack Castle',         defaultSkip: false },
			{ key: 'buyMonsterFarm',      label: 'Buy Monster Farm',      defaultSkip: false },
			{ key: 'harvestRewards',      label: 'Harvest Rewards',       defaultSkip: false },
			{ key: 'collectItemSales',    label: 'Collect Item Sales',    defaultSkip: false },
		]
	},
	{
		name: 'Character / Item Actions',
		items: [
			{ key: 'equipAllItems',       label: 'Equip All Items',       defaultSkip: false },
			{ key: 'equipItem',           label: 'Equip ',                defaultSkip: false, display: 'Equip (individual items)' },
			{ key: 'levelUp',             label: 'Level Up',              defaultSkip: false, display: 'Level Up (characters)'   },
		]
	},
	{
		name: 'Achievements',
		items: [
			{ key: 'achievement',         label: 'Achievement',           defaultSkip: false },
		]
	},
];

// In-memory cache of skip settings, loaded from GM storage on startup and updated on checkbox change.
let skipSettings = {};

function loadSkipSettings() {
	for (const category of UPGRADE_CATEGORIES) {
		for (const item of category.items) {
			skipSettings[item.key] = GM_getValue(item.key, item.defaultSkip);
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

function createSettingsPanel() {
	const style = document.createElement('style');
	style.textContent = `
		#c2c-toggle {
			position: fixed;
			top: 10px;
			right: 10px;
			z-index: 99999;
			background: #444;
			color: #fff;
			border: 1px solid #666;
			padding: 4px 10px;
			cursor: pointer;
			border-radius: 4px;
			font-size: 14px;
			font-family: Arial, sans-serif;
		}
		#c2c-toggle:hover { background: #555; }
		#c2c-panel {
			position: fixed;
			top: 40px;
			right: 10px;
			z-index: 99998;
			background: #222;
			color: #eee;
			padding: 12px 16px;
			border-radius: 6px;
			border: 1px solid #555;
			display: none;
			max-height: 80vh;
			overflow-y: auto;
			min-width: 220px;
			font-family: Arial, sans-serif;
			font-size: 13px;
		}
		#c2c-panel h3 {
			margin: 0 0 10px 0;
			font-size: 14px;
			color: #fff;
			border-bottom: 1px solid #444;
			padding-bottom: 6px;
		}
		.c2c-category { margin-bottom: 10px; }
		.c2c-category-name {
			font-weight: bold;
			color: #aaa;
			font-size: 11px;
			text-transform: uppercase;
			margin-bottom: 4px;
		}
		.c2c-category label {
			display: block;
			cursor: pointer;
			padding: 2px 0;
		}
		.c2c-category label:hover { color: #fff; }
		.c2c-category input { margin-right: 6px; cursor: pointer; }
	`;
	document.head.appendChild(style);

	const toggleBtn = document.createElement('button');
	toggleBtn.id = 'c2c-toggle';
	toggleBtn.textContent = '⚙ C2C';

	const panel = document.createElement('div');
	panel.id = 'c2c-panel';

	const title = document.createElement('h3');
	title.textContent = 'Skip Upgrades';
	panel.appendChild(title);

	for (const category of UPGRADE_CATEGORIES) {
		const catDiv = document.createElement('div');
		catDiv.className = 'c2c-category';

		const catName = document.createElement('div');
		catName.className = 'c2c-category-name';
		catName.textContent = category.name;
		catDiv.appendChild(catName);

		for (const item of category.items) {
			const label = document.createElement('label');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = skipSettings[item.key];
			checkbox.addEventListener('change', () => {
				skipSettings[item.key] = checkbox.checked;
				GM_setValue(item.key, checkbox.checked);
			});
			label.appendChild(checkbox);
			label.appendChild(document.createTextNode(item.display ?? item.label.trim()));
			catDiv.appendChild(label);
		}

		panel.appendChild(catDiv);
	}

	toggleBtn.addEventListener('click', () => {
		panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
	});

	document.body.appendChild(toggleBtn);
	document.body.appendChild(panel);
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

function clickQuickBarUpgrades() {
	for (let i = 43; i >= 0; i--) {
		const upgradeBtn = $(`#upgradeButtonContainer_${i}`);
		if (shouldSkipUpgrade(upgradeBtn.text())) continue;
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

			if (potionName.length === 0 || potionActive) continue;

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

				if ((potionName === 'Random Treasure Room' || potionName === 'Double Item Drops' || potionName === 'Double Gold Drops')
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
	createSettingsPanel();

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
