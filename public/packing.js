/*
 * The packing checklist rules for Gede Pangrango. Pure: days and people in,
 * grouped items out, so it can be unit tested. Item ids are stable, so
 * packed ticks survive changing days or people.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_PACKING = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function buildPackingList(opts) {
    var days = clamp(Math.round(opts.days), 1, 5);
    var people = clamp(Math.round(opts.people), 1, 12);
    var nights = days - 1;
    var overnight = nights > 0;
    var n = people;

    var shared = [
      { id: 'permit', label: 'Climbing permit (SIMAKSI)', note: 'Booked ahead; ID copies for each person', qty: 1 },
      { id: 'tent', label: 'Tent for 2', note: 'Nights near 5 °C above 2,000 m', qty: Math.ceil(n / 2) },
      { id: 'stove', label: 'Stove and pot set', note: 'One cooks for the group', qty: Math.ceil(n / 4) },
      { id: 'gas', label: 'Gas canister', note: 'Cooking and hot drinks', qty: Math.max(1, Math.ceil(n * nights / 4)) },
      { id: 'first-aid', label: 'First aid kit', note: 'Blister plasters and painkillers at least', qty: 1 },
      { id: 'tablets', label: 'Water purification tablets', note: 'Spring water needs treating', qty: 1 },
      { id: 'rubbish', label: 'Rubbish bags', note: 'All rubbish carried down', qty: days },
    ];
    var each = [
      { id: 'rain-jacket', label: 'Rain jacket', note: 'Rain most afternoons', qty: n },
      { id: 'warm-jacket', label: 'Warm jacket', note: 'Nights near 5 °C', qty: n },
      { id: 'gloves', label: 'Gloves and beanie', note: 'Cold on the crater rim', qty: n },
      { id: 'headlamp', label: 'Headlamp and spare batteries', note: 'Summit starts before dawn', qty: n },
      { id: 'shoes', label: 'Shoes with grip', note: 'Wet rock and roots', qty: n },
      { id: 'whistle', label: 'Whistle', note: 'Three blasts for help', qty: n },
      { id: 'power-bank', label: 'Power bank', note: 'No charging on the mountain', qty: n },
      { id: 'medicines', label: 'Personal medicines', note: 'Own prescription and blister care', qty: n },
      { id: 'sleeping-bag', label: 'Sleeping bag (5 °C)', note: 'Nights near 5 °C', qty: n },
      { id: 'sleeping-mat', label: 'Sleeping mat', note: 'Ground is cold and damp', qty: n },
      { id: 'dry-clothes', label: 'Dry clothes in a plastic bag', note: 'Dry layer for camp', qty: n },
    ];
    var food = [
      { id: 'water', label: 'Water', unit: 'L', note: '2 L each; refill at Kandang Batu and Kandang Badak', qty: 2 * n },
      { id: 'meals', label: 'Meals', note: 'Three a day, minus the first breakfast and the last dinner', qty: n * (days === 1 ? 1 : 3 * days - 2) },
      { id: 'snacks', label: 'Trail snacks', note: 'Two a day while walking', qty: 2 * n * days },
      { id: 'spare-meal', label: 'Spare meal', note: 'One extra each, in case of a cold night', qty: n },
    ];

    // key: stable id for the group's name, so i18n.js can translate it.
    return [
      { key: 'shared', group: 'Shared by the group', items: shared.filter(function (it) { return overnight || !needsNight(it.id); }) },
      { key: 'each', group: 'Each person', items: each.filter(function (it) { return overnight || !needsNight(it.id); }) },
      { key: 'food', group: 'Food and water', items: food },
    ];
  }

  // Items that only make sense with a night on the mountain.
  var NIGHT_IDS = { tent: 1, stove: 1, gas: 1, tablets: 1, 'warm-jacket': 1, gloves: 1, 'sleeping-bag': 1, 'sleeping-mat': 1, 'dry-clothes': 1 };
  function needsNight(id) { return !!NIGHT_IDS[id]; }

  return { buildPackingList: buildPackingList };
});
