/**
 * macro list for the settings panel (left col): macros by category.
 * Categories follow bookmark groups, two levels deep. Drag a macro to
 * reorder it or onto a category to move it there.
 */
import { useState } from 'react'
import { auto } from 'manate/react'
import { Button, Input, Popconfirm, Space } from 'antd'
import {
  PlusOutlined,
  CopyOutlined,
  CloseOutlined,
  EditOutlined,
  FolderAddOutlined,
  SortAscendingOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  FolderOutlined
} from '@ant-design/icons'
import classnames from 'classnames'
import deepCopy from 'json-deep-copy'
import Search from '../common/search'
import highlight from '../common/highlight'
import uid from '../../common/uid'
import {
  buildMacroTree,
  defaultMacroGroupId,
  findMacroGroupId
} from '../../common/macro-groups'
import { isDropAfterHalf, setDropIndicator, clearDropIndicator } from '../../common/drop-position'
import MacroTransport from './macro-transport'
import t from './macro-text'

const e = window.translate

function matches (macro, k) {
  if ((macro.name || '').toLowerCase().includes(k)) {
    return true
  }
  return (macro.steps || []).some(s => String(s.value || '').toLowerCase().includes(k))
}

function filterTree (nodes, k) {
  if (!k) {
    return nodes
  }
  return nodes.map(n => {
    const children = filterTree(n.children, k)
    const macros = n.macros.filter(m => matches(m, k))
    return { ...n, macros, children }
  }).filter(n => n.macros.length || n.children.length)
}

