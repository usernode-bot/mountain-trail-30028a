'use strict';

// Shared validation for a hiker location POST. Required by server.js and by
// test/location.test.js, so the tests check the same rules the route applies.
// Returns { clientId, lat, lng, accuracy, takenAt } or null.
function parseLocation(body, now) {
  if (!body || typeof body !== 'object') return null;
  var clientId = body.clientId;
  if (typeof clientId !== 'string' || clientId.length < 1 || clientId.length > 64) return null;
  if (typeof body.lat !== 'number' || !Number.isFinite(body.lat) || body.lat < -90 || body.lat > 90) return null;
  if (typeof body.lng !== 'number' || !Number.isFinite(body.lng) || body.lng < -180 || body.lng > 180) return null;
  var accuracy = null;
  if (body.accuracy !== undefined && body.accuracy !== null) {
    if (typeof body.accuracy !== 'number' || !Number.isFinite(body.accuracy) ||
        body.accuracy < 0 || body.accuracy > 100000) return null;
    accuracy = body.accuracy;
  }
  var at = new Date(typeof body.at === 'string' ? body.at : '');
  if (isNaN(at.getTime())) return null;
  // `at` is when the position was read on the phone. It can be days old after
  // an offline replay, but never in the future by more than a small clock-skew
  // margin, and never older than the guide's own memory.
  if (at.getTime() > now.getTime() + 10 * 60000) return null;
  if (at.getTime() < now.getTime() - 30 * 86400000) return null;
  return { clientId: clientId, lat: body.lat, lng: body.lng, accuracy: accuracy, takenAt: at };
}

module.exports = { parseLocation: parseLocation };
