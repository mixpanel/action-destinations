import { AmplitudeClient } from 'amplitude-js'
import dayjs from '../../../lib/dayjs'
import type { BrowserActionDefinition } from '../../../lib/browser-destinations'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'
import { eventSchema } from '../event-schema'

function omit<T extends object, K extends string[]>(obj: T, keys: K) {
  return Object.keys(obj).reduce((newObject, key) => {
    if (keys.indexOf(key) === -1) newObject[key] = (obj as Record<string, unknown>)[key]
    return newObject
  }, {} as Record<string, unknown>) as Omit<T, keyof K>
}

interface AmplitudeEvent extends Omit<Payload, 'products' | 'trackRevenuePerProduct' | 'time'> {
  time?: number
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

const action: BrowserActionDefinition<Settings, AmplitudeClient, Payload> = {
  title: 'Order Completed',
  description:
    'Track purchased products from an event. This event will produce multiple events in Amplitude from a single Segment event, one for each product in the products array.',
  defaultSubscription: 'type = "track" and event = "Order Completed"',
  fields: {
    ...eventSchema,
    trackRevenuePerProduct: {
      title: 'Track Revenue Per Product',
      description:
        'When enabled, track revenue with each product within the event. When disabled, track total revenue once for the event.',
      type: 'boolean',
      required: true,
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
  perform: (amplitude, { payload }) => {
    const { products = [], trackRevenuePerProduct, time, session_id, ...rest } = omit(payload, revenueKeys)
    const properties = rest as AmplitudeEvent

    if (time && dayjs.utc(time).isValid()) {
      properties.time = dayjs.utc(time).valueOf()
    }

    if (session_id && dayjs.utc(session_id).isValid()) {
      properties.session_id = dayjs.utc(session_id).valueOf()
    }

    const orderCompletedEvent = {
      ...properties,
      ...(trackRevenuePerProduct ? {} : getRevenueProperties(payload))
    }

    amplitude.logEvent(orderCompletedEvent.event_type, orderCompletedEvent.event_properties)

    products.forEach((product) => {
      amplitude.logEvent('Product Purchased', {
        ...properties,
        product,
        ...(trackRevenuePerProduct ? getRevenueProperties(product) : {})
      })
    })
  }
}

export default action
