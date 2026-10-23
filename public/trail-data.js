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
    island: 'jawa',
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
    summitName: 'Puncak Gede',
    route: 'Cibodas route to Puncak Gede',
    summitM: 2958,
    lengthKm: 9.6,
    climbM: 1683,
    hoursUp: '5 to 7',
    hoursUpMin: 5,
    hoursUpMax: 7,
    difficulty: 'hard', // 'easy' | 'moderate' | 'hard', see DIFFICULTIES; approximate guide figure
    // The figures on this route are guide estimates, not a survey. The flag
    // is false until a person has checked them against an official source.
    figures: { checkedAt: '2026-10-15T00:00:00Z', verified: false },
    // Curated approximate night temperature at camp, used by the packing
    // notes. The checklist itself lives in public/packing.js.
    packing: { nightTempC: 5 },
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

  // ── The national catalog ───────────────────────────────────────────────
  // Eight island groups, in the order the catalog shows them. Ids are
  // stable; their labels live in i18n.js under island.<id>.
  var ISLANDS = ['sumatra', 'jawa', 'bali', 'nusa-tenggara', 'kalimantan', 'sulawesi', 'maluku', 'papua'];
  // The Popular strip, in display order. Every id must resolve.
  var POPULAR = ['semeru', 'rinjani', 'merbabu', 'prau', 'kerinci', 'gede-pangrango', 'sindoro', 'ciremai'];
  var DEFAULT_DESTINATION_ID = 'gede-pangrango';
  var DATA_CHECKED_AT = '2026-10-15T00:00:00Z';

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function num(n, sep) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  function checkedStatus(level, reason) {
    return { level: level || 'open', reason: reason || null, updatedAt: DATA_CHECKED_AT, checkedAt: DATA_CHECKED_AT, verified: false };
  }
  function unknownPermits() {
    return {
      booking: 'unknown', bookingUrl: null, quotaDaily: null,
      feeWeekdayIdr: null, feeWeekendIdr: null,
      requirements: ['id'], minGroupSize: null,
      checkedAt: DATA_CHECKED_AT, verified: false,
    };
  }

  // Build one route from the compact catalog definition, including the
  // basecamp and summit stops every route must have. Custom stops, used by
  // the well-known routes, sit between them. Stop ids are prefixed with the
  // route id and never change once released: reports store a bare stop_id.
  function buildRoute(def) {
    var routeId = def.routeSlug || (def.id + '-' + slug(def.route));
    var baseElev = def.baseM;
    var base = {
      id: routeId + '-basecamp',
      name: def.basecamp || ('Basecamp ' + def.route),
      kinds: ['basecamp', 'water'],
      elevM: baseElev, km: 0, lat: def.lat, lng: def.lng,
      short: 'Register and show your permit',
      shortId: 'Daftar dan tunjukkan izin',
      detail: 'The basecamp for the ' + def.route + ' route. Register, show your permit if the mountain requires one, and fill water before the climb.',
      detailId: 'Basecamp jalur ' + def.route + '. Daftar, tunjukkan izin jika gunung ini memerlukannya, dan isi air sebelum mendaki.',
      legMin: def.stops && def.stops.length ? def.stops[0].legMin : def.hours[0] * 60,
    };
    var stops = [base];
    var lat = def.lat, lng = def.lng;
    (def.stops || []).forEach(function (s) {
      lat += 0.012; lng += 0.004;
      stops.push({
        id: routeId + '-' + s.slug,
        name: s.name,
        kinds: s.kinds || ['post'],
        elevM: s.elevM, km: s.km, lat: lat, lng: lng,
        short: s.short, shortId: s.shortId,
        detail: s.detail, detailId: s.detailId,
        legMin: s.legMin,
      });
    });
    var hasSummit = stops.some(function (s) { return s.kinds.indexOf('summit') >= 0; });
    if (!hasSummit) {
      lat += 0.012; lng += 0.004;
      stops.push({
        id: routeId + '-summit',
        name: def.summitName,
        kinds: ['summit'],
        elevM: def.summitM, km: def.km, lat: lat, lng: lng,
        short: 'Summit, no camping',
        shortId: 'Puncak, tidak untuk berkemah',
        detail: 'The summit at ' + num(def.summitM, ',') + ' m. No water and no camping. Turn back early if the weather closes in.',
        detailId: 'Puncak pada ' + num(def.summitM, '.') + ' m. Tidak ada air dan tidak untuk berkemah. Turun lebih awal jika cuaca memburuk.',
        legMin: def.summitLegMin || Math.max(30, def.hours[0] * 60 - 60),
      });
    }
    for (var i = 0; i < stops.length; i++) {
      var next = stops[i + 1];
      if (!next) { stops[i].legToNext = null; continue; }
      stops[i].legToNext = { min: stops[i].legMin, climbM: next.elevM - stops[i].elevM };
      delete stops[i].legMin;
    }
    return {
      id: routeId,
      destinationId: def.id,
      name: def.route,
      summitName: def.summitName,
      route: def.route + ' route to ' + def.summitName,
      summitM: def.summitM,
      lengthKm: def.km,
      climbM: def.summitM - def.baseM,
      hoursUp: def.hours[0] === def.hours[1] ? def.hours[0] + ' hours' : def.hours[0] + ' to ' + def.hours[1] + ' hours',
      hoursUpMin: def.hours[0],
      hoursUpMax: def.hours[1],
      difficulty: def.difficulty,
      figures: { checkedAt: DATA_CHECKED_AT, verified: false },
      packing: { nightTempC: def.nightTempC },
      status: null,
      permits: null,
      weather: null,
      stops: stops,
    };
  }

  function buildDestination(def) {
    var route = buildRoute(def);
    var summitName = def.summitName;
    return {
      id: def.id,
      name: def.name,
      category: def.category || 'gunung',
      island: def.island,
      province: def.province,
      peaks: [{ name: summitName, elevM: def.summitM }],
      status: def.status || checkedStatus('open', null),
      permits: def.permits || unknownPermits(),
      routes: [route],
    };
  }

  // One entry per mountain. Figures are approximate guide values, not a
  // survey, and every one carries figures.verified:false. Popular routes
  // carry their well-known stops; the rest have a basecamp and a summit.
  var MORE_DEFS = [
    // ── Jawa ──
    { id: 'semeru', name: 'Semeru', island: 'jawa', province: 'Jawa Timur', summitM: 3676, baseM: 2176, km: 12.4, hours: [8, 10], difficulty: 'hard', route: 'Ranu Pane', routeSlug: 'semeru-ranupane', summitName: 'Mahameru', lat: -8.1077, lng: 112.922, nightTempC: 3, stops: [
      { slug: 'ranu-kumbolo', name: 'Ranu Kumbolo', kinds: ['camp', 'water'], elevM: 2400, km: 4.5, legMin: 150, short: 'Lake camp and water', shortId: 'Danau, kemah dan air', detail: 'A lake camp with a reliable refill. Cold at night; keep food away from the water.', detailId: 'Danau untuk berkemah dengan sumber air yang bisa diandalkan. Dingin di malam hari; jauhkan makanan dari air.' },
      { slug: 'kalimati', name: 'Kalimati', kinds: ['camp'], elevM: 2700, km: 8.5, legMin: 150, short: 'Last camp before the summit', shortId: 'Kemah terakhir sebelum puncak', detail: 'A sandy camp below the summit climb. No reliable water here; carry what you need from Ranu Kumbolo.', detailId: 'Kemah berpasir di bawah pendakian puncak. Tidak ada air yang bisa diandalkan; bawa kebutuhan dari Ranu Kumbolo.' },
      { slug: 'summit', name: 'Mahameru', kinds: ['summit'], elevM: 3676, km: 12.4, legMin: 180, short: 'Summit, no camping', shortId: 'Puncak, tidak untuk berkemah', detail: 'The summit at 3,676 m, above the crater. No water and no camping. Turn back if the plume or weather closes in.', detailId: 'Puncak pada 3.676 m, di atas kawah. Tidak ada air dan tidak untuk berkemah. Kembali jika asap atau cuaca memburuk.' },
    ] },
    { id: 'merbabu', name: 'Merbabu', island: 'jawa', province: 'Jawa Tengah', summitM: 3145, baseM: 1500, km: 9.2, hours: [5, 7], difficulty: 'moderate', route: 'Selo', routeSlug: 'merbabu-selo', summitName: 'Puncak Merbabu', lat: -7.456, lng: 110.436, nightTempC: 5 },
    { id: 'prau', name: 'Prau', island: 'jawa', province: 'Jawa Tengah', summitM: 2565, baseM: 1600, km: 6.5, hours: [4, 5], difficulty: 'moderate', route: 'Patak Banteng', routeSlug: 'prau-patak-banteng', summitName: 'Puncak Prau', lat: -7.19, lng: 109.92, nightTempC: 8 },
    { id: 'sindoro', name: 'Sindoro', island: 'jawa', province: 'Jawa Tengah', summitM: 3153, baseM: 1700, km: 11, hours: [6, 8], difficulty: 'moderate', route: 'Kledung', summitName: 'Puncak Sindoro', lat: -7.30, lng: 109.99, nightTempC: 6 },
    { id: 'ciremai', name: 'Ciremai', island: 'jawa', province: 'Jawa Barat', summitM: 3078, baseM: 1750, km: 10.5, hours: [6, 9], difficulty: 'hard', route: 'Linggarjati', summitName: 'Puncak Ciremai', lat: -6.89, lng: 108.40, nightTempC: 6 },
    { id: 'sumbing', name: 'Sumbing', island: 'jawa', province: 'Jawa Tengah', summitM: 3371, baseM: 1750, km: 12, hours: [7, 10], difficulty: 'hard', route: 'Kledung', summitName: 'Puncak Sumbing', lat: -7.37, lng: 110.07, nightTempC: 5 },
    { id: 'slamet', name: 'Slamet', island: 'jawa', province: 'Jawa Tengah', summitM: 3432, baseM: 1800, km: 12, hours: [7, 10], difficulty: 'hard', route: 'Bambangan', summitName: 'Puncak Slamet', lat: -7.24, lng: 109.22, nightTempC: 5 },
    { id: 'merapi', name: 'Merapi', island: 'jawa', province: 'DI Yogyakarta', summitM: 2930, baseM: 1600, km: 8.5, hours: [5, 7], difficulty: 'hard', route: 'Ngepos', summitName: 'Puncak Merapi', lat: -7.54, lng: 110.44, nightTempC: 6 },
    { id: 'lawu', name: 'Lawu', island: 'jawa', province: 'Jawa Tengah', summitM: 3265, baseM: 1900, km: 11, hours: [6, 8], difficulty: 'moderate', route: 'Cemoro Sewu', summitName: 'Puncak Lawu', lat: -7.62, lng: 111.19, nightTempC: 6 },
    { id: 'argopuro', name: 'Argopuro', island: 'jawa', province: 'Jawa Timur', summitM: 3088, baseM: 1200, km: 22, hours: [12, 16], difficulty: 'hard', route: 'Baderan', summitName: 'Puncak Argopuro', lat: -7.94, lng: 113.70, nightTempC: 7 },
    { id: 'raung', name: 'Raung', island: 'jawa', province: 'Jawa Timur', summitM: 3332, baseM: 1500, km: 16, hours: [9, 12], difficulty: 'hard', route: 'Sumberwringin', summitName: 'Puncak Raung', lat: -8.06, lng: 114.04, nightTempC: 5 },
    { id: 'ijen', name: 'Ijen', island: 'jawa', province: 'Jawa Timur', summitM: 2799, baseM: 1800, km: 7, hours: [4, 5], difficulty: 'moderate', route: 'Paltuding', summitName: 'Puncak Ijen', lat: -8.05, lng: 114.24, nightTempC: 9 },
    { id: 'papandayan', name: 'Papandayan', island: 'jawa', province: 'Jawa Barat', summitM: 2665, baseM: 1900, km: 7, hours: [4, 5], difficulty: 'moderate', route: 'Cisurupan', summitName: 'Puncak Papandayan', lat: -7.32, lng: 107.73, nightTempC: 8 },
    { id: 'guntur', name: 'Guntur', island: 'jawa', province: 'Jawa Barat', summitM: 2249, baseM: 1500, km: 6, hours: [3, 4], difficulty: 'moderate', route: 'Cikajang', summitName: 'Puncak Guntur', lat: -7.34, lng: 107.80, nightTempC: 10 },
    { id: 'ungaran', name: 'Ungaran', island: 'jawa', province: 'Jawa Tengah', summitM: 2050, baseM: 1000, km: 7, hours: [3, 4], difficulty: 'easy', route: 'Banyumanik', summitName: 'Puncak Ungaran', lat: -7.18, lng: 110.40, nightTempC: 11 },
    { id: 'andong', name: 'Andong', island: 'jawa', province: 'Jawa Tengah', summitM: 1726, baseM: 900, km: 6, hours: [3, 4], difficulty: 'easy', route: 'Kalidoro', summitName: 'Puncak Andong', lat: -7.31, lng: 110.36, nightTempC: 12 },
    { id: 'bromo', name: 'Bromo', island: 'jawa', province: 'Jawa Timur', summitM: 2329, baseM: 2100, km: 4, hours: [2, 3], difficulty: 'easy', route: 'Cemoro Lawang', summitName: 'Puncak Bromo', lat: -7.92, lng: 112.95, nightTempC: 8 },
    // ── Sumatra ──
    { id: 'kerinci', name: 'Kerinci', island: 'sumatra', province: 'Jambi', summitM: 3805, baseM: 1400, km: 9, hours: [6, 9], difficulty: 'hard', route: 'Kersik Tuo', routeSlug: 'kerinci-kersik-tuo', summitName: 'Puncak Kerinci', lat: -1.70, lng: 101.26, nightTempC: 3, stops: [
      { slug: 'camp', name: 'Camp 3', kinds: ['camp'], elevM: 3100, km: 6, legMin: 300, short: 'High camp below the summit', shortId: 'Kemah tinggi di bawah puncak', detail: 'A small camp on the ridge. Cold and exposed; refill water at the last spring below it.', detailId: 'Kemah kecil di punggungan. Dingin dan terbuka; isi air di mata air terakhir di bawahnya.' },
      { slug: 'summit', name: 'Puncak Kerinci', kinds: ['summit'], elevM: 3805, km: 9, legMin: 240, short: 'Summit, no camping', shortId: 'Puncak, tidak untuk berkemah', detail: 'The highest summit in Sumatra, at 3,805 m. No water and no camping. Start early; cloud builds fast.', detailId: 'Puncak tertinggi di Sumatra, 3.805 m. Tidak ada air dan tidak untuk berkemah. Mulai pagi; awan cepat datang.' },
    ] },
    { id: 'marapi', name: 'Marapi', island: 'sumatra', province: 'Sumatera Barat', summitM: 2891, baseM: 1400, km: 8, hours: [5, 7], difficulty: 'hard', route: 'Koto Baru', summitName: 'Puncak Marapi', lat: -0.38, lng: 100.47, nightTempC: 6 },
    { id: 'singgalang', name: 'Singgalang', island: 'sumatra', province: 'Sumatera Barat', summitM: 2877, baseM: 1400, km: 9, hours: [5, 7], difficulty: 'moderate', route: 'Pandai Sikat', summitName: 'Puncak Singgalang', lat: -0.39, lng: 100.33, nightTempC: 6 },
    { id: 'tandikat', name: 'Tandikat', island: 'sumatra', province: 'Sumatera Barat', summitM: 2438, baseM: 1200, km: 7, hours: [4, 6], difficulty: 'moderate', route: 'Singgalang', summitName: 'Puncak Tandikat', lat: -0.42, lng: 100.32, nightTempC: 8 },
    { id: 'talang', name: 'Talang', island: 'sumatra', province: 'Sumatera Barat', summitM: 2597, baseM: 1400, km: 7, hours: [4, 6], difficulty: 'moderate', route: 'Batu Bajanjang', summitName: 'Puncak Talang', lat: -0.98, lng: 100.68, nightTempC: 7 },
    { id: 'sibayak', name: 'Sibayak', island: 'sumatra', province: 'Sumatera Utara', summitM: 2212, baseM: 1700, km: 5, hours: [2, 3], difficulty: 'easy', route: 'Sibolangit', summitName: 'Puncak Sibayak', lat: 3.23, lng: 98.51, nightTempC: 10 },
    { id: 'sinabung', name: 'Sinabung', island: 'sumatra', province: 'Sumatera Utara', summitM: 2460, baseM: 1600, km: 8, hours: [5, 7], difficulty: 'hard', route: 'Kutarayat', summitName: 'Puncak Sinabung', lat: 3.17, lng: 98.39, nightTempC: 8 },
    { id: 'leuser', name: 'Leuser', island: 'sumatra', province: 'Aceh', summitM: 3466, baseM: 1800, km: 18, hours: [10, 14], difficulty: 'hard', route: 'Kutacane', summitName: 'Puncak Leuser', lat: 3.60, lng: 97.20, nightTempC: 4 },
    { id: 'dempo', name: 'Dempo', island: 'sumatra', province: 'Sumatera Selatan', summitM: 3173, baseM: 1600, km: 9, hours: [5, 8], difficulty: 'moderate', route: 'Pagar Alam', summitName: 'Puncak Dempo', lat: -4.03, lng: 103.25, nightTempC: 6 },
    // ── Bali ──
    { id: 'agung', name: 'Agung', island: 'bali', province: 'Bali', summitM: 3031, baseM: 1700, km: 10, hours: [6, 8], difficulty: 'hard', route: 'Pura Besakih', summitName: 'Puncak Agung', lat: -8.34, lng: 115.51, nightTempC: 6 },
    { id: 'batur', name: 'Batur', island: 'bali', province: 'Bali', summitM: 1717, baseM: 1200, km: 5, hours: [2, 3], difficulty: 'easy', route: 'Toyabungkah', summitName: 'Puncak Batur', lat: -8.24, lng: 115.38, nightTempC: 14 },
    { id: 'batukaru', name: 'Batukaru', island: 'bali', province: 'Bali', summitM: 2276, baseM: 1200, km: 7, hours: [4, 5], difficulty: 'moderate', route: 'Wongaya Gede', summitName: 'Puncak Batukaru', lat: -8.37, lng: 115.10, nightTempC: 10 },
    { id: 'catur', name: 'Catur', island: 'bali', province: 'Bali', summitM: 2096, baseM: 1200, km: 6, hours: [3, 4], difficulty: 'easy', route: 'Pancasari', summitName: 'Puncak Catur', lat: -8.27, lng: 115.17, nightTempC: 11 },
    { id: 'lesung', name: 'Lesung', island: 'bali', province: 'Bali', summitM: 1863, baseM: 1200, km: 5, hours: [3, 4], difficulty: 'easy', route: 'Munduk', summitName: 'Puncak Lesung', lat: -8.28, lng: 115.07, nightTempC: 12 },
    { id: 'adeng', name: 'Adeng', island: 'bali', province: 'Bali', summitM: 1826, baseM: 1200, km: 5, hours: [3, 4], difficulty: 'moderate', route: 'Pancasari', summitName: 'Puncak Adeng', lat: -8.26, lng: 115.16, nightTempC: 12 },
    // ── Nusa Tenggara ──
    { id: 'rinjani', name: 'Rinjani', island: 'nusa-tenggara', province: 'Nusa Tenggara Barat', summitM: 3726, baseM: 1156, km: 11, hours: [7, 9], difficulty: 'hard', route: 'Sembalun', routeSlug: 'rinjani-sembalun', summitName: 'Puncak Rinjani', lat: -8.35, lng: 116.55, nightTempC: 4, stops: [
      { slug: 'pelawangan', name: 'Pelawangan', kinds: ['camp'], elevM: 2639, km: 8, legMin: 360, short: 'Crater rim camp', shortId: 'Kemah di bibir kawah', detail: 'The crater rim camp above the lake. Exposed to wind; carry water up from the last spring.', detailId: 'Kemah di bibir kawah di atas danau. Terbuka terhadap angin; bawa air dari mata air terakhir.' },
      { slug: 'summit', name: 'Puncak Rinjani', kinds: ['summit'], elevM: 3726, km: 11, legMin: 180, short: 'Summit, no camping', shortId: 'Puncak, tidak untuk berkemah', detail: 'The summit at 3,726 m, above the crater lake. No water and no camping. Start before dawn and watch the wind.', detailId: 'Puncak pada 3.726 m, di atas danau kawah. Tidak ada air dan tidak untuk berkemah. Mulai sebelum fajar dan waspadai angin.' },
    ] },
    { id: 'tambora', name: 'Tambora', island: 'nusa-tenggara', province: 'Nusa Tenggara Barat', summitM: 2850, baseM: 1200, km: 12, hours: [8, 10], difficulty: 'hard', route: 'Pancasila', summitName: 'Puncak Tambora', lat: -8.25, lng: 118.00, nightTempC: 7 },
    { id: 'egon', name: 'Egon', island: 'nusa-tenggara', province: 'Nusa Tenggara Timur', summitM: 1703, baseM: 1200, km: 6, hours: [3, 4], difficulty: 'moderate', route: 'Sokoria', summitName: 'Puncak Egon', lat: -8.66, lng: 122.45, nightTempC: 12 },
    { id: 'inerie', name: 'Inerie', island: 'nusa-tenggara', province: 'Nusa Tenggara Timur', summitM: 2245, baseM: 900, km: 7, hours: [4, 6], difficulty: 'hard', route: 'Watukapu', summitName: 'Puncak Inerie', lat: -8.87, lng: 121.00, nightTempC: 10 },
    { id: 'ili-lewotolok', name: 'Ili Lewotolok', island: 'nusa-tenggara', province: 'Nusa Tenggara Timur', summitM: 1423, baseM: 1000, km: 5, hours: [2, 3], difficulty: 'moderate', route: 'Jontona', summitName: 'Puncak Ili Lewotolok', lat: -8.35, lng: 123.12, nightTempC: 14 },
    { id: 'mutis', name: 'Mutis', island: 'nusa-tenggara', province: 'Nusa Tenggara Timur', summitM: 2427, baseM: 1200, km: 8, hours: [5, 7], difficulty: 'moderate', route: 'Fatumnasi', summitName: 'Puncak Mutis', lat: -9.57, lng: 124.22, nightTempC: 8 },
    { id: 'rokatenda', name: 'Rokatenda', island: 'nusa-tenggara', province: 'Nusa Tenggara Timur', summitM: 875, baseM: 400, km: 4, hours: [2, 3], difficulty: 'easy', route: 'Nangapanda', summitName: 'Puncak Rokatenda', lat: -8.85, lng: 121.53, nightTempC: 18 },
    // ── Kalimantan ──
    { id: 'bukit-raya', name: 'Bukit Raya', island: 'kalimantan', province: 'Kalimantan Tengah', category: 'bukit', summitM: 2278, baseM: 500, km: 14, hours: [9, 12], difficulty: 'moderate', route: 'Tumbang Hiang', summitName: 'Puncak Bukit Raya', lat: -0.68, lng: 112.85, nightTempC: 12 },
    { id: 'bukit-baka', name: 'Bukit Baka', island: 'kalimantan', province: 'Kalimantan Barat', category: 'bukit', summitM: 1620, baseM: 300, km: 10, hours: [6, 8], difficulty: 'moderate', route: 'Nanga Baka', summitName: 'Puncak Bukit Baka', lat: -0.70, lng: 112.25, nightTempC: 15 },
    { id: 'liangpran', name: 'Liangpran', island: 'kalimantan', province: 'Kalimantan Barat', category: 'bukit', summitM: 1650, baseM: 400, km: 11, hours: [7, 9], difficulty: 'moderate', route: 'Datah Dian', summitName: 'Puncak Liangpran', lat: 1.05, lng: 113.90, nightTempC: 14 },
    { id: 'halau-halau', name: 'Halau-Halau', island: 'kalimantan', province: 'Kalimantan Timur', category: 'bukit', summitM: 1892, baseM: 300, km: 12, hours: [8, 10], difficulty: 'hard', route: 'Batu Majang', summitName: 'Puncak Halau-Halau', lat: 2.10, lng: 115.30, nightTempC: 13 },
    { id: 'bukit-kelam', name: 'Bukit Kelam', island: 'kalimantan', province: 'Kalimantan Barat', category: 'bukit', summitM: 1002, baseM: 200, km: 5, hours: [3, 4], difficulty: 'easy', route: 'Kelam', summitName: 'Puncak Bukit Kelam', lat: 1.03, lng: 111.65, nightTempC: 18 },
    // ── Sulawesi ──
    { id: 'latimojong', name: 'Latimojong', island: 'sulawesi', province: 'Sulawesi Selatan', summitM: 3478, baseM: 1200, km: 14, hours: [9, 12], difficulty: 'hard', route: 'Buntu Kabobong', summitName: 'Puncak Rantemario', lat: -3.55, lng: 120.10, nightTempC: 5 },
    { id: 'klabat', name: 'Klabat', island: 'sulawesi', province: 'Sulawesi Utara', summitM: 1995, baseM: 700, km: 7, hours: [4, 5], difficulty: 'moderate', route: 'Airmadidi', summitName: 'Puncak Klabat', lat: 1.47, lng: 124.98, nightTempC: 13 },
    { id: 'lokon', name: 'Lokon', island: 'sulawesi', province: 'Sulawesi Utara', summitM: 1580, baseM: 900, km: 5, hours: [3, 4], difficulty: 'moderate', route: 'Tomohon', summitName: 'Puncak Lokon', lat: 1.36, lng: 124.82, nightTempC: 15 },
    { id: 'mahawu', name: 'Mahawu', island: 'sulawesi', province: 'Sulawesi Utara', summitM: 1311, baseM: 900, km: 4, hours: [2, 3], difficulty: 'easy', route: 'Tomohon', summitName: 'Puncak Mahawu', lat: 1.36, lng: 124.86, nightTempC: 16 },
    { id: 'soputan', name: 'Soputan', island: 'sulawesi', province: 'Sulawesi Utara', summitM: 1784, baseM: 1000, km: 7, hours: [4, 5], difficulty: 'hard', route: 'Touure', summitName: 'Puncak Soputan', lat: 1.11, lng: 124.74, nightTempC: 13 },
    { id: 'bawakaraeng', name: 'Bawakaraeng', island: 'sulawesi', province: 'Sulawesi Selatan', summitM: 2830, baseM: 1200, km: 10, hours: [6, 8], difficulty: 'hard', route: 'Malino', summitName: 'Puncak Bawakaraeng', lat: -5.30, lng: 119.85, nightTempC: 8 },
    { id: 'mekongga', name: 'Mekongga', island: 'sulawesi', province: 'Sulawesi Tenggara', summitM: 2620, baseM: 800, km: 13, hours: [8, 11], difficulty: 'hard', route: 'Mekongga', summitName: 'Puncak Mekongga', lat: -3.70, lng: 121.30, nightTempC: 9 },
    // ── Maluku ──
    { id: 'binaiya', name: 'Binaiya', island: 'maluku', province: 'Maluku', summitM: 3027, baseM: 800, km: 12, hours: [8, 10], difficulty: 'hard', route: 'Kamarian', summitName: 'Puncak Binaiya', lat: -3.17, lng: 129.45, nightTempC: 7 },
    { id: 'kapalatmada', name: 'Kapalatmada', island: 'maluku', province: 'Maluku', summitM: 2700, baseM: 500, km: 14, hours: [9, 12], difficulty: 'hard', route: 'Waeapo', summitName: 'Puncak Kapalatmada', lat: -3.30, lng: 128.80, nightTempC: 9 },
    { id: 'duwamoto', name: 'Duwamoto', island: 'maluku', province: 'Maluku', summitM: 1400, baseM: 300, km: 7, hours: [4, 6], difficulty: 'moderate', route: 'Duwamoto', summitName: 'Puncak Duwamoto', lat: -3.00, lng: 128.20, nightTempC: 16 },
    { id: 'salahutu', name: 'Salahutu', island: 'maluku', province: 'Maluku', summitM: 1038, baseM: 200, km: 5, hours: [2, 3], difficulty: 'easy', route: 'Suli', summitName: 'Puncak Salahutu', lat: -3.62, lng: 128.30, nightTempC: 18 },
    { id: 'sapalewa', name: 'Sapalewa', island: 'maluku', province: 'Maluku', summitM: 1500, baseM: 300, km: 8, hours: [5, 7], difficulty: 'moderate', route: 'Sapalewa', summitName: 'Puncak Sapalewa', lat: -3.05, lng: 128.60, nightTempC: 16 },
    // ── Papua ──
    { id: 'puncak-jaya', name: 'Puncak Jaya', island: 'papua', province: 'Papua', summitM: 4884, baseM: 3000, km: 18, hours: [12, 16], difficulty: 'hard', route: 'Freeport', summitName: 'Puncak Jaya', lat: -4.08, lng: 137.18, nightTempC: -5 },
    { id: 'trikora', name: 'Trikora', island: 'papua', province: 'Papua', summitM: 4730, baseM: 2500, km: 14, hours: [10, 13], difficulty: 'hard', route: 'Baliem', summitName: 'Puncak Trikora', lat: -4.15, lng: 138.20, nightTempC: -3 },
    { id: 'mandala', name: 'Mandala', island: 'papua', province: 'Papua', summitM: 4700, baseM: 2500, km: 15, hours: [11, 14], difficulty: 'hard', route: 'Baliem', summitName: 'Puncak Mandala', lat: -4.05, lng: 138.10, nightTempC: -3 },
    { id: 'yamin', name: 'Yamin', island: 'papua', province: 'Papua', summitM: 4595, baseM: 2000, km: 16, hours: [11, 15], difficulty: 'hard', route: 'Baliem', summitName: 'Puncak Yamin', lat: -4.20, lng: 139.00, nightTempC: -2 },
    { id: 'puncak-wijaya', name: 'Puncak Wijaya', island: 'papua', province: 'Papua', summitM: 4680, baseM: 2500, km: 14, hours: [10, 13], difficulty: 'hard', route: 'Baliem', summitName: 'Puncak Wijaya', lat: -4.30, lng: 138.60, nightTempC: -3 },
  ];

  var DESTINATIONS = [GEDE_PANGRANGO].concat(MORE_DEFS.map(buildDestination));

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
      island: d.island,
      province: d.province,
      routeId: route.id,
      routeName: route.name,
      summitName: route.summitName,
      route: route.route,
      summitM: route.summitM,
      lengthKm: route.lengthKm,
      climbM: route.climbM,
      hoursUp: route.hoursUp,
      hoursUpMin: route.hoursUpMin,
      hoursUpMax: route.hoursUpMax,
      difficulty: route.difficulty || null,
      figures: route.figures || null,
      packing: route.packing || null,
      status: route.status || d.status,
      permits: route.permits || d.permits,
      weather: route.weather,
    };
  }

  // The flat row the catalog reads. summitM, difficulty and status come
  // from the destination's first route, the one its page opens.
  function catalogView(destination) {
    var route = destination.routes[0];
    return {
      id: destination.id,
      name: destination.name,
      island: destination.island,
      province: destination.province,
      category: destination.category,
      summitM: route.summitM,
      hoursUpMin: route.hoursUpMin,
      hoursUpMax: route.hoursUpMax,
      difficulty: route.difficulty || null,
      status: route.status || destination.status,
      figures: route.figures || null,
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
    catalogView: catalogView,
    ISLANDS: ISLANDS,
    POPULAR: POPULAR,
    DEFAULT_DESTINATION_ID: DEFAULT_DESTINATION_ID,
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
