#!/usr/bin/env node
/**
 * Unit tests for shared/networkCore.js
 */
import assert from 'node:assert/strict';
import {
  isValidIP,
  getNetworkCIDR,
  isIPInNetwork,
  calculateIPRange,
  filterStaticAvailableIps
} from '../../shared/networkCore.js';

let passed = 0;
function ok(label, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

ok('isValidIP accepts 192.168.1.1', () => {
  assert.equal(isValidIP('192.168.1.1'), true);
});

ok('isValidIP rejects bad octet', () => {
  assert.equal(isValidIP('192.168.1.999'), false);
});

ok('getNetworkCIDR', () => {
  assert.equal(getNetworkCIDR('192.168.1.0', 24), '192.168.1.0/24');
});

ok('isIPInNetwork /24', () => {
  assert.equal(isIPInNetwork('192.168.1.50', '192.168.1.0', 24), true);
  assert.equal(isIPInNetwork('192.168.2.1', '192.168.1.0', 24), false);
});

ok('calculateIPRange /24', () => {
  const r = calculateIPRange('192.168.1.0', 24);
  assert.equal(r.start, '192.168.1.1');
  assert.equal(r.end, '192.168.1.254');
  assert.equal(r.count, 254);
});

ok('filterStaticAvailableIps excludes DHCP', () => {
  const range = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
  const out = filterStaticAvailableIps(range, new Set(['192.168.1.1']), {
    start: '192.168.1.2',
    end: '192.168.1.2'
  });
  assert.deepEqual(out, ['192.168.1.3']);
});

console.log(`\n${passed} network-core tests passed`);
