'use strict';

// Shared validation for a hiker correction POST. Required by server.js and
// by test/correction.test.js, so the tests check the same rules the route
// applies. `routeIds` is the set of real route ids a correction may name;
// null means the note is about the guide in general.
// Returns { clientId, routeId, message } or null.
function parseCorrection(body, routeIds) {
  if (!body || typeof body !== 'object') return null;
  var clientId = body.clientId;
  if (typeof clientId !== 'string' || clientId.length < 1 || clientId.length > 64) return null;
  var routeId = body.routeId;
  if (routeId === undefined || routeId === null) {
    routeId = null;
  } else if (typeof routeId !== 'string' || !routeIds || !routeIds.has(routeId)) {
    return null;
  }
  if (typeof body.message !== 'string') return null;
  var message = body.message.trim();
  if (message.length < 1 || message.length > 500) return null;
  return { clientId: clientId, routeId: routeId, message: message };
}

module.exports = { parseCorrection: parseCorrection };
