// ==UserScript==
// @name        Clickpocalypse2Clicker
// @namespace   C2C
// @description Clicker Bot for Clickpocalypse2
// @include     http://minmaxia.com/c2/
// @include     https://minmaxia.com/c2/
// @version     2.0.0
// @grant       none
// @require https://code.jquery.com/jquery-3.1.0.slim.min.js
// ==/UserScript==

// Removes the eslint error in Tampermonkey.
/* global $ */

// This saves scrolls for boss encounters.
const scrollReserve = 15;

// This will fire scrolls no matter what, if we hit this limit... (so we can pick up new scrolls).
const scrollUpperBound = 29;

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
		if (

		// upgradeButtonContainer upgrade skip list — uncomment (remove the "//") to prevent auto-clicking a specific upgrade:

		// --- Stat upgrades (F-object) ---
		// upgradeBtn.text().indexOf('More Gold Drops') !== -1 ||
		// upgradeBtn.text().indexOf('More Good Gold Drops') !== -1 ||
		// upgradeBtn.text().indexOf('Less Bad Gold Drops') !== -1 ||
		// upgradeBtn.text().indexOf('More Item Drops') !== -1 ||
		// upgradeBtn.text().indexOf('More Scroll Drops') !== -1 ||
		// upgradeBtn.text().indexOf('More Potion Drops') !== -1 ||
		// upgradeBtn.text().indexOf('Rare Item Drops') !== -1 ||
		 upgradeBtn.text().indexOf('More Monsters') !== -1 ||
		 upgradeBtn.text().indexOf('Average Monster Count') !== -1 ||
		// upgradeBtn.text().indexOf('Item Level Bonus') !== -1 ||
		// upgradeBtn.text().indexOf('More Treasure Chests') !== -1 ||

		// --- Monster level upgrades (dynamic — number appended at runtime) ---
		 upgradeBtn.text().indexOf('Unlock Monster Level') !== -1 ||
		 upgradeBtn.text().indexOf('Retire Monster Level') !== -1 ||

		// --- Castle/farm actions ---
		// upgradeBtn.text().indexOf('Attack Castle') !== -1 ||
		// upgradeBtn.text().indexOf('Buy Monster Farm') !== -1 ||
		// upgradeBtn.text().indexOf('Harvest Rewards') !== -1 ||
		// upgradeBtn.text().indexOf('Collect Item Sales') !== -1 ||

		// --- Character/item actions ---
		// upgradeBtn.text().indexOf('Equip All Items') !== -1 ||
		// upgradeBtn.text().indexOf('Equip ') !== -1 ||   // individual item equips (note: also catches "Equip All Items")
		// upgradeBtn.text().indexOf('Level Up') !== -1 ||  // character level ups (dynamic — name appended)

		// --- Achievements ---
		// upgradeBtn.text().indexOf('Achievement') !== -1 ||

		// --- Do not remove this line: ---
		false
		) {
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
