const { describe, test } = require('node:test')
const assert = require('node:assert/strict')

const load = () => import('../../client/common/macro-groups.js')

const macros = [
  { id: 'a', name: 'b-login' },
  { id: 'b', name: 'a-save' },
  { id: 'c', name: 'c-show' }
]

const group = (id, macroIds = [], macroGroupIds = [], level = 1) => ({
  id, title: id, macroIds, macroGroupIds, level
})

describe('macro groups', () => {
  test('fix adds the default group and puts loose macros in it', async () => {
    const { fixMacroGroups } = await load()
    const groups = fixMacroGroups(macros, [group('g1', ['b'])])
    const def = groups.find(g => g.id === 'default')
    assert.deepEqual(def.macroIds, ['a', 'c'])
    assert.deepEqual(groups.find(g => g.id === 'g1').macroIds, ['b'])
  })

  test('fix drops missing ids and keeps each macro in one group', async () => {
    const { fixMacroGroups } = await load()
    const groups = fixMacroGroups(macros, [
      group('default', ['a', 'x']),
      group('g1', ['a', 'b'], ['nope', 'g1'])
    ])
    assert.deepEqual(groups.find(g => g.id === 'default').macroIds, ['a', 'c'])
    const g1 = groups.find(g => g.id === 'g1')
    assert.deepEqual(g1.macroIds, ['b'])
    assert.deepEqual(g1.macroGroupIds, [])
  })

  test('fix does not change its input', async () => {
    const { fixMacroGroups } = await load()
    const input = [group('g1', ['b', 'x'])]
    fixMacroGroups(macros, input)
    assert.deepEqual(input, [group('g1', ['b', 'x'])])
  })

  test('tree nests level 2 groups and keeps manual order', async () => {
    const { buildMacroTree } = await load()
    const tree = buildMacroTree(macros, [
      group('default', ['c', 'a']),
      group('g1', [], ['g2']),
      group('g2', ['b'], [], 2)
    ])
    assert.deepEqual(tree.map(n => n.group.id), ['default', 'g1'])
    assert.deepEqual(tree[0].macros.map(m => m.id), ['c', 'a'])
    assert.equal(tree[1].children[0].group.id, 'g2')
    assert.deepEqual(tree[1].children[0].macros.map(m => m.id), ['b'])
  })

  test('tree sorts by name when asked', async () => {
    const { buildMacroTree } = await load()
    const tree = buildMacroTree(macros, [], { sortByName: true })
    assert.deepEqual(tree[0].macros.map(m => m.name), ['a-save', 'b-login', 'c-show'])
  })

  test('add group nests two levels only', async () => {
    const { addMacroGroup } = await load()
    let groups = addMacroGroup([group('default')], { id: 'g1', title: 'g1' })
    groups = addMacroGroup(groups, { id: 'g2', title: 'g2' }, 'g1')
    groups = addMacroGroup(groups, { id: 'g3', title: 'g3' }, 'g2')
    const byId = id => groups.find(g => g.id === id)
    assert.equal(byId('g1').level, 1)
    assert.equal(byId('g2').level, 2)
    assert.deepEqual(byId('g1').macroGroupIds, ['g2'])
    // a level 2 group can't have children, so g3 goes to the top level
    assert.equal(byId('g3').level, 1)
    assert.deepEqual(byId('g2').macroGroupIds, [])
  })

  test('remove group moves its macros and children to the parent', async () => {
    const { removeMacroGroup } = await load()
    const groups = removeMacroGroup([
      group('default', ['a']),
      group('g1', ['b'], ['g2']),
      group('g2', ['c'], [], 2)
    ], 'g2')
    assert.deepEqual(groups.map(g => g.id), ['default', 'g1'])
    assert.deepEqual(groups[1].macroIds, ['b', 'c'])
    assert.deepEqual(groups[1].macroGroupIds, [])
  })

  test('remove top group moves its content to default', async () => {
    const { removeMacroGroup } = await load()
    const groups = removeMacroGroup([
      group('default', ['a']),
      group('g1', ['b'], ['g2']),
      group('g2', ['c'], [], 2)
    ], 'g1')
    const def = groups.find(g => g.id === 'default')
    assert.deepEqual(def.macroIds, ['a', 'b'])
    assert.deepEqual(def.macroGroupIds, ['g2'])
  })

  test('default group can not be removed', async () => {
    const { removeMacroGroup } = await load()
    const input = [group('default', ['a'])]
    assert.equal(removeMacroGroup(input, 'default'), input)
  })

  test('move macro before, after, and to the end of a group', async () => {
    const { moveMacro } = await load()
    const base = [group('default', ['a', 'b']), group('g1', ['c'])]
    let groups = moveMacro(base, 'a', 'g1', 'c')
    assert.deepEqual(groups[0].macroIds, ['b'])
    assert.deepEqual(groups[1].macroIds, ['a', 'c'])
    groups = moveMacro(base, 'a', 'g1', 'c', true)
    assert.deepEqual(groups[1].macroIds, ['c', 'a'])
    groups = moveMacro(base, 'b', 'default', 'a')
    assert.deepEqual(groups[0].macroIds, ['b', 'a'])
    groups = moveMacro(base, 'a', 'g1')
    assert.deepEqual(groups[1].macroIds, ['c', 'a'])
  })

  test('find group id and remove macro from groups', async () => {
    const { findMacroGroupId, removeMacroFromGroups } = await load()
    const groups = [group('default', ['a']), group('g1', ['b'])]
    assert.equal(findMacroGroupId(groups, 'b'), 'g1')
    assert.equal(findMacroGroupId(groups, 'zz'), '')
    assert.deepEqual(removeMacroFromGroups(groups, 'b')[1].macroIds, [])
  })
})
