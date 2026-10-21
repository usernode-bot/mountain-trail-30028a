/*
 * The Map tab's geometry (request #36, phase 1). Pure: a route's stops in,
 * SVG coordinates out, so it can be unit tested and works with no signal.
 * The map is drawn on the phone from the guide's own approximate
 * coordinates in trail-data.js, with no outside map tiles: nothing to
 * download, so it is offline the moment the guide is.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_MAP = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var M_PER_DEG_LAT = 111320;

  /*
   * Fits the stops into a width-wide box, north up, one scale on both axes
   * (a degree of longitude is shortened by cos(latitude)). pad leaves room
   * around the line: { top, right, bottom, left } in px; right is the
   * widest, for the stop names written east of each node. Returns the box
   * height that keeps the scale, each stop's { id, x, y }, and pxPerKm for
   * the scale bar.
   */
  function project(stops, width, pad) {
    pad = pad || { top: 24, right: 24, bottom: 24, left: 24 };
    if (!stops || !stops.length) return { width: width, height: pad.top + pad.bottom, points: [], pxPerKm: 0 };
    var minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    stops.forEach(function (s) {
      if (s.lat < minLat) minLat = s.lat;
      if (s.lat > maxLat) maxLat = s.lat;
      if (s.lng < minLng) minLng = s.lng;
      if (s.lng > maxLng) maxLng = s.lng;
    });
    var midLat = (minLat + maxLat) / 2;
    var mPerDegLng = M_PER_DEG_LAT * Math.cos(midLat * Math.PI / 180);
    var spanX = (maxLng - minLng) * mPerDegLng; // metres
    var spanY = (maxLat - minLat) * M_PER_DEG_LAT;
    var innerW = width - pad.left - pad.right;
    // A single stop, or stops on one meridian, has no width to fit:
    // fall back to 1 px per 10 m so the scale bar still means something.
    var pxPerM = spanX > 0 ? innerW / spanX : 0.1;
    var innerH = spanY * pxPerM;
    var offsetX = pad.left + (innerW - spanX * pxPerM) / 2;
    var points = stops.map(function (s) {
      return {
        id: s.id,
        x: offsetX + (s.lng - minLng) * mPerDegLng * pxPerM,
        y: pad.top + (maxLat - s.lat) * M_PER_DEG_LAT * pxPerM,
      };
    });
    return {
      width: width,
      height: pad.top + innerH + pad.bottom,
      points: points,
      pxPerKm: pxPerM * 1000,
    };
  }

  // The scale bar's length: the largest of 2, 1, 0.5, 0.2 or 0.1 km that
  // fits in maxPx. Returns { km, px }.
  function scaleBar(pxPerKm, maxPx) {
    var steps = [2, 1, 0.5, 0.2, 0.1];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * pxPerKm <= maxPx) return { km: steps[i], px: steps[i] * pxPerKm };
    }
    return { km: 0.1, px: 0.1 * pxPerKm };
  }

  return { project: project, scaleBar: scaleBar };
});
