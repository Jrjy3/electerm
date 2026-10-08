const { describe, test } = require('node:test')
const assert = require('node:assert/strict')

const { getEffectiveMaterial } = require('../../app/common/window-material.js')

describe('window backdrop material', () => {
  test('uses the chosen material', () => {
    assert.equal(getEffectiveMaterial({ windowBackgroundMaterial: 'mica', opacity: 1, useSystemTitleBar: true }), 'mica')
    assert.equal(getEffectiveMaterial({ windowBackgroundMaterial: 'acrylic', opacity: 0.9, useSystemTitleBar: false }), 'acrylic')
  })

  test('system title bar + opacity < 1 falls back to acrylic', () => {
    assert.equal(getEffectiveMaterial({ windowBackgroundMaterial: 'none', opacity: 0.9, useSystemTitleBar: true }), 'acrylic')
    assert.equal(getEffectiveMaterial({ opacity: 0.9, useSystemTitleBar: true }), 'acrylic')
  })

  test('no fallback when opaque or with the custom (transparent) title bar', () => {
    assert.equal(getEffectiveMaterial({ windowBackgroundMaterial: 'none', opacity: 1, useSystemTitleBar: true }), 'none')
    assert.equal(getEffectiveMaterial({ windowBackgroundMaterial: 'none', opacity: 0.9, useSystemTitleBar: false }), 'none')
  })

  test('unknown values are treated as none', () => {
    assert.equal(getEffectiveMaterial({ windowBackgroundMaterial: 'glass', opacity: 1 }), 'none')
    assert.equal(getEffectiveMaterial(), 'none')
  })
})
