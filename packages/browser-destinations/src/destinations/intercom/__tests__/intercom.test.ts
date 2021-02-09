import { Analytics, Context } from '@segment/analytics-next'
import * as jsdom from 'jsdom'
import intercomDestination from '..'
import { Subscription } from '../../../lib/browser-destinations'
import { browserDestinationPlugin } from '../../../runtime'

const example: Subscription[] = [
  {
    partnerAction: 'show',
    name: 'Show',
    enabled: true,
    subscribe: 'type = "track"',
    mapping: {
      user_id: {
        '@path': '$.userId'
      },
      event_type: {
        '@path': '$.event'
      },
      time: {
        '@path': '$.timestamp'
      },
      event_properties: {
        '@path': '$.properties'
      }
    }
  }
]

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
    // navigate to intercom itself, so we can actually load their app id
    url: 'https://intercom.com'
  })

  const windowSpy = jest.spyOn(global, 'window', 'get')
  windowSpy.mockImplementation(() => (jsd.window as unknown) as Window & typeof globalThis)
})

test('can load intercom', async () => {
  const intercom = browserDestinationPlugin(
    intercomDestination,
    {
      // using itercom's app_id from intercom.com
      app_id: 'tx2p130c'
    },
    example
  )

  jest.spyOn(intercomDestination.actions.show, 'perform')
  jest.spyOn(intercomDestination, 'initialize')

  await intercom.load(Context.system(), {} as Analytics)
  expect(intercomDestination.initialize).toHaveBeenCalled()

  const ctx = await intercom.track?.(
    new Context({
      type: 'track',
      properties: {
        banana: '📞'
      }
    })
  )

  expect(intercomDestination.actions.show.perform).toHaveBeenCalled()
  expect(ctx).not.toBeUndefined()

  const scripts = window.document.querySelectorAll('script')
  expect(scripts).toMatchInlineSnapshot(`
    NodeList [
      <script
        src="https://widget.intercom.io/widget/tx2p130c"
        status="loaded"
        type="text/javascript"
      />,
      <script>
        'hi'
      </script>,
    ]
  `)
})
