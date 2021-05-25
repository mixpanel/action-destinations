import type { ActionDefinition } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'
import { CartProductItem } from '../ga4-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Add to Cart',
  description: 'Send product added events to GA4 to make the most of the ecommerce reports in Google Analytics',
  defaultSubscription: 'type = "track" and event = "Product Added"',
  fields: {
    clientId: {
      label: 'Client ID',
      description: 'Uniquely identifies a user instance of a web client.',
      type: 'string',
      required: true,
      default: {
        '@if': {
          exists: { '@path': '$.userId' },
          then: { '@path': '$.userId' },
          else: { '@path': '$.anonymousId' }
        }
      }
    },
    currency: {
      label: 'Currency',
      type: 'string',
      description: 'Currency of the purchase or items associated with the event, in 3-letter ISO 4217 format.'
    },
    affiliation: {
      label: 'Affiliation',
      type: 'string',
      description: 'Store or affiliation from which this transaction occurred (e.g. Google Store).'
    },
    item_id: {
      label: 'Item ID',
      description: 'The product identifier (i.e. a unique id or SKU).',
      type: 'string',
      default: {
        '@if': {
          exists: { '@path': '$.properties.product_id' },
          then: { '@path': '$.properties.product_id' },
          else: { '@path': '$.properties.sku' }
        }
      }
    },
    category: {
      label: 'Category',
      type: 'string',
      description: 'Product category.',
      default: {
        '@path': '$.properties.category'
      }
    },
    name: {
      label: 'Name',
      type: 'string',
      description: 'Name of the product being purchased.',
      default: {
        '@path': '$.properties.name'
      }
    },
    brand: {
      label: 'Brand',
      type: 'string',
      description: 'Brand associated with the product.',
      default: {
        '@path': '$.properties.brand'
      }
    },
    variant: {
      label: 'Variant',
      type: 'string',
      description: 'Variant of the product (e.g. Black).',
      default: {
        '@path': '$.properties.variant'
      }
    },
    price: {
      label: 'Price',
      type: 'number',
      description: 'Price ($) of the product being purchased, in units of the specified currency parameter.',
      default: {
        '@path': '$.properties.price'
      }
    },
    quantity: {
      label: 'Quantity',
      type: 'integer',
      description: 'Item quantity.',
      default: {
        '@path': '$.properties.quantity'
      }
    },
    coupon: {
      label: 'Coupon',
      type: 'string',
      description: 'Coupon code used for a purchase.',
      default: {
        '@path': '$.properties.coupon'
      }
    },
    position: {
      label: 'Position',
      type: 'number',
      description: 'Position in the product list (ex. 3).',
      default: {
        '@path': '$.properties.position'
      }
    }
  },
  perform: (request, { payload }) => {
    const googleItems: CartProductItem[] = []

    if (payload.item_id || payload.name) {
      googleItems.push({
        item_id: payload.item_id || '',
        item_name: payload.name || '',
        quantity: payload.quantity,
        affiliation: payload.affiliation,
        coupon: payload.coupon,
        item_brand: payload.brand,
        item_category: payload.category,
        item_variant: payload.variant,
        price: payload.price,
        currency: payload.currency,
        index: payload.position
      })
    }

    return request('https://www.google-analytics.com/mp/collect', {
      method: 'POST',
      json: {
        client_id: payload.clientId,
        events: [
          {
            name: 'add_to_cart',
            params: {
              currency: payload.currency,
              items: googleItems,
              value: payload.price
            }
          }
        ]
      }
    })
  }
}

export default action
