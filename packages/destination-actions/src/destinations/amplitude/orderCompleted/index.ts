import { omit } from 'lodash'
import dayjs from '../../../lib/dayjs'
import { ActionDefinition } from '../../../lib/destination-kit/action'
import { eventSchema } from '../event-schema'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

interface AmplitudeEvent extends Omit<Payload, 'products' | 'trackRevenuePerProduct' | 'time' | 'session_id'> {
  time?: number
  session_id?: number
}

const revenueKeys = ['revenue', 'price', 'productId', 'quantity', 'revenueType']

interface EventRevenue {
  revenue?: number
  price?: number
  productId?: string
  quantity?: number
  revenueType?: string
}

function getRevenueProperties(payload: EventRevenue): EventRevenue {
  if (typeof payload.revenue !== 'number') {
    return {}
  }

  return {
    revenue: payload.revenue,
    revenueType: payload.revenueType ?? 'Purchase',
    quantity: typeof payload.quantity === 'number' ? Math.round(payload.quantity) : undefined,
    price: payload.price,
    productId: payload.productId
  }
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Order Completed',
  description:
    'Track purchased products from an event. This event will produce multiple events in Amplitude from a single Segment event, one for each product in the products array.',
  // Uses the same fields as trackUser (we can duplicate it here, if needed)
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    defaultSubscription: 'type = "track" and event = "Order Completed"',
    properties: {
      ...eventSchema,
      trackRevenuePerProduct: {
        title: 'Track Revenue Per Product',
        description:
          'When enabled, track revenue with each product within the event. When disabled, track total revenue once for the event.',
        type: 'boolean',
        default: false
      },
      products: {
        title: 'Products',
        description: 'The list of products purchased.',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            price: {
              title: 'Price',
              type: 'number',
              description:
                'The price of the item purchased. Required for revenue data if the revenue field is not sent. You can use negative values to indicate refunds.'
            },
            quantity: {
              title: 'Quantity',
              type: 'integer',
              description: 'The quantity of the item purchased. Defaults to 1 if not specified.'
            },
            revenue: {
              title: 'Revenue',
              type: 'number',
              description:
                'Revenue = price * quantity. If you send all 3 fields of price, quantity, and revenue, then (price * quantity) will be used as the revenue value. You can use negative values to indicate refunds.'
            },
            productId: {
              title: 'Product ID',
              type: 'string',
              description:
                'An identifier for the item purchased. You must send a price and quantity or revenue with this field.'
            },
            revenueType: {
              title: 'Revenue Type',
              type: 'string',
              description:
                'The type of revenue for the item purchased. You must send a price and quantity or revenue with this field.'
            }
          }
        },
        default: {
          '@path': '$.properties.products'
        }
      }
    },
    additionalProperties: false,
    required: ['event_type', 'trackRevenuePerProduct']
  },
  perform: (request, { payload, settings }) => {
    // Omit revenue properties initially because we will manually stitch those into events as prescribed
    const { products = [], trackRevenuePerProduct, time, session_id, ...rest } = omit(payload, revenueKeys)

    const properties = rest as AmplitudeEvent
    if (time) {
      properties.time = dayjs.utc(time).valueOf()
    }

    if (session_id) {
      properties.session_id = dayjs.utc(session_id).valueOf()
    }

    const orderCompletedEvent = {
      ...properties,
      // Track revenue with main order completed event
      ...(trackRevenuePerProduct ? {} : getRevenueProperties(payload))
    }

    const events = [orderCompletedEvent]

    for (const product of products) {
      events.push({
        ...properties,
        // Or track revenue per product
        ...(trackRevenuePerProduct ? getRevenueProperties(product) : {}),
        event_properties: product,
        event_type: 'Product Purchased',
        insert_id: properties.insert_id && `${properties.insert_id}-${events.length + 1}`
      })
    }

    return request.post('https://api2.amplitude.com/2/httpapi', {
      json: {
        api_key: settings.apiKey,
        events
      }
    })
  }
}

export default action
