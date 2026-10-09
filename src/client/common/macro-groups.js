/**
 * macro category helpers. Macro groups follow the bookmark group shape:
 * { id, title, macroIds, macroGroupIds, level } where level 2 groups are
 * children of a level 1 group. Every macro belongs to exactly one group,
 * macros without one go to the default group. Manual order is the order
 * of a group's macroIds.
 *
 * All functions are pure and return new arrays/objects.
 */

export const defaultMacroGroupId = 'default'

function newDefaultGroup () {
  return {
    id: defaultMacroGroupId,
    title: 'default',
    macroIds: [],
    macroGroupIds: [],
    level: 1
  }
}

function cloneGroup (g) {
  return {
    ...g,
    macroIds: [...(g.macroIds || [])],
    macroGroupIds: [...(g.macroGroupIds || [])]
  }
}

export function findMacroGroupId (groups, macroId) {
  const g = (groups || []).find(g => (g.macroIds || []).includes(macroId))
  return g ? g.id : ''
}

function findParent (groups, groupId) {
  return groups.find(g => (g.macroGroupIds || []).includes(groupId))
}

/**
 * Drops references to missing macros and groups, makes sure the default
 * group exists, keeps each macro in one group only, and puts macros that
 * are in no group into the default group.
 */
export function fixMacroGroups (macros, groups) {
  const macroIds = new Set((macros || []).map(m => m.id))
  let list = (groups || []).map(cloneGroup)
  if (!list.some(g => g.id === defaultMacroGroupId)) {
    list = [newDefaultGroup(), ...list]
  }
  const groupIds = new Set(list.map(g => g.id))
  const seenMacros = new Set()
  const seenGroups = new Set()
  for (const g of list) {
    g.macroIds = g.macroIds.filter(id => {
      if (!macroIds.has(id) || seenMacros.has(id)) {
        return false
      }
      seenMacros.add(id)
      return true
    })
    g.macroGroupIds = g.macroGroupIds.filter(id => {
      if (!groupIds.has(id) || id === g.id || seenGroups.has(id)) {
        return false
      }
      seenGroups.add(id)
      return true
    })
  }
  const def = list.find(g => g.id === defaultMacroGroupId)
  for (const m of macros || []) {
    if (!seenMacros.has(m.id)) {
      def.macroIds.push(m.id)
    }
  }
  return list
}

/**
 * Category tree for display:
 * [{ group, macros: [macro], children: [{ group, macros, children: [] }] }]
 * Top level groups are the ones no other group lists as a child.
 */
export function buildMacroTree (macros, groups, { sortByName = false } = {}) {
  const fixed = fixMacroGroups(macros, groups)
  const macroMap = new Map((macros || []).map(m => [m.id, m]))
  const groupMap = new Map(fixed.map(g => [g.id, g]))
  const childIds = new Set(fixed.flatMap(g => g.macroGroupIds))
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '')
  const node = (g, depth) => {
    const list = g.macroIds.map(id => macroMap.get(id)).filter(Boolean)
    return {
      group: g,
      macros: sortByName ? list.sort(byName) : list,
      children: depth > 1
        ? []
        : g.macroGroupIds
          .map(id => groupMap.get(id))
          .filter(Boolean)
          .map(c => node(c, depth + 1))
    }
  }
  return fixed
    .filter(g => !childIds.has(g.id))
    .map(g => node(g, 1))
}

export function addMacroGroup (groups, group, parentId) {
  const list = (groups || []).map(cloneGroup)
  // two levels only, like bookmark groups
  const parent = parentId
    ? list.find(g => g.id === parentId && g.level !== 2)
    : null
  list.push({
    macroIds: [],
    macroGroupIds: [],
    ...group,
    level: parent ? 2 : 1
  })
  if (parent) {
    parent.macroGroupIds.push(group.id)
  }
  return list
}

/**
 * Deletes a group. Its macros and child groups move to its parent, or to
 * the default group. The default group can't be deleted.
 */
export function removeMacroGroup (groups, groupId) {
  if (groupId === defaultMacroGroupId) {
    return groups
  }
  let list = (groups || []).map(cloneGroup)
  const target = list.find(g => g.id === groupId)
  if (!target) {
    return groups
  }
  if (!list.some(g => g.id === defaultMacroGroupId)) {
    list = [newDefaultGroup(), ...list]
  }
  const parent = findParent(list, groupId) ||
    list.find(g => g.id === defaultMacroGroupId)
  parent.macroIds = [...parent.macroIds, ...target.macroIds]
  parent.macroGroupIds = [
    ...parent.macroGroupIds.filter(id => id !== groupId),
    ...target.macroGroupIds
  ]
  return list.filter(g => g.id !== groupId)
}

/**
 * Moves a macro into a group. With targetId, it lands before that macro
 * (or after it when `after` is true), otherwise at the end of the group.
 */
export function moveMacro (groups, macroId, toGroupId, targetId, after = false) {
  const list = (groups || []).map(cloneGroup)
  const to = list.find(g => g.id === toGroupId)
  if (!to || macroId === targetId) {
    return groups
  }
  for (const g of list) {
    g.macroIds = g.macroIds.filter(id => id !== macroId)
  }
  let index = targetId ? to.macroIds.indexOf(targetId) : -1
  if (index < 0) {
    index = to.macroIds.length
  } else if (after) {
    index++
  }
  to.macroIds.splice(index, 0, macroId)
  return list
}

export function removeMacroFromGroups (groups, macroId) {
  return (groups || []).map(g => {
    const c = cloneGroup(g)
    c.macroIds = c.macroIds.filter(id => id !== macroId)
    return c
  })
}
