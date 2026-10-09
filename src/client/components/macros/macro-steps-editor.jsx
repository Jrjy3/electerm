/**
 * macro step editor: one step per row with type, value, options and the
 * sleep after the step. Rows are dragged by the handle only, so text in the
 * inputs can still be selected with the mouse. Rows can be inserted
 * above/below like the MobaXterm macro editor.
 */
import { useRef } from 'react'
import {
  Form,
  Select,
  Input,
  InputNumber,
  Checkbox,
  Button,
  Tooltip
} from 'antd'
import {
  HolderOutlined,
  PlusOutlined,
  DeleteOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined
} from '@ant-design/icons'
import { isDropAfterHalf, setDropIndicator, clearDropIndicator } from '../../common/drop-position'
import { macroKeyNames } from '../terminal/automation/macro-keys'
import uid from '../../common/uid'
import t from './macro-text'

const FormItem = Form.Item
const e = window.translate

const ctrlKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => 'Ctrl+' + c)
const keyOptions = [...macroKeyNames, ...ctrlKeys].map(k => ({ value: k, label: k }))

export function newStep (type = 'text') {
  return type === 'key'
    ? { id: uid(), type, value: 'Enter', repeat: 1, sleep: 0 }
    : { id: uid(), type: 'text', value: '', enter: true, sleep: 0 }
}

function StepRow (props) {
  const { field, index, form, remove, insert, drag } = props
  const type = Form.useWatch(['steps', field.name, 'type'], form)
  const typeOptions = [
    { value: 'text', label: t('text', 'Text') },
    { value: 'key', label: t('key', 'Key') }
  ]
  function onTypeChange (v) {
    const step = form.getFieldValue(['steps', field.name]) || {}
    const next = newStep(v)
    form.setFieldValue(['steps', field.name], {
      ...next,
      id: step.id || next.id,
      sleep: step.sleep || 0
    })
  }
  return (
    <div
      className='macro-step-row'
      onDragOver={ev => drag.over(ev)}
      onDragLeave={ev => drag.leave(ev)}
      onDrop={ev => drag.drop(ev, index)}
      onDragEnd={ev => drag.end(ev)}
    >
      <span
        className='macro-step-drag drag'
        onDragStart={ev => drag.start(ev, index)}
        draggable
      >
        <HolderOutlined />
      </span>
      <span className='macro-step-index'>{index + 1}</span>
      <FormItem name={[field.name, 'type']} noStyle>
        <Select
          className='macro-step-type'
          options={typeOptions}
          onChange={onTypeChange}
          popupMatchSelectWidth={false}
        />
      </FormItem>
      <div className='macro-step-value'>
        {
          type === 'key'
            ? (
              <FormItem name={[field.name, 'value']} noStyle>
                <Select
                  showSearch
                  options={keyOptions}
                  className='width-100'
                />
              </FormItem>
              )
            : (
              <FormItem name={[field.name, 'value']} noStyle>
                <Input
                  placeholder={t('macroTextPlaceholder', 'Text to send')}
                  spellCheck={false}
                />
              </FormItem>
              )
        }
      </div>
      <div className='macro-step-option'>
        {
          type === 'key'
            ? (
              <Tooltip title={t('repeat', 'Repeat')}>
                <FormItem name={[field.name, 'repeat']} noStyle>
                  <InputNumber
                    min={1}
                    max={100}
                    prefix='×'
                    className='width-100'
                  />
                </FormItem>
              </Tooltip>
              )
            : (
              <FormItem
                name={[field.name, 'enter']}
                valuePropName='checked'
                noStyle
              >
                <Checkbox>{e('enter')}</Checkbox>
              </FormItem>
              )
        }
      </div>
      <FormItem name={[field.name, 'sleep']} noStyle>
        <InputNumber
          min={0}
          max={3600000}
          step={100}
          suffix='ms'
          className='macro-step-sleep'
        />
      </FormItem>
      <span className='macro-step-ops'>
        <Button
          size='small'
          type='text'
          icon={<VerticalAlignTopOutlined />}
          title={t('insertAbove', 'Insert above')}
          onClick={() => insert(newStep(), index)}
        />
        <Button
          size='small'
          type='text'
          icon={<VerticalAlignBottomOutlined />}
          title={t('insertBelow', 'Insert below')}
          onClick={() => insert(newStep(), index + 1)}
        />
        <Button
          size='small'
          type='text'
          danger
          icon={<DeleteOutlined />}
          title={e('del')}
          onClick={() => remove(field.name)}
        />
      </span>
    </div>
  )
}

export default function MacroStepsEditor ({ form }) {
  const dragIndex = useRef(null)

  const drag = {
    start (ev, index) {
      dragIndex.current = index
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.setData('text/plain', String(index))
      const row = ev.currentTarget.closest('.macro-step-row')
      if (row) {
        ev.dataTransfer.setDragImage(row, 10, 10)
        row.classList.add('macro-step-dragging')
      }
    },
    over (ev) {
      if (dragIndex.current === null) {
        return
      }
      ev.preventDefault()
      const row = ev.currentTarget
      setDropIndicator(row, isDropAfterHalf(ev, row))
    },
    leave (ev) {
      clearDropIndicator(ev.currentTarget)
    },
    drop (ev, index) {
      ev.preventDefault()
      const row = ev.currentTarget
      clearDropIndicator(row)
      const from = dragIndex.current
      dragIndex.current = null
      if (from === null || from === index) {
        return
      }
      const steps = [...(form.getFieldValue('steps') || [])]
      const [item] = steps.splice(from, 1)
      let to = isDropAfterHalf(ev, row) ? index + 1 : index
      if (from < to) {
        to--
      }
      steps.splice(to, 0, item)
      form.setFieldValue('steps', steps)
    },
    end (ev) {
      dragIndex.current = null
      const row = ev.currentTarget.closest('.macro-step-row')
      row?.classList.remove('macro-step-dragging')
    }
  }

  return (
    <FormItem label={t('steps', 'Steps')}>
      <Form.List name='steps'>
        {(fields, { add, remove }) => (
          <div className='macro-steps'>
            {
              fields.length
                ? (
                  <div className='macro-step-row macro-step-head'>
                    <span className='macro-step-drag' />
                    <span className='macro-step-index'>#</span>
                    <span className='macro-step-type'>{e('type')}</span>
                    <span className='macro-step-value'>{t('value', 'Value')}</span>
                    <span className='macro-step-option' />
                    <span className='macro-step-sleep'>{t('sleep', 'Sleep')}</span>
                    <span className='macro-step-ops' />
                  </div>
                  )
                : null
            }
            {
              fields.map((field, i) => (
                <StepRow
                  key={field.key}
                  field={field}
                  index={i}
                  form={form}
                  remove={remove}
                  insert={add}
                  drag={drag}
                />
              ))
            }
            <div className='mg1t'>
              <Button
                type='dashed'
                icon={<PlusOutlined />}
                onClick={() => add(newStep())}
                className='mg1r'
              >
                {t('text', 'Text')}
              </Button>
              <Button
                type='dashed'
                icon={<PlusOutlined />}
                onClick={() => add(newStep('key'))}
              >
                {t('key', 'Key')}
              </Button>
            </div>
          </div>
        )}
      </Form.List>
    </FormItem>
  )
}
