import * as assert from 'assert'
import { BehaviorSubject } from 'rxjs'
import { Cmd, none } from '../../src/Cmd'
import { DebugData, debugInit, debugMsg, runDebugger, updateWithDebug } from '../../src/Debug/commons'
import * as ConsoleDebugger from '../../src/Debug/console'
import * as DevToolDebugger from '../../src/Debug/redux-devtool'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Debug/commons', () => {
  it('debugInit() should return a `DebugInit` object', () => {
    assert.deepStrictEqual(debugInit(), { type: 'INIT' })
  })

  it('debugMsg() should return a `DebugMsg` object', () => {
    assert.deepStrictEqual(debugMsg({ type: 'MyMessage', some: 'data' }), {
      type: 'MESSAGE',
      payload: {
        type: 'MyMessage',
        some: 'data'
      }
    })
  })

  it('updateWithDebug() should run the provided update tracking messages and model updates through debug$', () => {
    const init = 0
    const debug$ = new BehaviorSubject<DebugData<Model, Msg>>([debugInit(), init])
    const updateWD = updateWithDebug(debug$, update)

    const step1 = updateWD({ tag: 'Inc' }, init)
    assert.deepStrictEqual(step1, [1, none])
    assert.deepStrictEqual(debug$.getValue(), [{ type: 'MESSAGE', payload: { tag: 'Inc' } }, 1])

    // we need to cast as any to test internal handling of this "special" message
    const step2 = updateWD({ type: '__DebugUpdateModel__', payload: 10 } as any, step1[0])
    assert.deepStrictEqual(step2, [10, none])
    assert.deepStrictEqual(debug$.getValue(), [{ type: 'MESSAGE', payload: { tag: 'Inc' } }, 1])

    const step3 = updateWD({ tag: 'Dec' }, step2[0])
    assert.deepStrictEqual(step3, [9, none])
    assert.deepStrictEqual(debug$.getValue(), [{ type: 'MESSAGE', payload: { tag: 'Dec' } }, 9])

    const step4 = updateWD({ tag: 'Inc' }, step3[0])
    assert.deepStrictEqual(step4, [10, none])
    assert.deepStrictEqual(debug$.getValue(), [{ type: 'MESSAGE', payload: { tag: 'Inc' } }, 10])

    // we need to cast as any to test internal handling of this "special" message
    const step5 = updateWD({ type: '__DebugApplyMsg__', payload: { tag: 'Inc' } } as any, step4[0])
    assert.deepStrictEqual(step5, [11, none])
    assert.deepStrictEqual(debug$.getValue(), [{ type: 'MESSAGE', payload: { tag: 'Inc' } }, 10])

    const step6 = updateWD({ tag: 'Inc' }, step5[0])
    assert.deepStrictEqual(step6, [12, none])
    assert.deepStrictEqual(debug$.getValue(), [{ type: 'MESSAGE', payload: { tag: 'Inc' } }, 12])
  })

  describe('runDebugger()', () => {
    it('should run a standard console debugger when redux dev-tool is not available', () => {
      const log: Array<DebugData<Model, Msg>> = []

      // --- Mock debuggers
      jest.spyOn(DevToolDebugger, 'reduxDevToolDebugger').mockReturnValueOnce(() => _ => undefined)
      jest
        .spyOn(ConsoleDebugger, 'consoleDebugger')
        .mockReturnValueOnce(() => data => log.push(data as DebugData<Model, Msg>))
      // ---

      const Debugger = runDebugger<Model, Msg>(window)
      const init = 0
      const debug$ = new BehaviorSubject<DebugData<Model, Msg>>([debugInit(), init])
      const dispatch = () => undefined

      Debugger({ init, debug$, dispatch })()

      debug$.next([debugMsg({ tag: 'Inc' }), 1])

      assert.deepStrictEqual(log, [[debugInit(), 0], [debugMsg({ tag: 'Inc' }), 1]])

      assert.strictEqual((DevToolDebugger.reduxDevToolDebugger as any).mock.calls.length, 0)
    })

    it('should run a redux dev-toll debugger when is available', () => {
      const log: Array<DebugData<Model, Msg>> = []

      // --- Mock debuggers
      jest.spyOn(ConsoleDebugger, 'consoleDebugger').mockReturnValueOnce(() => _ => undefined)
      jest
        .spyOn(DevToolDebugger, 'reduxDevToolDebugger')
        .mockReturnValueOnce(() => data => log.push(data as DebugData<Model, Msg>))
      // ---

      const win = window as any

      // --- Mock Redux DevTool Extension
      win.__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: () => ({})
      }

      const Debugger = runDebugger<Model, Msg>(win)
      const init = 0
      const debug$ = new BehaviorSubject<DebugData<Model, Msg>>([debugInit(), init])
      const dispatch = () => undefined

      Debugger({ init, debug$, dispatch })()

      debug$.next([debugMsg({ tag: 'Inc' }), 1])

      assert.deepStrictEqual(log, [[debugInit(), 0], [debugMsg({ tag: 'Inc' }), 1]])

      assert.strictEqual((ConsoleDebugger.consoleDebugger as any).mock.calls.length, 0)
    })
  })
})

// --- Helpers
type Model = number
type Msg = { tag: 'Inc' } | { tag: 'Dec' }

const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg.tag) {
    case 'Inc':
      return [model + 1, none]
    case 'Dec':
      return [model - 1, none]
  }
}
