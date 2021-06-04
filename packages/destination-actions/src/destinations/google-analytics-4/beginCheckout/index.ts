import { ActionDefinition, IntegrationError } from '@segment/actions-core'
import { CURRENCY_ISO_CODES } from '../constants'
import { ProductItem } from '../ga4-types'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Begin Checkout',
  description: 'Send begin checkout events to GA4 to make the most of the ecommerce reports in Google Analytics',
  defaultSubscription: 'type = "track" and event = "Checkout Started"',
  fields: {
    client_id: {
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
    coupon: {
      label: 'Coupon',
      type: 'string',
      description: 'Coupon code used for a purchase.',
      default: {
        '@path': '$.properties.coupon'
      }
    },
    currency: {
      label: 'Currency',
      type: 'string',
      description: 'Currency of the purchase or items associated with the event, in 3-letter ISO 4217 format.',
      default: {
        '@path': '$.properties.currency'
      }
    },
    affiliation: {
      label: 'Affiliation',
      type: 'string',
      description: 'Store or affiliation from which this transaction occurred (e.g. Google Store).',
      default: {
        '@path': '$.properties.affiliation'
      }
    },
    // Google does not have anything to map position, url and image url fields (Segment spec) to
    // so will ignore for now
    products: {
      label: 'Products',
      description: 'The list of products purchased.',
      type: 'object',
      multiple: true,
      properties: {
        product_id: {
          label: 'Product ID',
          type: 'string',
          description: 'Identifier for the product being purchased.'
        },
        sku: {
          label: 'SKU',
          type: 'string',
          description: 'Sku of the product being purchased.'
        },
        name: {
          label: 'Name',
          type: 'string',
          description: 'Name of the product being purchased.'
        },
        quantity: {
          label: 'Quantity',
          type: 'integer',
          description: 'Item quantity.'
        },
        coupon: {
          label: 'Coupon',
          type: 'string',
          description: 'Coupon code used for a purchase.'
        },
        brand: {
          label: 'Brand',
          type: 'string',
          description: 'Brand associated with the product.'
        },
        category: {
          label: 'Category',
          type: 'string',
          description: 'Product category.'
        },
        variant: {
          label: 'Variant',
          type: 'string',
          description: 'Variant of the product (e.g. Black).'
        },
        price: {
          label: 'Price',
          type: 'number',
          description: 'Price ($) of the product being purchased, in units of the specified currency parameter.'
        }
      },
      default: {
        '@path': '$.properties.products'
      }
    },
    value: {
      label: 'Value',
      type: 'number',
      description: 'The monetary value of the event, in units of the specified currency parameter.',
      default: {
        '@path': '$.properties.value'
      }
    }
  },
  perform: (request, { payload }) => {
    if (payload.currency && !CURRENCY_ISO_CODES.includes(payload.currency)) {
      throw new Error(`${payload.currency} is not a valid currency code.`)
    }

    let googleItems: ProductItem[] = []

    if (payload.products) {
      googleItems = payload.products.map((product) => {
        if (product.name === undefined || (product.product_id === undefined && product.sku === undefined)) {
          throw new IntegrationError(
            'One of product name or product id or product sku is required for product or impression data.',
            'Misconfigured required field',
            400
          )
        }

        return {
          item_id: product.product_id ? product.product_id : product.sku,
          item_name: product.name,
          quantity: product.quantity,
          affiliation: payload.affiliation,
          coupon: product.coupon,
          item_brand: product.brand,
          item_category: product.category,
          item_variant: product.variant,
          price: product.price,
          currency: payload.currency
        } as ProductItem
      })
    }

    return request('https://www.google-analytics.com/mp/collect', {
      method: 'POST',
      json: {
        client_id: payload.client_id,
        events: [
          {
            name: 'begin_checkout',
            params: {
              coupon: payload.coupon,
              currency: payload.currency,
              items: googleItems,
              value: payload.value
            }
          }
        ]
      }
    })
  }
}

export default action
