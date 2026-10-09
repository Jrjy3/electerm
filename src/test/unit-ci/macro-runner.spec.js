const { describe, test } = require('node:test')
const assert = require('node:assert/strict')

const loadRunner = () => import('../../client/components/terminal/automation/macro-runner.js')
const loadKeys = () => import('../../client/components/terminal/automation/macro-keys.js')

const esc = '\x1b'

function recorder () {
  const sent = []
  return { sent, send: data => sent.push(data) }
}

describe('macro keys', () => {
  test('maps named keys case-insensitively', async () => {
    const { keySequence } = await loadKeys()
    assert.equal(keySequence('Enter'), '\r')
    assert.equal(keySequence('tab'), '\t')
    assert.equal(keySequence('ESC'), esc)
    assert.equal(keySequence('Backspace'), '\x7f')
    assert.equal(keySequence('Delete'), esc + '[3~')
    assert.equal(keySequence('Page Up'), esc + '[5~')
    assert.equal(keySequence('F1'), esc + 'OP')
    assert.equal(keySequence('f12'), esc + '[24~')
  })

  test('maps Ctrl combinations to control characters', async () => {
    const { keySequence } = await loadKeys()
    assert.equal(keySequence('Ctrl+C'), '\x03')
    assert.equal(keySequence('ctrl+z'), '\x1a')
    assert.equal(keySequence('Ctrl+['), esc)
    assert.equal(keySequence('Ctrl+1'), '')
  })

  test('cursor keys follow application cursor mode', async () => {
    const { keySequence } = await loadKeys()
    assert.equal(keySequence('Up'), esc + '[A')
    assert.equal(keySequence('Left'), esc + '[D')
    assert.equal(keySequence('Home'), esc + '[H')
    assert.equal(keySequence('Up', { applicationCursor: true }), esc + 'OA')
    assert.equal(keySequence('End', { applicationCursor: true }), esc + 'OF')
  })

  test('returns empty for unknown names', async () => {
    const { keySequence } = await loadKeys()
    assert.equal(keySequence('NotAKey'), '')
    assert.equal(keySequence(''), '')
    assert.equal(keySequence(undefined), '')
    assert.equal(keySequence('toString'), '')
  })

  test('every listed key name resolves', async () => {
    const { keySequence, macroKeyNames } = await loadKeys()
    for (const name of macroKeyNames) {
      assert.ok(keySequence(name), name)
    }
  })
})

describe('macro runner', () => {
  test('sends text and key steps in order', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    const result = await runMacro([
      { type: 'key', value: 'Backspace', repeat: 6 },
      { type: 'text', value: 'admin', enter: true },
      { type: 'text', value: 'en' },
      { type: 'key', value: 'Enter' }
    ], { send }).done
    assert.deepEqual(sent, ['\x7f'.repeat(6), 'admin\r', 'en', '\r'])
    assert.deepEqual(result, { status: 'done', index: 4 })
  })

  test('sends text without expanding escapes', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    await runMacro([
      { type: 'text', value: 'dir C:\\temp\\new ^C', enter: true }
    ], { send }).done
    assert.deepEqual(sent, ['dir C:\\temp\\new ^C\r'])
  })

  test('resolves templates in text steps', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    await runMacro([
      { type: 'text', value: 'echo {{clipboard}}', enter: true },
      { type: 'key', value: 'Enter' }
    ], {
      send,
      resolveText: async text => text.replace('{{clipboard}}', 'pasted')
    }).done
    assert.deepEqual(sent, ['echo pasted\r', '\r'])
  })

  test('uses application cursor mode from the terminal', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    await runMacro([{ type: 'key', value: 'Up' }], {
      send,
      getKeyOptions: () => ({ applicationCursor: true })
    }).done
    assert.deepEqual(sent, [esc + 'OA'])
  })

  test('skips unknown step types and key names', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    const result = await runMacro([
      { type: 'future', value: 'x' },
      { type: 'key', value: 'NotAKey' },
      null,
      { type: 'text', value: 'ok' }
    ], { send }).done
    assert.deepEqual(sent, ['ok'])
    assert.equal(result.status, 'done')
  })

  test('waits the sleep after a step before the next one', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    const times = []
    const start = Date.now()
    await runMacro([
      { type: 'text', value: 'a', sleep: 60 },
      { type: 'text', value: 'b' }
    ], {
      send: data => {
        times.push(Date.now() - start)
        send(data)
      }
    }).done
    assert.deepEqual(sent, ['a', 'b'])
    assert.ok(times[1] - times[0] >= 50, `gap was ${times[1] - times[0]}ms`)
  })

  test('skips the sleep on the last step', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    const start = Date.now()
    const result = await runMacro([
      { type: 'text', value: 'a', sleep: 60000 }
    ], { send }).done
    assert.ok(Date.now() - start < 1000)
    assert.deepEqual(sent, ['a'])
    assert.deepEqual(result, { status: 'done', index: 1 })
  })

  test('stop() ends a run in the middle of a sleep', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    const run = runMacro([
      { type: 'text', value: 'a', sleep: 60000 },
      { type: 'text', value: 'b' }
    ], { send })
    setTimeout(() => run.stop(), 20)
    const start = Date.now()
    const result = await run.done
    assert.ok(Date.now() - start < 1000)
    assert.deepEqual(sent, ['a'])
    assert.deepEqual(result, { status: 'stopped', index: 1 })
  })

  test('stop() right after starting sends nothing', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    const run = runMacro([{ type: 'key', value: 'Enter' }], { send })
    run.stop()
    const result = await run.done
    assert.deepEqual(sent, [])
    assert.deepEqual(result, { status: 'stopped', index: 0 })
  })

  test('ends when the tab closes between steps', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    let alive = true
    const result = await runMacro([
      { type: 'text', value: 'a' },
      { type: 'text', value: 'b' }
    ], {
      send: data => {
        send(data)
        alive = false
      },
      isAlive: () => alive
    }).done
    assert.deepEqual(sent, ['a'])
    assert.deepEqual(result, { status: 'closed', index: 1 })
  })

  test('does not send text if the tab closes while templates resolve', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    let alive = true
    const result = await runMacro([{ type: 'text', value: 'x' }], {
      send,
      isAlive: () => alive,
      resolveText: async text => {
        alive = false
        return text
      }
    }).done
    assert.deepEqual(sent, [])
    assert.deepEqual(result, { status: 'closed', index: 0 })
  })

  test('reports an error from a step and stops', async () => {
    const { runMacro } = await loadRunner()
    const { sent, send } = recorder()
    const result = await runMacro([
      { type: 'text', value: 'a' },
      { type: 'text', value: 'b' }
    ], {
      send,
      resolveText: async text => {
        if (text === 'a') throw new Error('boom')
        return text
      }
    }).done
    assert.deepEqual(sent, [])
    assert.equal(result.status, 'error')
    assert.equal(result.index, 0)
    assert.equal(result.error.message, 'boom')
  })
})
