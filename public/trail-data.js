/*
 * Mountain Trail's guide data. Ships with the app so the guide works with
 * no signal; server.js requires this same file to validate reports.
 * Heights, distances, walking times and coordinates are approximate guide
 * figures for the Cibodas route, not a survey.
 * Laid out as destination > route > stop (request #30). MOUNTAIN and STOPS
 * are kept as views of the default route so the screens read one shape.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_TRAIL = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /*
   * The guide is three levels deep: a destination (a mountain, hill or
   * valley, which is where the category gunung / bukit / lembah belongs),
   * its routes (the ways in from a basecamp), and each route's stops.
   * Gede Pangrango by Cibodas is the one destination so far; DESTINATIONS
   * is filled at the bottom of this file once its stops are declared.
   * Stop ids are unique across every route: reports store a bare stop_id.
   */
  var GEDE_PANGRANGO = {
    id: 'gede-pangrango',
    name: 'Gede Pangrango',
    category: 'gunung', // 'gunung' | 'bukit' | 'lembah', see LANDSCAPES
    province: 'Jawa Barat',
    // Approximate guide figures, not verified against the park.
    peaks: [
      { name: 'Puncak Gede', elevM: 2958 },
      { name: 'Puncak Pangrango', elevM: 3019 },
    ],
    /*
     * Curated mountain state, updated with app releases (the platform
     * offers no live source and no editor role). Every block carries
     * updatedAt / checkedAt / verified so the UI can say how fresh each
     * fact is and show "not verified" until a person confirms the figures
     * against the park's official pages.
     */
    status: {
      level: 'open', // 'open' | 'limited' | 'closed'
      reason: null, // 'weather' | 'fire' | 'eruption' | 'maintenance' | null
      updatedAt: '2026-10-15T00:00:00Z',
      checkedAt: '2026-10-15T00:00:00Z',
      verified: false,
    },
    permits: {
      booking: 'online', // 'online' | 'onsite' | 'none'
      bookingUrl: 'https://simaksi.gnpgede.com/',
      quotaDaily: 1500,
      feeWeekdayIdr: 25000,
      feeWeekendIdr: 45000,
      requirements: ['health-letter', 'id'],
      minGroupSize: 3,
      checkedAt: '2026-10-15T00:00:00Z',
      verified: false,
    },
    routes: [], // filled below
  };

  var CIBODAS = {
    id: 'cibodas',
    destinationId: 'gede-pangrango',
    name: 'Cibodas',
    route: 'Cibodas route to Puncak Gede',
    summitM: 2958,
    lengthKm: 9.6,
    climbM: 1683,
    hoursUp: '5 to 7',
    hoursUpMin: 5,
    hoursUpMax: 7,
    difficulty: 'hard', // 'easy' | 'moderate' | 'hard', see DIFFICULTIES; approximate guide figure
    // A route may carry its own status or permits; when it does, they
    // replace the destination's. Cibodas uses the destination's.
    status: null,
    permits: null,
    // Curated 3-day summit forecast, one entry per forecast day. Day
    // meaning (today / tomorrow / the day after) is decided by the client
    // from index, so the data never reads as stale on an old date.
    weather: {
      updatedAt: '2026-10-15T00:00:00Z',
      checkedAt: '2026-10-15T00:00:00Z',
      verified: false,
      basecamp: { tempC: 18, windKmh: 8, rainPct: 40 },
      summit: { tempC: 7, windKmh: 25, rainPct: 55 },
      days: [
        { date: null, tempHighC: 9, tempLowC: 4, windKmh: 30, rainPct: 60 },
        { date: null, tempHighC: 9, tempLowC: 4, windKmh: 45, rainPct: 80 },
        { date: null, tempHighC: 10, tempLowC: 5, windKmh: 20, rainPct: 45 },
      ],
    },
    stops: [], // filled below
  };

  // tone: 'warn' (amber) for conditions that slow you down, 'danger' (red)
  // for a blocked path. severity decides which warning the status strip
  // shows first, and every severity is unique: landslide 7, fallen tree 6,
  // extreme weather 5, heavy fog 4, wildlife 3, no water 2, slippery 1.
  var CONDITIONS = [
    { id: 'slippery', label: 'Slippery', hint: 'Wet rock or mud', tone: 'warn', severity: 1 },
    { id: 'no-water', label: 'No water', hint: 'Source dry or barely flowing', tone: 'warn', severity: 2 },
    { id: 'wildlife', label: 'Wildlife', hint: 'Unusual animals near the path', tone: 'warn', severity: 3 },
    { id: 'heavy-fog', label: 'Heavy fog', hint: "Can't see the next marker", tone: 'warn', severity: 4 },
    { id: 'extreme-weather', label: 'Extreme weather', hint: 'Heavy rain or strong wind', tone: 'warn', severity: 5 },
    { id: 'fallen-tree', label: 'Fallen tree', hint: 'Trunk blocking the path', tone: 'danger', severity: 6 },
    { id: 'landslide', label: 'Landslide', hint: 'Path buried or broken', tone: 'danger', severity: 7 },
  ];

  // The Cibodas route's stops, basecamp to summit. kinds is the stop's
  // type: basecamp, post, water, camp, junction (a side path leaves here),
  // summit. A stop may be several.
  var CIBODAS_STOPS = [
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
      id: 'panyancangan', name: 'Panyancangan', kinds: ['post', 'junction'],
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
      id: 'kandang-badak', name: 'Kandang Badak', kinds: ['camp', 'water', 'junction'],
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

  // Destination categories, in display order. Ids are stable and never
  // translated (like condition ids); labels live in i18n.js under ls.<id>.
  // A category belongs to a destination, never to a stop (request #30).
  var LANDSCAPES = ['gunung', 'bukit', 'lembah'];
  // The stop types the Trail tab filters by, in chip order. Basecamp and
  // summit show under All only.
  var STOP_TYPES = ['post', 'water', 'camp', 'junction'];
  // Route difficulty, easiest first. A route's optional difficulty is one of
  // these ids; labels live in i18n.js under diff.<id>.
  var DIFFICULTIES = ['easy', 'moderate', 'hard'];

  CIBODAS.stops = CIBODAS_STOPS;
  GEDE_PANGRANGO.routes = [CIBODAS];
  var DESTINATIONS = [GEDE_PANGRANGO];

  var DEST_BY_ID = {};
  var ROUTE_BY_ID = {};
  var ALL_STOPS = [];
  var STOP_ROUTE = {};
  DESTINATIONS.forEach(function (d) {
    DEST_BY_ID[d.id] = d;
    d.routes.forEach(function (r) {
      ROUTE_BY_ID[r.id] = r;
      r.stops.forEach(function (s) {
        ALL_STOPS.push(s);
        STOP_ROUTE[s.id] = r.id;
      });
    });
  });

  var COND_BY_ID = {};
  CONDITIONS.forEach(function (c) { COND_BY_ID[c.id] = c; });
  var STOP_BY_ID = {};
  ALL_STOPS.forEach(function (s) { STOP_BY_ID[s.id] = s; });

  // The route a stop is on, or null for an unknown id.
  function routeOfStop(stopId) {
    return STOP_ROUTE[stopId] ? ROUTE_BY_ID[STOP_ROUTE[stopId]] : null;
  }

  // One route seen as the flat "mountain" the screens read: the
  // destination's name, category and province with the route's figures,
  // and the route's own status or permits where it has them.
  function mountainView(route) {
    var d = DEST_BY_ID[route.destinationId];
    return {
      id: d.id,
      name: d.name,
      category: d.category,
      province: d.province,
      routeId: route.id,
      route: route.route,
      summitM: route.summitM,
      lengthKm: route.lengthKm,
      climbM: route.climbM,
      hoursUp: route.hoursUp,
      hoursUpMin: route.hoursUpMin,
      hoursUpMax: route.hoursUpMax,
      difficulty: route.difficulty || null,
      status: route.status || d.status,
      permits: route.permits || d.permits,
      weather: route.weather,
    };
  }

  // The route the app shows, until there is more than one to pick from.
  var DEFAULT_ROUTE = CIBODAS;
  var MOUNTAIN = mountainView(DEFAULT_ROUTE);
  var STOPS = DEFAULT_ROUTE.stops;

  // Cumulative walking minutes from each route's basecamp: each stop's time
  // is the sum of legToNext.min for every leg before it, with no rest
  // breaks. Basecamps are 0. Keyed by stop id (unique across routes). Used
  // by the labelled height profile.
  var MIN_FROM_BASECAMP = {};
  DESTINATIONS.forEach(function (d) {
    d.routes.forEach(function (r) {
      r.stops.forEach(function (s, i) {
        MIN_FROM_BASECAMP[s.id] = i === 0 ? 0 : MIN_FROM_BASECAMP[r.stops[i - 1].id] + r.stops[i - 1].legToNext.min;
      });
    });
  });

  function haversineM(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var rad = Math.PI / 180;
    var a = Math.sin((lat2 - lat1) * rad / 2);
    var b = Math.sin((lng2 - lng1) * rad / 2);
    var h = a * a + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * b * b;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // Distance in metres from a position to each stop; returns the closest.
  // Searches one route's stops when a route id is given, every stop if not.
  function nearestStop(lat, lng, routeId) {
    var best = null, bestD = Infinity;
    var list = routeId && ROUTE_BY_ID[routeId] ? ROUTE_BY_ID[routeId].stops : ALL_STOPS;
    list.forEach(function (s) {
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

  // "1 hiker says it's still there." Blank when there is nothing to show.
  function formatConfirms(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 1) return '';
    return n === 1 ? "1 hiker says it's still there." : n + " hikers say it's still there.";
  }

  return {
    DESTINATIONS: DESTINATIONS,
    DEST_BY_ID: DEST_BY_ID,
    ROUTE_BY_ID: ROUTE_BY_ID,
    ALL_STOPS: ALL_STOPS,
    routeOfStop: routeOfStop,
    mountainView: mountainView,
    MOUNTAIN: MOUNTAIN,
    CONDITIONS: CONDITIONS,
    COND_BY_ID: COND_BY_ID,
    STOPS: STOPS,
    STOP_BY_ID: STOP_BY_ID,
    MIN_FROM_BASECAMP: MIN_FROM_BASECAMP,
    LANDSCAPES: LANDSCAPES,
    STOP_TYPES: STOP_TYPES,
    DIFFICULTIES: DIFFICULTIES,
    nearestStop: nearestStop,
    formatAgo: formatAgo,
    formatConfirms: formatConfirms,
  };
});
