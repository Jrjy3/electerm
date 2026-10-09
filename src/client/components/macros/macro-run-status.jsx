/**
 * footer chip for the macro running in the active tab, with a stop button
 */
import { auto } from 'manate/react'
import { LoadingOutlined, BorderOutlined } from '@ant-design/icons'
import t from './macro-text'
import './macros.styl'

export default auto(function MacroRunStatus ({ store }) {
  const run = store.runningMacros[store.activeTabId]
  if (!run) {
    return null
  }
  const progress = `${Math.min(run.index + 1, run.total)}/${run.total}`
  return (
    <div className='terminal-footer-unit terminal-footer-macro'>
      <span className='macro-run-chip' title={run.name}>
        <LoadingOutlined className='mg1r' />
        <span className='elli macro-run-name'>{run.name || t('macro', 'Macro')}</span>
        <span className='mg1x'>{progress}</span>
        <span
          className='pointer macro-run-stop'
          title={t('stopMacro', 'Stop macro')}
          onClick={() => store.stopMacro(store.activeTabId)}
        >
          <BorderOutlined className='mg1r' />
          {t('stop', 'Stop')}
        </span>
      </span>
    </div>
  )
})
