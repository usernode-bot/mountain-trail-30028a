'use strict';

// Shared validation for a "Report a correction" POST on the guide's
// estimated figures (request #45). Required by server.js and by
// test/correction.test.js, so the tests check the same rules the route
// applies. Returns { clientId, routeId, field, note } or null.
var FIELDS = ['height', 'distance', 'time', 'difficulty', 'other'];
var NOTE_MAX = 300;

function parseCorrection(body, routeIds) {
  if (!body || typeof body !== 'object') return null;
  var clientId = body.clientId;
  if (typeof clientId !== 'string' || clientId.length < 1 || clientId.length > 64) return null;
  // routeId names the route whose figures are wrong. It is null when the
  // hiker reports from the catalog, where the note names the mountain.
  var routeId = body.routeId === undefined ? null : body.routeId;
  if (routeId !== null && (typeof routeId !== 'string' || !routeIds.has(routeId))) return null;
  if (FIELDS.indexOf(body.field) < 0) return null;
  if (typeof body.note !== 'string') return null;
  var note = body.note.trim();
  if (note.length < 1 || note.length > NOTE_MAX) return null;
  return { clientId: clientId, routeId: routeId, field: body.field, note: note };
}

module.exports = { parseCorrection: parseCorrection, CORRECTION_FIELDS: FIELDS, CORRECTION_NOTE_MAX: NOTE_MAX };
