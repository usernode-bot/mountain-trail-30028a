/*
 * Mountain Trail's guide data. Ships with the app so the guide works with
 * no signal; server.js requires this same file to validate reports.
 * Heights, distances, walking times and coordinates are approximate guide
 * figures for the Cibodas route, not a survey.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_TRAIL = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MOUNTAIN = {
    name: 'Gede Pangrango',
    route: 'Cibodas route to Puncak Gede',
    summitM: 2958,
    lengthKm: 9.6,
    climbM: 1683,
    hoursUp: '5 to 7',
  };

  // tone: 'warn' (amber) for conditions that slow you down, 'danger' (red)
  // for a blocked path. severity decides which warning the status strip
  // shows first: landslide 4, heavy fog 3, no water 2, slippery 1.
  var CONDITIONS = [
    { id: 'slippery', label: 'Slippery', hint: 'Wet rock or mud', tone: 'warn', severity: 1 },
    { id: 'no-water', label: 'No water', hint: 'Source dry or barely flowing', tone: 'warn', severity: 2 },
    { id: 'heavy-fog', label: 'Heavy fog', hint: "Can't see the next marker", tone: 'warn', severity: 3 },
    { id: 'landslide', label: 'Landslide', hint: 'Path buried or broken', tone: 'danger', severity: 4 },
  ];

  var STOPS = [
    {
      id: 'cibodas', name: 'Basecamp Cibodas', kinds: ['basecamp', 'water'],
      elevM: 1275, km: 0, lat: -6.7405, lng: 107.0003,
      short: 'Register and show your permit',
      detail: 'The national park gate. Register, show your SIMAKSI permit and pay the fee here. Porters and guides can be arranged at the entrance, and the last shops and signal are across the road.',
      legToNext: { min: 40, climbM: 300 },
    },
    {
      id: 'telaga-biru', name: 'Telaga Biru', kinds: ['post'],
      elevM: 1575, km: 1.4, lat: -6.7475, lng: 106.9980,
      short: 'Blue lake beside the path',
      detail: 'A small blue lake a short walk up from the gate, with a shelter and a viewpoint over the water. The forest here is thick moss and tree ferns.',
      legToNext: { min: 15, climbM: 45 },
    },
    {
      id: 'rawa-gayonggong', name: 'Rawa Gayonggong', kinds: ['post'],
      elevM: 1620, km: 1.9, lat: -6.7500, lng: 106.9968,
      short: 'Boardwalk over the marsh',
      detail: 'A marsh crossing on a plank boardwalk. The planks stay wet and mossy: walk the middle, not the edges.',
      legToNext: { min: 20, climbM: 8 },
    },
    {
      id: 'panyancangan', name: 'Panyancangan', kinds: ['post'],
      elevM: 1628, km: 2.6, lat: -6.7530, lng: 106.9950,
      short: 'Shelter, side path to Cibeureum falls',
      detail: 'A rest shelter at the foot of the long climb. A side path drops to the Cibeureum waterfalls. From here the trail steepens for roughly an hour and a half.',
      legToNext: { min: 90, climbM: 522 },
    },
    {
      id: 'air-panas', name: 'Air Panas', kinds: ['post'],
      elevM: 2150, km: 5.3, lat: -6.7660, lng: 106.9870,
      short: 'Hot stream crossing, hold the rope',
      detail: 'A hot spring stream crossing the trail, with a fixed rope to hold. The rocks around the crossing are slick: the steam fogs glasses and headlamps.',
      legToNext: { min: 15, climbM: 70 },
    },
    {
      id: 'kandang-batu', name: 'Kandang Batu', kinds: ['camp', 'water'],
      elevM: 2220, km: 5.8, lat: -6.7680, lng: 106.9860,
      short: 'Shelter and spring',
      detail: 'A stone shelter and a dependable spring, the first reliable refill above the gate. A quiet camp for the night if the main camp below the summit is full.',
      legToNext: { min: 40, climbM: 175 },
    },
    {
      id: 'kandang-badak', name: 'Kandang Badak', kinds: ['camp', 'water'],
      elevM: 2395, km: 7.0, lat: -6.7720, lng: 106.9835,
      short: 'Main camp, path to Pangrango',
      detail: 'The main camp area, with a spring and room for tents. The side path to Mount Pangrango leaves from here. Nights drop close to 5 °C.',
      legToNext: { min: 40, climbM: 205 },
    },
    {
      id: 'tanjakan-setan', name: 'Tanjakan Setan', kinds: ['post'],
      elevM: 2600, km: 8.0, lat: -6.7760, lng: 106.9820,
      short: 'Steep rock with ropes',
      detail: '"The devil’s climb": a steep rocky ramp with fixed ropes. Slow going, and the exposed rock breaks in heavy rain.',
      legToNext: { min: 60, climbM: 358 },
    },
    {
      id: 'puncak-gede', name: 'Puncak Gede', kinds: ['summit'],
      elevM: 2958, km: 9.6, lat: -6.7820, lng: 106.9805,
      short: 'Crater rim, no water, no camping',
      detail: 'The summit crater rim at 2,958 m, with the yellow sulphur craters below. No water and no camping. Fog closes in fast from late morning.',
      legToNext: null,
    },
  ];

  var COND_BY_ID = {};
  CONDITIONS.forEach(function (c) { COND_BY_ID[c.id] = c; });
  var STOP_BY_ID = {};
  STOPS.forEach(function (s) { STOP_BY_ID[s.id] = s; });

  // Cumulative walking minutes from basecamp: each stop's time is the sum
  // of legToNext.min for every leg before it, with no rest breaks. Basecamp
  // itself is 0. Used by the labelled height profile.
  var MIN_FROM_BASECAMP = { cibodas: 0 };
  for (var mb = 1; mb < STOPS.length; mb++) {
    MIN_FROM_BASECAMP[STOPS[mb].id] = MIN_FROM_BASECAMP[STOPS[mb - 1].id] + STOPS[mb - 1].legToNext.min;
  }

  function haversineM(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var rad = Math.PI / 180;
    var a = Math.sin((lat2 - lat1) * rad / 2);
    var b = Math.sin((lng2 - lng1) * rad / 2);
    var h = a * a + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * b * b;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // Distance in metres from a position to each stop; returns the closest.
  function nearestStop(lat, lng) {
    var best = null, bestD = Infinity;
    STOPS.forEach(function (s) {
      var d = haversineM(lat, lng, s.lat, s.lng);
      if (d < bestD) { bestD = d; best = s; }
    });
    return { stop: best, meters: bestD };
  }

  // "just now", "5 min ago", "2 h ago". Past 24 hours: the clock time.
  function formatAgo(ms) {
    if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) ms = 0;
    var min = Math.floor(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    var h = Math.floor(min / 60);
    if (h < 24) return h === 1 ? '1 h ago' : h + ' h ago';
    return 'over a day ago';
  }

  return {
    MOUNTAIN: MOUNTAIN,
    CONDITIONS: CONDITIONS,
    COND_BY_ID: COND_BY_ID,
    STOPS: STOPS,
    STOP_BY_ID: STOP_BY_ID,
    MIN_FROM_BASECAMP: MIN_FROM_BASECAMP,
    nearestStop: nearestStop,
    formatAgo: formatAgo,
  };
});
