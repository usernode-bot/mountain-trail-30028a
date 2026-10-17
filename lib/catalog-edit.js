'use strict';

/*
 * Shared validation for a mountain-correction POST, required by server.js
 * and by test/catalog-edit.test.js so the tests check exactly the rules the
 * route applies. The catalog comes in as an argument (the same MT_CATALOG
 * module the browser loads). Returns
 * { clientId, mountainId, field, value, note } or null.
 */
function parseCatalogEdit(body, catalog) {
  if (!body || typeof body !== 'object') return null;
  var clientId = body.clientId;
  if (typeof clientId !== 'string' || clientId.length < 1 || clientId.length > 64) return null;
  if (!catalog || !catalog.MOUNTAIN_BY_ID || !catalog.EDITABLE_FIELDS) return null;
  var mountainId = body.mountainId;
  if (typeof mountainId !== 'string' || !catalog.MOUNTAIN_BY_ID[mountainId]) return null;
  var field = body.field;
  if (catalog.EDITABLE_FIELDS.indexOf(field) < 0) return null;
  var value = typeof body.value === 'string' ? body.value.trim() : '';
  if (!value || value.length > 300) return null;
  // Per-field rules: enums must be members, elevation must parse into the
  // range of Indonesian peaks, free text is taken as written.
  if (field === 'elevM') {
    var n = Number(value.replace(/[,\s]/g, ''));
    if (!isFinite(n) || n < 1000 || n > 5000) return null;
    value = String(Math.round(n));
  } else if (field === 'difficulty') {
    if (!catalog.DIFFICULTIES.some(function (d) { return d.id === value; })) return null;
  } else if (field === 'duration') {
    if (!catalog.DURATIONS.some(function (d) { return d.id === value; })) return null;
  } else if (field === 'status') {
    if (!catalog.STATUSES.some(function (s) { return s.id === value; })) return null;
  }
  var note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';
  return { clientId: clientId, mountainId: mountainId, field: field, value: value, note: note };
}

module.exports = { parseCatalogEdit: parseCatalogEdit };
