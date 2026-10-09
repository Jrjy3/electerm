/**
 * macro edit form (settings right col)
 */
import { useEffect } from 'react'
import { auto } from 'manate/react'
import { Button, Form, Select } from 'antd'
import { CaretRightOutlined } from '@ant-design/icons'
import deepCopy from 'json-deep-copy'
import InputAutoFocus from '../common/input-auto-focus'
import HelpIcon from '../common/help-icon'
import message from '../common/message'
import uid from '../../common/uid'
import templates from '../quick-commands/templates'
import {
  buildMacroTree,
  defaultMacroGroupId,
  findMacroGroupId
} from '../../common/macro-groups'
import MacroStepsEditor, { newStep } from './macro-steps-editor'
import t from './macro-text'

const FormItem = Form.Item
const e = window.translate

function groupOptions (store) {
  const tree = buildMacroTree(store.macros, store.macroGroups)
  const opts = []
  const walk = (nodes, depth) => {
    for (const n of nodes) {
      const title = n.group.id === defaultMacroGroupId
        ? e('default')
        : n.group.title
      opts.push({
        value: n.group.id,
        label: (depth ? '    ' : '') + title
      })
      walk(n.children, depth + 1)
    }
  }
  walk(tree, 0)
  return opts
}

function cleanSteps (steps) {
  return (steps || []).filter(Boolean).map(s => {
    const sleep = Math.max(0, Math.floor(Number(s.sleep) || 0))
    if (s.type === 'key') {
      return {
        id: s.id || uid(),
        type: 'key',
        value: s.value || 'Enter',
        repeat: Math.max(1, Math.floor(Number(s.repeat) || 1)),
        sleep
      }
    }
    return {
      id: s.id || uid(),
      type: s.type || 'text',
      value: s.value || '',
      enter: !!s.enter,
      sleep
    }
  })
}

export default auto(function MacroForm (props) {
  const [form] = Form.useForm()
  const { store, formData } = props
  // the macro's category right now; it changes under the open form when the
  // macro is dragged to another category or its category is deleted
  const liveGroupId = findMacroGroupId(store.macroGroups, formData.id) || defaultMacroGroupId
  useEffect(() => {
    if (formData.id) {
      form.setFieldValue('groupId', liveGroupId)
    }
  }, [liveGroupId])
  const initialValues = {
    name: formData.name || '',
    groupId: liveGroupId,
    steps: formData.steps && formData.steps.length
      ? deepCopy(formData.steps)
      : [newStep()]
  }

  function buildMacro () {
    return {
      id: formData.id,
      name: form.getFieldValue('name') || '',
      steps: cleanSteps(form.getFieldValue('steps'))
    }
  }

  async function handleSubmit () {
    const { name, groupId } = await form.validateFields()
    const { steps } = buildMacro()
    if (formData.id) {
      // move only when the picker was changed, so a stale value never undoes
      // a drag done while the form was open
      store.editMacro(
        formData.id,
        { name, steps },
        groupId !== liveGroupId ? groupId : undefined
      )
      message.success(e('saved'))
      return
    }
    const macro = { id: uid(), name, steps }
    store.addMacro(macro, groupId)
    message.success(e('saved'))
    store.setSettingItem(deepCopy(macro))
  }

  function handleRun () {
    // close settings so the terminal output is visible while it runs
    store.hideSettingModal()
    store.runMacro(buildMacro())
  }

  const templatesStr = templates.map(x => `{{${x}}}`).join(', ')
  const wiki = 'https://github.com/electerm/electerm/wiki/quick-command-templates'
  return (
    <Form
      form={form}
      className='form-wrap pd2l macro-form'
      layout='vertical'
      initialValues={initialValues}
      onFinish={handleSubmit}
    >
      <FormItem
        label={e('name')}
        name='name'
        rules={[
          { required: true, message: 'Name required' },
          { max: 100, message: '100 chars max' }
        ]}
      >
        <InputAutoFocus />
      </FormItem>
      <FormItem
        label={e('bookmarkCategory')}
        name='groupId'
      >
        <Select options={groupOptions(store)} />
      </FormItem>
      <MacroStepsEditor form={form} />
      <FormItem>
        <Button
          type='primary'
          htmlType='submit'
          className='mg1r'
        >
          {e('save')}
        </Button>
        <Button
          icon={<CaretRightOutlined />}
          onClick={handleRun}
          disabled={!store.currentTab}
        >
          {t('runInCurrentTab', 'Run in current tab')}
        </Button>
      </FormItem>
      <p>
        <b className='mg1r'>{e('templates')}:</b>
        <span className='mg1r'>{templatesStr}</span>
        <HelpIcon link={wiki} />
      </p>
    </Form>
  )
})
