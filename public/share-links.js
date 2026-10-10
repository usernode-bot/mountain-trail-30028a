/*
 * Deep links that hand the ready-made location message to WhatsApp or the
 * phone's messages app. Pure: contact and text in, link out, so the number
 * rules can be unit tested. Nothing here sends anything; the other app does,
 * after the hiker presses send there.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_SHARE = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Digits only; a leading 0 (local prefix) becomes the country code 62 so
  // wa.me can route it. A number already typed with +62 or 62 is used as is.
  function whatsappNumber(contact) {
    var digits = String(contact == null ? '' : contact).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.charAt(0) === '0') return '62' + digits.slice(1);
    return digits;
  }

  // Digits with one leading + kept: SMS dials the number as saved, so a
  // local 08 prefix stays 08.
  function smsNumber(contact) {
    var s = String(contact == null ? '' : contact).trim();
    var plus = s.charAt(0) === '+' ? '+' : '';
    var digits = s.replace(/\D/g, '');
    if (!digits) return '';
    return plus + digits;
  }

  function whatsappLink(contact, text) {
    var n = whatsappNumber(contact);
    if (!n) return null;
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text);
  }

  function smsLink(contact, text) {
    var n = smsNumber(contact);
    if (!n) return null;
    return 'sms:' + n + '?body=' + encodeURIComponent(text);
  }

  return { whatsappNumber: whatsappNumber, smsNumber: smsNumber, whatsappLink: whatsappLink, smsLink: smsLink };
});
