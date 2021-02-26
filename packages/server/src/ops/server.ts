import '../aliases'
import '../lib/patch-http'
import express from 'express'
import { NotFound } from 'http-errors'
import ow from 'ow'
import core from '@/middleware/core'
import errorHandler from '@/middleware/error-handler'
import { startServer } from '@/boot'
import { PORT } from '@/config'
import asyncHandler from '@/lib/async-handler'
import { getDestinationBySlug } from '@segment/destination-actions'
import { controlPlaneService } from '@/services/control-plane-service'
import Context from '@/lib/context'

const app = express()

app.disable('x-powered-by')

// Causes `req.ip` to be set to the `X-Forwarded-For` header value, which is set by the ELB
app.set('trust proxy', true)

// Endpoint used by ECS to check that the server is still alive
app.get('/health', (_req, res) => {
  res.status(204).end()
})

app.use(core)

app.use(express.json())

async function fetchDestinationSettings(
  context: Context,
  authorization: string,
  destinationId: string
): Promise<object> {
  const { error, data } = await controlPlaneService.getDestinationById(
    { authorization },
    {
      destinationId,
      showEncryptedSettings: true
    },
    { context }
  )

  if (error) {
    throw error
  }

  if (!data?.destination.settings) {
    throw new NotFound('No destination with that id was found.')
  }

  return data.destination.settings
}

app.post(
  '/autocomplete',
  asyncHandler(async (req, res) => {
    const { destinationId, destinationSlug, action, field, mapping, page } = req.body

    ow(field, ow.string)
    ow(mapping, ow.optional.object)
    ow(page, ow.optional.string)

    let settings = req.body.settings

    if (destinationId) {
      settings = await fetchDestinationSettings(req.context, req.headers.authorization as string, destinationId)
    }

    ow(settings, ow.optional.object)

    const destinationDefinition = getDestinationBySlug(destinationSlug)

    ow(action, ow.string.oneOf(Object.keys(destinationDefinition.actions)))
    req.context.set('req_destination', destinationDefinition.name)
    req.context.set('req_action', action)

    const actionDefinition = destinationDefinition.actions[action]

    try {
      const result = await actionDefinition.executeAutocomplete(field, {
        payload: mapping,
        settings,
        cachedFields: {},
        page
      })

      res.status(200).json({
        data: result.data,
        pagination: {
          nextPage: result.pagination.nextPage
        }
      })
    } catch {
      res.status(200).json({
        data: [],
        pagination: {}
      })
    }
  })
)

app.post(
  '/test-credentials',
  asyncHandler(async (req, res) => {
    const { destination, settings } = req.body

    ow(settings, ow.object)

    const destinationDefinition = getDestinationBySlug(destination)
    req.context.set('req_destination', destinationDefinition.name)

    try {
      await destinationDefinition.testAuthentication(settings)
      res.status(200).json({ ok: true })
    } catch (error) {
      if (error.name === 'AggregateAjvError') {
        const fields: Record<string, string> = {}

        for (const fieldError of error) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const name = fieldError.path.replace('$.', '')
          fields[name] = fieldError.message
        }

        res.status(200).json({
          ok: false,
          error: 'Credentials are invalid',
          fields
        })

        return
      }

      res.status(200).json({
        ok: false,
        error: error.message
      })
    }
  })
)

app.post(
  '/test-action',
  asyncHandler(async (req, res) => {
    const { destinationId, destinationSlug, action, event, mapping } = req.body

    ow(destinationId, ow.optional.string)
    ow(destinationSlug, ow.string)
    ow(event, ow.object)
    ow(mapping, ow.object)

    let settings = req.body.settings

    if (destinationId) {
      settings = await fetchDestinationSettings(req.context, req.headers.authorization as string, destinationId)
    }

    ow(settings, ow.optional.object)

    const destinationDefinition = getDestinationBySlug(destinationSlug)

    ow(action, ow.string.oneOf(Object.keys(destinationDefinition.actions)))
    req.context.set('req_destination', destinationDefinition.name)
    req.context.set('req_action', action)

    const actionDefinition = destinationDefinition.actions[action]

    try {
      const results = await actionDefinition.execute({
        settings,
        payload: event,
        mapping,
        cachedFields: {}
      })

      const response = results[results.length - 1]?.output ?? ''

      res.status(200).json({
        ok: true,
        response: JSON.stringify(response, null, '\t')
      })
    } catch (error) {
      // got@10 may return Buffer/string/object types
      let response: string = error.message
      const responseBody = error?.response.body

      if (Buffer.isBuffer(responseBody) || typeof responseBody === 'string') {
        response = responseBody.toString()
      } else if (typeof responseBody === 'object') {
        response = JSON.stringify(responseBody)
      }

      res.status(200).json({
        ok: false,
        response
      })
    }
  })
)

app.use(errorHandler)

export default startServer(app, Number(PORT || 3001))
