/*
 * Mountain Trail's catalog of Indonesia's climbable mountains. Ships with
 * the app so every guide page works with no signal; server.js requires this
 * same file to validate corrections. Heights, distances and times are
 * approximate guide figures, not a survey — climbers can propose
 * corrections, and approved ones are merged over these values at render.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_CATALOG = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // The island groups, west to east. A section renders only when it has
  // entries, so the catalog can grow island by island.
  var ISLANDS = [
    { id: 'sumatra', name: 'Sumatra' },
    { id: 'java', name: 'Java' },
    { id: 'bali-nusa-tenggara', name: 'Bali and Nusa Tenggara' },
    { id: 'kalimantan', name: 'Kalimantan' },
    { id: 'sulawesi', name: 'Sulawesi' },
    { id: 'maluku', name: 'Maluku' },
    { id: 'papua', name: 'Papua' },
  ];

  // Difficulty is a guide scale (no official grading scheme), like the
  // guide's own "5 to 7 hours up". Duration is the climbers' own split:
  // tektok (up and down without a night) or menginap (overnight).
  var DIFFICULTIES = [
    { id: 'easy', label: 'Easy' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'hard', label: 'Hard' },
  ];
  var DURATIONS = [
    { id: 'day-hike', label: 'Day hike', local: 'tektok' },
    { id: 'overnight', label: 'Overnight', local: 'menginap' },
  ];
  var STATUSES = [
    { id: 'open', label: 'Open' },
    { id: 'closed', label: 'Closed' },
  ];

  // The first batch: the popular mountains the request names. `guide` names
  // the mountain whose stop-by-stop trail guide ships in trail-data.js;
  // the others are facts and routes for now, and their trail lines arrive
  // mountain by mountain.
  var MOUNTAINS = [
    {
      id: 'semeru',
      name: 'Semeru',
      island: 'java',
      province: 'East Java',
      elevM: 3676,
      difficulty: 'hard',
      duration: 'overnight',
      status: 'open',
      statusNote: '',
      permit: 'SIMAKSI, booked online (Tengger Semeru National Park)',
      basecamp: 'Ranu Pani',
      routes: [
        { name: 'Ranu Pani to Mahameru', km: 13, climbM: 1400, hoursUp: '8 to 10', note: 'Sleep at Ranu Kumbolo or Kalimati; the summit climb starts before dawn.' },
      ],
      guide: null,
    },
    {
      id: 'rinjani',
      name: 'Rinjani',
      island: 'bali-nusa-tenggara',
      province: 'West Nusa Tenggara',
      elevM: 3726,
      difficulty: 'hard',
      duration: 'overnight',
      status: 'open',
      statusNote: 'The park usually closes the route in the rainy season, January to March.',
      permit: 'Register with Rinjani National Park (TNGR)',
      basecamp: 'Sembalun',
      routes: [
        { name: 'Sembalun to the summit', km: 8, climbM: 2100, hoursUp: '8 to 10', note: 'The senior route; Senaru is the gentler way onto the crater rim.' },
      ],
      guide: null,
    },
    {
      id: 'kerinci',
      name: 'Kerinci',
      island: 'sumatra',
      province: 'Jambi',
      elevM: 3805,
      difficulty: 'moderate',
      duration: 'overnight',
      status: 'open',
      statusNote: '',
      permit: 'Register with Kerinci Seblat National Park (TNGS)',
      basecamp: 'Kersik Tua',
      routes: [
        { name: 'Kersik Tua to the summit', km: 11, climbM: 2300, hoursUp: '7 to 9', note: 'Sumatra\'s highest point, a long forest walk to an open crater rim.' },
      ],
      guide: null,
    },
    {
      id: 'merbabu',
      name: 'Merbabu',
      island: 'java',
      province: 'Central Java',
      elevM: 3145,
      difficulty: 'moderate',
      duration: 'overnight',
      status: 'open',
      statusNote: '',
      permit: 'SIMAKSI, booked online (Merbabu National Park)',
      basecamp: 'Selo',
      routes: [
        { name: 'Selo to the summit', km: 5, climbM: 1300, hoursUp: '4 to 6', note: 'The shortest of the three routes, up the grassy east face.' },
      ],
      guide: null,
    },
    {
      id: 'gede-pangrango',
      name: 'Gede Pangrango',
      island: 'java',
      province: 'West Java',
      elevM: 2958,
      difficulty: 'moderate',
      duration: 'overnight',
      status: 'open',
      statusNote: '',
      permit: 'SIMAKSI, booked online (Gede Pangrango National Park)',
      basecamp: 'Cibodas gate',
      routes: [
        { name: 'Cibodas to Puncak Gede', km: 9.6, climbM: 1683, hoursUp: '5 to 7', note: 'Register and show your permit at the gate. The route in trail-data.js.' },
      ],
      guide: 'trail-data',
    },
    {
      id: 'prau',
      name: 'Prau',
      island: 'java',
      province: 'Central Java',
      elevM: 2565,
      difficulty: 'easy',
      duration: 'day-hike',
      status: 'open',
      statusNote: '',
      permit: 'Register at the basecamp post (Dieng)',
      basecamp: 'Dieng (Patak Banteng)',
      routes: [
        { name: 'Patak Banteng to the summit', km: 4.5, climbM: 500, hoursUp: '3 to 4', note: 'The tektok classic: up for sunrise on the golden summit meadow, down by lunch.' },
      ],
      guide: null,
    },
  ];

  // What a climber may propose a correction to, and what the approved
  // overlay may change. Route lists are deliberately out: the overlay stays
  // flat, one field per row.
  var EDITABLE_FIELDS = ['elevM', 'difficulty', 'duration', 'status', 'permit', 'basecamp', 'note'];

  var MOUNTAIN_BY_ID = {};
  MOUNTAINS.forEach(function (m) { MOUNTAIN_BY_ID[m.id] = m; });

  function islandName(id) {
    for (var i = 0; i < ISLANDS.length; i++) {
      if (ISLANDS[i].id === id) return ISLANDS[i].name;
    }
    return id;
  }

  function diffLabel(id) {
    for (var i = 0; i < DIFFICULTIES.length; i++) {
      if (DIFFICULTIES[i].id === id) return DIFFICULTIES[i].label;
    }
    return id;
  }

  function durLabel(id) {
    for (var i = 0; i < DURATIONS.length; i++) {
      if (DURATIONS[i].id === id) return DURATIONS[i].label;
    }
    return id;
  }

  function statusLabel(id) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].id === id) return STATUSES[i].label;
    }
    return id;
  }

  return {
    ISLANDS: ISLANDS,
    DIFFICULTIES: DIFFICULTIES,
    DURATIONS: DURATIONS,
    STATUSES: STATUSES,
    MOUNTAINS: MOUNTAINS,
    MOUNTAIN_BY_ID: MOUNTAIN_BY_ID,
    EDITABLE_FIELDS: EDITABLE_FIELDS,
    islandName: islandName,
    diffLabel: diffLabel,
    durLabel: durLabel,
    statusLabel: statusLabel,
  };
});
