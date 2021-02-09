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
  }
]

let amplitude: Plugin

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

  amplitude = browserDestinationPlugin(
    amplitudeDestination,
    {
      // use amplitude's API key from amplitude.com
      apiKey: 'e3e918f274fa30555c627abdb29840d5'
    },
    example
  )
})

test('can load amplitude', async () => {
  jest.spyOn(amplitudeDestination.actions.logEvent, 'perform')
  jest.spyOn(amplitudeDestination, 'initialize')

  await amplitude.load(Context.system(), {} as Analytics)
  expect(amplitudeDestination.initialize).toHaveBeenCalled()

  const ctx = await amplitude.track?.(
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
  await amplitude.load(Context.system(), {} as Analytics)

  await amplitude.track?.(
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
  await amplitude.load(Context.system(), {} as Analytics)

  const instance = window.amplitude.getInstance()
  jest.spyOn(instance, 'logEvent')

  await amplitude.track?.(
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
