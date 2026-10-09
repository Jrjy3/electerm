/**
 * macro related functions
 */

import {
  settingMap,
  macroSortByNameKey
} from '../common/constants'
import * as ls from '../common/safe-local-storage'
import {
  defaultMacroGroupId,
  fixMacroGroups,
  addMacroGroup,
  removeMacroGroup,
  moveMacro,
  removeMacroFromGroups,
  findMacroGroupId
} from '../common/macro-groups'
import { runMacro } from '../components/terminal/automation/macro-runner'
import { refs } from '../components/common/ref'
import message from '../components/common/message'
import { parseTemplates } from './quick-command'

const e = window.translate

// run handles by tab id, kept out of the reactive store
const runs = new Map()

export default Store => {
  Store.prototype.addMacro = function (macro, groupId = defaultMacroGroupId) {
    const { store } = window
    store.addItem(macro, settingMap.macros)
    store.macroGroups = moveMacro(
      fixMacroGroups(store.macros, store.macroGroups),
      macro.id,
      groupId
    )
  }

  Store.prototype.editMacro = function (id, update, groupId) {
    const { store } = window
    store.editItem(id, update, settingMap.macros)
    if (groupId && groupId !== findMacroGroupId(store.macroGroups, id)) {
      store.macroGroups = moveMacro(
        fixMacroGroups(store.macros, store.macroGroups),
        id,
        groupId
      )
    }
  }

  Store.prototype.delMacro = function ({ id }) {
    const { store } = window
    store.delItem({ id }, settingMap.macros)
    store.macroGroups = removeMacroFromGroups(store.macroGroups, id)
    store.onDelItem({ id }, settingMap.macros)
  }

  Store.prototype.moveMacro = function (macroId, toGroupId, targetId, after) {
    const { store } = window
    store.macroGroups = moveMacro(
      fixMacroGroups(store.macros, store.macroGroups),
      macroId,
      toGroupId,
      targetId,
      after
    )
  }

  Store.prototype.addMacroGroup = function (group, parentId) {
    const { store } = window
    store.macroGroups = addMacroGroup(
      fixMacroGroups(store.macros, store.macroGroups),
      group,
      parentId
    )
  }

  Store.prototype.editMacroGroup = function (id, update) {
    window.store.editItem(id, update, settingMap.macroGroups)
  }

  Store.prototype.delMacroGroup = function ({ id }) {
    const { store } = window
    store.macroGroups = removeMacroGroup(store.macroGroups, id)
  }

  Store.prototype.importMacros = function ({ macros = [], macroGroups = [] }) {
    const { store } = window
    const macroIds = new Set(store.macros.map(m => m.id))
    const groupIds = new Set(store.macroGroups.map(g => g.id))
    const freshMacros = macros.filter(m => m && m.id && !macroIds.has(m.id))
    const freshGroups = macroGroups.filter(g => g && g.id && !groupIds.has(g.id))
    store.macros.push(...freshMacros)
    store.macroGroups = fixMacroGroups(store.macros, [
      ...store.macroGroups,
      ...freshGroups
    ])
    return freshMacros.length
  }

  Store.prototype.setMacroSortByName = function (v) {
    window.store.macroSortByName = v
    ls.setItem(macroSortByNameKey, v ? 'yes' : 'no')
  }

  Store.prototype.openMacros = function () {
    const { store } = window
    store.storeAssign({
      settingTab: settingMap.macros
    })
    store.setSettingItem({ id: '', name: '', steps: [] })
    store.openSettingModal()
  }

  // Runs a macro in one tab. The tab is fixed when the macro starts, so
  // later steps don't follow the user to another tab (same as #4587 for
  // quick commands).
  Store.prototype.runMacro = function (macro, tabId) {
    const { store } = window
    const tid = tabId || store.activeTabId
    const getTerm = () => refs.get('term-' + tid)
    if (!macro || !getTerm()?.attachAddon) {
      return message.warning(e('macroNoTerminal'))
    }
    if (runs.has(tid)) {
      return message.warning(e('macroAlreadyRunning'))
    }
    const steps = macro.steps || []
    const setRunning = (info) => {
      const next = { ...store.runningMacros }
      if (info) {
        next[tid] = info
      } else {
        delete next[tid]
      }
      store.runningMacros = next
    }
    const run = runMacro(steps, {
      send: data => getTerm()?.attachAddon?._sendData(data),
      isAlive: () => !!getTerm()?.attachAddon,
      resolveText: parseTemplates,
      getKeyOptions: () => ({
        applicationCursor: !!getTerm()?.term?.modes?.applicationCursorKeysMode
      }),
      onStep: index => {
        setRunning({
          macroId: macro.id,
          name: macro.name,
          index,
          total: steps.length
        })
      }
    })
    runs.set(tid, run)
    setRunning({
      macroId: macro.id,
      name: macro.name,
      index: 0,
      total: steps.length
    })
    getTerm()?.term?.focus()
    return run.done.then(result => {
      runs.delete(tid)
      setRunning(null)
      if (result.status === 'error') {
        store.onError(result.error)
      }
      return result
    })
  }

  Store.prototype.stopMacro = function (tabId) {
    const tid = tabId || window.store.activeTabId
    runs.get(tid)?.stop()
  }
}