export default auto(function MacroList (props) {
  const { store, activeItemId, onClickItem } = props
  const [keyword, setKeyword] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [renaming, setRenaming] = useState('')
  const [renameValue, setRenameValue] = useState('')

  const k = keyword.trim().toLowerCase()
  const tree = filterTree(
    buildMacroTree(store.macros, store.macroGroups, {
      sortByName: store.macroSortByName
    }),
    k
  )

  function toggle (id) {
    const next = new Set(collapsed)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setCollapsed(next)
  }

  function startRename (group) {
    setRenaming(group.id)
    setRenameValue(group.title || '')
  }

  function finishRename () {
    const title = renameValue.trim()
    if (renaming && title) {
      store.editMacroGroup(renaming, { title })
    }
    setRenaming('')
  }

  function addGroup (parentId) {
    const id = uid()
    const title = t('newCategory', 'New category')
    store.addMacroGroup({ id, title }, parentId)
    if (parentId) {
      const next = new Set(collapsed)
      next.delete(parentId)
      setCollapsed(next)
    }
    setRenaming(id)
    setRenameValue(title)
  }

  function duplicate (ev, macro) {
    ev.stopPropagation()
    const copy = deepCopy(macro)
    copy.id = uid()
    copy.name = (macro.name || '') + ' (copy)'
    store.addMacro(copy, findMacroGroupId(store.macroGroups, macro.id) || defaultMacroGroupId)
  }

  function onDragStart (ev, macro) {
    ev.dataTransfer.setData('macroId', macro.id)
    ev.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver (ev, isGroup) {
    ev.preventDefault()
    const el = ev.currentTarget
    if (isGroup) {
      el.classList.add('macro-drop-into')
    } else {
      setDropIndicator(el, isDropAfterHalf(ev, el))
    }
  }

  function onDragLeave (ev) {
    ev.currentTarget.classList.remove('macro-drop-into')
    clearDropIndicator(ev.currentTarget)
  }

  function onDrop (ev, groupId, target) {
    ev.preventDefault()
    const el = ev.currentTarget
    const after = target ? isDropAfterHalf(ev, el) : false
    el.classList.remove('macro-drop-into')
    clearDropIndicator(el)
    const macroId = ev.dataTransfer.getData('macroId')
    if (macroId) {
      store.moveMacro(macroId, groupId, target?.id, after)
    }
  }

  function renderMacro (macro, groupId, depth) {
    const cls = classnames('item-list-unit macro-item', {
      active: activeItemId === macro.id
    })
    const name = macro.name || e('new')
    return (
      <div
        key={macro.id}
        className={cls}
        style={{ paddingLeft: depth * 16 }}
        onClick={() => onClickItem(macro)}
        draggable
        onDragStart={ev => onDragStart(ev, macro)}
        onDragOver={ev => onDragOver(ev, false)}
        onDragLeave={onDragLeave}
        onDrop={ev => onDrop(ev, groupId, macro)}
      >
        <div className='elli pd1y pd2x list-item-title' title={name}>
          {highlight(name, keyword)}
        </div>
        <CopyOutlined
          title={e('duplicate')}
          className='pointer list-item-duplicate'
          onClick={ev => duplicate(ev, macro)}
        />
        <Popconfirm
          title={e('del') + '?'}
          onConfirm={() => store.delMacro(macro)}
          okText={e('del')}
          cancelText={e('cancel')}
        >
          <CloseOutlined
            title={e('del')}
            className='pointer list-item-remove'
            onClick={ev => ev.stopPropagation()}
          />
        </Popconfirm>
      </div>
    )
  }

  function renderGroupTitle (group) {
    if (renaming === group.id) {
      return (
        <Input
          size='small'
          autoFocus
          value={renameValue}
          onChange={ev => setRenameValue(ev.target.value)}
          onPressEnter={finishRename}
          onBlur={finishRename}
          onClick={ev => ev.stopPropagation()}
        />
      )
    }
    const title = group.id === defaultMacroGroupId
      ? e('default')
      : group.title
    return <span className='elli'>{title}</span>
  }

  function renderGroup (node, depth = 0) {
    const { group } = node
    const isOpen = k || !collapsed.has(group.id)
    const Caret = isOpen ? CaretDownOutlined : CaretRightOutlined
    const canDel = group.id !== defaultMacroGroupId
    return (
      <div key={group.id} className='macro-group'>
        <div
          className='item-list-unit macro-group-title'
          style={{ paddingLeft: depth * 16 }}
          onClick={() => toggle(group.id)}
          onDragOver={ev => onDragOver(ev, true)}
          onDragLeave={onDragLeave}
          onDrop={ev => onDrop(ev, group.id)}
        >
          <div className='pd1y pd1x list-item-title macro-group-label'>
            <Caret className='mg1r' />
            <FolderOutlined className='mg1r' />
            {renderGroupTitle(group)}
            <span className='mg1l macro-count'>{node.macros.length}</span>
          </div>
          <span className='macro-group-ops'>
            {
              depth === 0
                ? (
                  <FolderAddOutlined
                    title={t('addSubCategory', 'Add subcategory')}
                    className='pointer'
                    onClick={ev => {
                      ev.stopPropagation()
                      addGroup(group.id)
                    }}
                  />
                  )
                : null
            }
            {
              canDel
                ? (
                  <EditOutlined
                    title={e('rename')}
                    className='pointer'
                    onClick={ev => {
                      ev.stopPropagation()
                      startRename(group)
                    }}
                  />
                  )
                : null
            }
            {
              canDel
                ? (
                  <Popconfirm
                    title={e('del') + '?'}
                    onConfirm={() => store.delMacroGroup(group)}
                    okText={e('del')}
                    cancelText={e('cancel')}
                  >
                    <CloseOutlined
                      title={e('del')}
                      className='pointer'
                      onClick={ev => ev.stopPropagation()}
                    />
                  </Popconfirm>
                  )
                : null
            }
          </span>
        </div>
        {
          isOpen
            ? (
              <>
                {node.children.map(c => renderGroup(c, depth + 1))}
                {node.macros.map(m => renderMacro(m, group.id, depth + 1))}
              </>
              )
            : null
        }
      </div>
    )
  }

  const newCls = classnames('item-list-unit', {
    active: !activeItemId
  })
  return (
    <div className='item-list item-type-macros'>
      <div className='pd1b macro-list-toolbar'>
        <Space.Compact>
          <Button
            icon={<FolderAddOutlined />}
            title={t('addCategory', 'Add category')}
            onClick={() => addGroup()}
          />
          <Button
            icon={<SortAscendingOutlined />}
            title={t('sortByName', 'Sort by name')}
            type={store.macroSortByName ? 'primary' : 'default'}
            onClick={() => store.setMacroSortByName(!store.macroSortByName)}
          />
        </Space.Compact>
        <MacroTransport store={store} />
      </div>
      <div className='pd1y'>
        <Search
          onChange={ev => setKeyword(ev.target.value)}
          value={keyword}
        />
      </div>
      <div className='item-list-wrap'>
        <div
          className={newCls}
          onClick={() => onClickItem({ id: '', name: '', steps: [] })}
        >
          <div className='elli pd1y pd2x'>
            <PlusOutlined className='mg1r' />
            {t('newMacro', 'New macro')}
          </div>
        </div>
        {tree.map(n => renderGroup(n))}
      </div>
    </div>
  )
})
