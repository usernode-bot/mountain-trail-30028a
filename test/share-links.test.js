const test = require('node:test');
const assert = require('node:assert/strict');
const {
  waNumber,
  smsNumber,
  whatsappUrl,
  smsUrl,
  coordsLine,
  queueWith,
} = require('../public/share-links.js');

test('waNumber turns a local 08 number into the international form', () => {
  assert.equal(waNumber('0812 3456 789'), '628123456789');
});

test('waNumber keeps +62 and 62 numbers as they are', () => {
  assert.equal(waNumber('+62 812-3456-789'), '628123456789');
  assert.equal(waNumber('628123456789'), '628123456789');
});

test('waNumber rejects a name and a too-short number', () => {
  assert.equal(waNumber('Pak Budi'), '');
  assert.equal(waNumber('1234'), '');
});

test('smsNumber keeps a leading + and keeps local numbers as typed', () => {
  assert.equal(smsNumber('+62 812 3456 789'), '+628123456789');
  assert.equal(smsNumber('0812 3456 789'), '08123456789');
  assert.equal(smsNumber('Pak Budi'), '');
});

test('whatsappUrl builds a wa.me link, with and without a number', () => {
  assert.equal(
    whatsappUrl('Hi there', '0812 3456 789'),
    'https://wa.me/628123456789?text=' + encodeURIComponent('Hi there')
  );
  assert.equal(
    whatsappUrl('Hi there', ''),
    'https://wa.me/?text=' + encodeURIComponent('Hi there')
  );
});

test('smsUrl builds an sms: link with the body, with and without a number', () => {
  assert.equal(
    smsUrl('Hi there', '0812 3456 789'),
    'sms:08123456789?&body=' + encodeURIComponent('Hi there')
  );
  assert.equal(
    smsUrl('Hi there', ''),
    'sms:?&body=' + encodeURIComponent('Hi there')
  );
});

test('link text round-trips and keeps the Maps link and 112', () => {
  const text = 'This is Ayu. Map: https://www.google.com/maps?q=-6.76490,106.98700 & nearest stop. Emergency: 112.';
  for (const url of [whatsappUrl(text, '0812 3456 789'), smsUrl(text, '0812 3456 789')]) {
    const body = url.split('body=')[1] || url.split('text=')[1];
    assert.equal(decodeURIComponent(body), text);
    assert.ok(decodeURIComponent(body).indexOf('https://www.google.com/maps?q=-6.76490,106.98700') >= 0);
    assert.ok(decodeURIComponent(body).indexOf('112') >= 0);
  }
});

test('coordsLine matches the message format', () => {
  assert.equal(coordsLine(-6.7649, 106.987), '-6.76490, 106.98700');
});

test('queueWith puts the entry first and cuts to the max', () => {
  const q = [{ text: 'a' }, { text: 'b' }];
  const out = queueWith(q, { text: 'c' }, 5);
  assert.deepEqual(out.map((e) => e.text), ['c', 'a', 'b']);
});

test('queueWith does not add a duplicate of the newest text', () => {
  const q = [{ text: 'a' }, { text: 'b' }];
  const out = queueWith(q, { text: 'a' }, 5);
  assert.deepEqual(out.map((e) => e.text), ['a', 'b']);
});

test('queueWith keeps only the newest max entries and leaves the input alone', () => {
  const q = [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }];
  const out = queueWith(q, { text: '6' }, 5);
  assert.deepEqual(out.map((e) => e.text), ['6', '1', '2', '3', '4']);
  assert.deepEqual(q.map((e) => e.text), ['1', '2', '3', '4', '5']);
});
