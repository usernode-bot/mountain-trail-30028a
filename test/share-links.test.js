const test = require('node:test');
const assert = require('node:assert/strict');
const { whatsappNumber, smsNumber, whatsappLink, smsLink } = require('../public/share-links.js');

test('a local 08 number becomes 62 for WhatsApp', () => {
  assert.equal(whatsappNumber('0812 3456 7890'), '6281234567890');
});

test('+62 and 62 numbers are used as typed for WhatsApp', () => {
  assert.equal(whatsappNumber('+62 812-3456-7890'), '6281234567890');
  assert.equal(whatsappNumber('62812 3456 7890'), '6281234567890');
});

test('SMS keeps the prefix as saved', () => {
  assert.equal(smsNumber('0812 3456 7890'), '081234567890');
  assert.equal(smsNumber('+62 812 3456 7890'), '+6281234567890');
});

test('the demo contact sanitises both ways', () => {
  assert.equal(whatsappNumber('0800 0000 000 (demo)'), '628000000000');
  assert.equal(smsNumber('0800 0000 000 (demo)'), '08000000000');
});

test('no digits gives an empty number and a null link', () => {
  assert.equal(whatsappNumber('Pak Budi'), '');
  assert.equal(whatsappLink('', 'x'), null);
  assert.equal(whatsappLink('Pak Budi', 'x'), null);
  assert.equal(smsLink('Pak Budi', 'x'), null);
});

test('the text is encoded into the link', () => {
  assert.equal(whatsappLink('0812', 'a b&c?'), 'https://wa.me/62812?text=a%20b%26c%3F');
  assert.equal(smsLink('0812', 'a b&c?'), 'sms:0812?body=a%20b%26c%3F');
});

test('the maps link survives encoding and decodes back unchanged', () => {
  const text = 'Map: https://www.google.com/maps?q=-6.75752,106.99331';
  const link = whatsappLink('0812', text);
  assert.ok(link.startsWith('https://wa.me/62812?text='));
  assert.equal(decodeURIComponent(link.split('?text=')[1]), text);
  const sms = smsLink('0812', text);
  assert.equal(decodeURIComponent(sms.split('?body=')[1]), text);
});
