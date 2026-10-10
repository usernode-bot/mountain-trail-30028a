/*
 * Send the location message through WhatsApp or SMS, and keep a waiting
 * queue for messages tapped with no signal. Pure string and array rules,
 * so they can be unit tested; app.js wires them to the Location tab.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_SHARE = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // The digits a contact is worth: 8 to 15 of them, or it is a name or
  // not a number.
  function digitsOf(contact) {
    var digits = String(contact == null ? '' : contact).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return '';
    return digits;
  }

  // wa.me needs the international form: a local 0812… becomes 62812….
  function waNumber(contact) {
    var digits = digitsOf(contact);
    if (!digits) return '';
    if (digits.charAt(0) === '0') return '62' + digits.slice(1);
    return digits;
  }

  // SMS dials the number as the phone knows it: keep a leading +, keep a
  // local 08… as typed.
  function smsNumber(contact) {
    var raw = String(contact == null ? '' : contact).trim();
    var digits = digitsOf(raw);
    if (!digits) return '';
    return raw.charAt(0) === '+' ? '+' + digits : digits;
  }

  function whatsappUrl(text, contact) {
    var n = waNumber(contact);
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text);
  }

  // The "?&body=" form opens the body on both iOS and Android.
  function smsUrl(text, contact) {
    var n = smsNumber(contact);
    return 'sms:' + n + '?&body=' + encodeURIComponent(text);
  }

  // Just the coordinates, ready to read out over radio.
  function coordsLine(lat, lng) {
    return lat.toFixed(5) + ', ' + lng.toFixed(5);
  }

  // Newest first, no duplicate of the newest text, cut to max.
  function queueWith(queue, entry, max) {
    var q = queue.slice();
    if (!q.length || q[0].text !== entry.text) q.unshift(entry);
    return q.slice(0, max);
  }

  return {
    waNumber: waNumber,
    smsNumber: smsNumber,
    whatsappUrl: whatsappUrl,
    smsUrl: smsUrl,
    coordsLine: coordsLine,
    queueWith: queueWith,
  };
});
