import type { ActionDefinition } from '@segment/actions-core'
import { CartProductItem } from '../ga4-types'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Select Item',
  description: 'Send select item events to GA4 to make the most of the ecommerce reports in Google Analytics',
  defaultSubscription: 'type = "track" and event = "Product Clicked"',
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
    item_list_name: {
      label: 'Item List Name',
      description: 'The name of the list in which the item was presented to the user.',
      type: 'string'
    },
    item_list_id: {
      label: 'Item List Id',
      description: 'The ID of the list in which the item was presented to the user.',
      type: 'string'
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
    item_name: {
      label: 'Name',
      type: 'string',
      description: 'Name of the product being purchased.',
      default: {
        '@path': '$.properties.name'
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

    if (payload.item_id || payload.item_name) {
      googleItems.push({
        item_id: payload.item_id,
        item_name: payload.item_name,
        quantity: payload.quantity,
        coupon: payload.coupon,
        item_brand: payload.brand,
        item_category: payload.category,
        item_variant: payload.variant,
        price: payload.price,
        index: payload.position
      })
    }

    return request('https://www.google-analytics.com/mp/collect', {
      method: 'POST',
      json: {
        client_id: payload.client_id,
        events: [
          {
            name: 'select_item',
            params: {
              items: googleItems,
              item_list_name: payload.item_list_name,
              item_list_id: payload.item_list_id
            }
          }
        ]
      }
    })
  }
}

export default action
