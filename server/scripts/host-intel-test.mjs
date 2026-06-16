#!/usr/bin/env node
import assert from 'node:assert/strict';
import { lookupVendor, normalizeMac } from '../../shared/ouiLookup.js';
import { classifyDevice } from '../../shared/deviceClassifier.js';
import { enrichHostIntel } from '../../shared/hostIntel.js';
import { suggestHostName } from '../../shared/suggestHostName.js';

let passed = 0;
function ok(label, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

ok('normalizeMac formats address', () => {
  assert.equal(normalizeMac('aa:bb:cc:dd:ee:ff'), 'AA:BB:CC:DD:EE:FF');
});

ok('lookupVendor finds Apple OUI', () => {
  assert.equal(lookupVendor('00:03:93:12:34:56'), 'Apple');
});

ok('classifyDevice detects Windows', () => {
  assert.equal(classifyDevice({ openPorts: [445, 135, 3389] }), 'windows');
});

ok('classifyDevice uses vendor hint', () => {
  assert.equal(classifyDevice({ openPorts: [], vendor: 'TP-Link' }), 'network');
});

ok('classifyDevice maps web ports to server', () => {
  assert.equal(classifyDevice({ openPorts: [80, 443] }), 'server');
});

ok('suggestHostName prefers vendor', () => {
  assert.equal(suggestHostName({ ip: '192.168.1.50', vendor: 'Samsung' }), 'Samsung');
});

ok('enrichHostIntel combines MAC lookup and category', () => {
  const intel = enrichHostIntel({ mac: '001E58AABBCC', openPorts: [80, 443] });
  assert.equal(intel.vendor, 'Samsung');
  assert.ok(intel.deviceCategory);
});

console.log(`\n${passed} host-intel tests passed`);
