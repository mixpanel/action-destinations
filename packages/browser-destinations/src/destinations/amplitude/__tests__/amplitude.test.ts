import { Analytics, Context, Plugin } from '@segment/analytics-next'
import * as jsdom from 'jsdom'
import amplitudeDestination from '..'
import { Subscription } from '../../../lib/browser-destinations'
import { browserDestinationPlugin } from '../../../runtime'

const example: Subscription[] = [
  {
    partnerAction: 'logEvent',
    name: 'LogEvent',
    enabled: true,
    subscribe: 'type = "track"',
    mapping: {
      eventName: {
        '@path': '$.event'
      },
      eventProperties: {
        '@path': '$.properties'
      }
    }
  },
  {
    partnerAction: 'sessionPlugin',
    name: 'SessionPlugin',
    enabled: true,
    subscribe: 'type = "track"',
    mapping: {}
  }
]

let amplitudeActions: Record<string, Plugin>
let ajs: Analytics

beforeEach(async () => {
  jest.restoreAllMocks()
  jest.resetAllMocks()

  const html = `
  <!DOCTYPE html>
    <head>
      <script>'hi'</script>
    </head>
    <body>
    </body>
  </html>
  `.trim()

  const jsd = new jsdom.JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'https://localhost'
  })

  const windowSpy = jest.spyOn(global, 'window', 'get')
  windowSpy.mockImplementation(() => (jsd.window as unknown) as Window & typeof globalThis)

  amplitudeActions = browserDestinationPlugin(
    amplitudeDestination,
    {
      // use amplitude's API key from amplitude.com
      apiKey: 'e3e918f274fa30555c627abdb29840d5'
    },
    example
  )

  ajs = new Analytics({
    writeKey: 'w_123'
  })
})

describe('logEvent', () => {
  test('can load amplitude', async () => {
    jest.spyOn(amplitudeDestination.actions.logEvent, 'perform')
    jest.spyOn(amplitudeDestination, 'initialize')

    await amplitudeActions.logEvent.load(Context.system(), ajs)
    expect(amplitudeDestination.initialize).toHaveBeenCalled()

    const ctx = await amplitudeActions.logEvent.track?.(
      new Context({
        type: 'track',
        event: 'greet',
        properties: {
          greeting: 'Oi!'
        }
      })
    )

    expect(amplitudeDestination.actions.logEvent.perform).toHaveBeenCalled()
    expect(ctx).not.toBeUndefined()

    const scripts = window.document.querySelectorAll('script')
    expect(scripts).toMatchInlineSnapshot(`
          NodeList [
            <script
              src="https://cdn.amplitude.com/libs/amplitude-7.2.1-min.gz.js"
              status="loaded"
              type="text/javascript"
            />,
            <script>
              'hi'
            </script>,
          ]
      `)
  })

  test('can map event fields properly', async () => {
    jest.spyOn(amplitudeDestination.actions.logEvent, 'perform')
    await amplitudeActions.logEvent.load(Context.system(), ajs)

    await amplitudeActions.logEvent.track?.(
      new Context({
        type: 'track',
        event: 'greet',
        properties: {
          greeting: 'Oi!'
        }
      })
    )

    expect(amplitudeDestination.actions.logEvent.perform).toHaveBeenCalledWith(
      window.amplitude.getInstance(),
      expect.objectContaining({
        payload: expect.objectContaining({
          eventName: 'greet',
          eventProperties: {
            greeting: 'Oi!'
          }
        })
      })
    )
  })

  test('delegates calls to amplitude', async () => {
    await amplitudeActions.logEvent.load(Context.system(), ajs)

    const instance = window.amplitude.getInstance()
    jest.spyOn(instance, 'logEvent')

    await amplitudeActions.logEvent.track?.(
      new Context({
        type: 'track',
        event: 'greet',
        properties: {
          greeting: 'Oi!'
        }
      })
    )

    expect(instance.logEvent).toHaveBeenCalledWith('greet', { greeting: 'Oi!' })
  })
})

describe('sessionPlugin', () => {
  test('updates the original event with an amplitude session id', async () => {
    await amplitudeActions.sessionPlugin.load(Context.system(), ajs)

    const instance = window.amplitude.getInstance()
    jest.spyOn(instance, 'getSessionId').mockReturnValueOnce(1037)

    const ctx = new Context({
      type: 'track',
      event: 'greet',
      properties: {
        greeting: 'Oi!'
      }
    })

    const updatedCtx = await amplitudeActions.sessionPlugin.track?.(ctx)
    expect(updatedCtx?.event.context?.amplitude_session_id).toEqual(1037)
  })

  test('runs as an enrichment middleware', async () => {
    await ajs.register(amplitudeActions.logEvent)
    await ajs.register(amplitudeActions.sessionPlugin)

    jest.spyOn(amplitudeActions.sessionPlugin, 'track')
    jest.spyOn(amplitudeActions.logEvent, 'track')

    const ctx = new Context({
      type: 'track',
      event: 'greet',
      properties: {
        greeting: 'Oi!'
      }
    })

    await ajs.track(ctx.event)

    expect(amplitudeActions.sessionPlugin.track).toHaveBeenCalled()
    expect(amplitudeActions.logEvent.track).toHaveBeenCalled()
    expect(ajs.queue.plugins.map((p) => ({ name: p.name, type: p.type }))).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "Amplitude logEvent",
          "type": "destination",
        },
        Object {
          "name": "Amplitude sessionPlugin",
          "type": "enrichment",
        },
      ]
    `)
  })
})
