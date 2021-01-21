/**
 * The common fields defined by Amplitude's events api
 * @see {@link https://developers.amplitude.com/docs/http-api-v2#keys-for-the-event-argument}
 */
export const eventSchema = {
  user_id: {
    title: 'User ID',
    type: ['string', 'null'],
    description:
      'A readable ID specified by you. Must have a minimum length of 5 characters. Required unless device ID is present.',
    defaultMapping: {
      '@path': '$.userId'
    }
  },
  device_id: {
    title: 'Device ID',
    type: 'string',
    description:
      'A device-specific identifier, such as the Identifier for Vendor on iOS. Required unless user ID is present. If a device ID is not sent with the event, it will be set to a hashed version of the user ID.',
    defaultMapping: {
      '@if': {
        exists: { '@path': '$.context.device.id' },
        then: { '@path': '$.context.device.id' },
        else: { '@path': '$.anonymousId' }
      }
    }
  },
  event_type: {
    title: 'Event Type',
    type: 'string',
    description: 'A unique identifier for your event.',
    examples: ['watch_tutorial'],
    defaultMapping: {
      '@path': '$.event'
    }
  },
  time: {
    title: 'Timestamp',
    type: 'string',
    format: 'date-time',
    description:
      'The timestamp of the event. If time is not sent with the event, it will be set to the request upload time.',
    defaultMapping: {
      '@path': '$.timestamp'
    }
  },
  event_properties: {
    title: 'Event Properties',
    type: 'object',
    description:
      'An object of key-value pairs that represent additional data to be sent along with the event. You can store property values in an array. Date values are transformed into string values. Object depth may not exceed 40 layers.',
    defaultMapping: {
      '@path': '$.properties'
    }
  },
  user_properties: {
    title: 'User Properties',
    type: 'object',
    description:
      'An object of key-value pairs that represent additional data tied to the user. You can store property values in an array. Date values are transformed into string values. Object depth may not exceed 40 layers.',
    defaultMapping: {
      '@path': '$.traits'
    }
  },
  groups: {
    title: 'Groups',
    type: 'object',
    description:
      'Groups of users for the event as an event-level group. You can only track up to 5 groups. **Note:** This Amplitude feature is only available to Enterprise customers who have purchased the Accounts add-on.'
  },
  app_version: {
    title: 'App Version',
    type: 'string',
    description: 'The current version of your application.',
    defaultMapping: {
      '@path': '$.context.app.version'
    }
  },
  platform: {
    title: 'Platform',
    type: 'string',
    description: 'Platform of the device.',
    defaultMapping: {
      '@path': '$.context.device.type'
    }
  },
  os_name: {
    title: 'OS Name',
    type: 'string',
    description: 'The name of the mobile operating system or browser that the user is using.',
    defaultMapping: {
      '@path': '$.context.os.name'
    }
  },
  os_version: {
    title: 'OS Version',
    type: 'string',
    description: 'The version of the mobile operating system or browser the user is using.',
    defaultMapping: {
      '@path': '$.context.os.version'
    }
  },
  device_brand: {
    title: 'Device Brand',
    type: 'string',
    description: 'The device brand that the user is using.',
    defaultMapping: {
      '@path': '$.context.device.brand'
    }
  },
  device_manufacturer: {
    title: 'Device Manufacturer',
    type: 'string',
    description: 'The device manufacturer that the user is using.',
    defaultMapping: {
      '@path': '$.context.device.manufacturer'
    }
  },
  device_model: {
    title: 'Device Model',
    type: 'string',
    description: 'The device model that the user is using.',
    defaultMapping: {
      '@path': '$.context.device.model'
    }
  },
  carrier: {
    title: 'Carrier',
    type: 'string',
    description: 'The carrier that the user is using.',
    defaultMapping: {
      '@path': '$.context.network.carrier'
    }
  },
  country: {
    title: 'Country',
    type: 'string',
    description: 'The current country of the user.',
    defaultMapping: {
      '@path': '$.context.location.country'
    }
  },
  region: {
    title: 'Region',
    type: 'string',
    description: 'The current region of the user.',
    defaultMapping: {
      '@path': '$.context.location.region'
    }
  },
  city: {
    title: 'City',
    type: 'string',
    description: 'The current city of the user.',
    defaultMapping: {
      '@path': '$.context.location.city'
    }
  },
  dma: {
    title: 'Designated Market Area',
    type: 'string',
    description: 'The current Designated Market Area of the user.'
  },
  language: {
    title: 'Language',
    type: 'string',
    description: 'The language set by the user.',
    defaultMapping: {
      '@path': '$.context.locale'
    }
  },
  price: {
    title: 'Price',
    type: 'number',
    description:
      'The price of the item purchased. Required for revenue data if the revenue field is not sent. You can use negative values to indicate refunds.',
    defaultMapping: {
      '@path': '$.properties.price'
    }
  },
  quantity: {
    title: 'Quantity',
    type: 'integer',
    description: 'The quantity of the item purchased. Defaults to 1 if not specified.',
    defaultMapping: {
      '@path': '$.properties.quantity'
    }
  },
  revenue: {
    title: 'Revenue',
    type: 'number',
    description:
      'Revenue = price * quantity. If you send all 3 fields of price, quantity, and revenue, then (price * quantity) will be used as the revenue value. You can use negative values to indicate refunds.',
    defaultMapping: {
      '@path': '$.properties.revenue'
    }
  },
  productId: {
    title: 'Product ID',
    type: 'string',
    description: 'An identifier for the item purchased. You must send a price and quantity or revenue with this field.',
    defaultMapping: {
      '@path': '$.properties.productId'
    }
  },
  revenueType: {
    title: 'Revenue Type',
    type: 'string',
    description:
      'The type of revenue for the item purchased. You must send a price and quantity or revenue with this field.',
    defaultMapping: {
      '@path': '$.properties.revenueType'
    }
  },
  location_lat: {
    title: 'Latitude',
    type: 'number',
    description: 'The current Latitude of the user.',
    defaultMapping: {
      '@path': '$.context.location.latitude'
    }
  },
  location_lng: {
    title: 'Longtitude',
    type: 'number',
    description: 'The current Longitude of the user.',
    defaultMapping: {
      '@path': '$.context.location.longitude'
    }
  },
  ip: {
    title: 'IP Address',
    type: 'string',
    description:
      'The IP address of the user. Use "$remote" to use the IP address on the upload request. Amplitude will use the IP address to reverse lookup a user\'s location (city, country, region, and DMA). Amplitude has the ability to drop the location and IP address from events once it reaches our servers. You can submit a request to Amplitude\'s platform specialist team here to configure this for you.',
    defaultMapping: {
      '@path': '$.context.ip'
    }
  },
  idfa: {
    title: 'Identifier For Advertiser (IDFA)',
    type: 'string',
    description: 'Identifier for Advertiser. _(iOS)_',
    defaultMapping: {
      '@if': {
        exists: { '@path': '$.context.device.advertisingId' },
        then: { '@path': '$.context.device.advertisingId' },
        else: { '@path': '$.context.device.idfa' }
      }
    }
  },
  idfv: {
    title: 'Identifier For Vendor (IDFV)',
    type: 'string',
    description: 'Identifier for Vendor. _(iOS)_',
    defaultMapping: {
      '@path': '$.context.device.id'
    }
  },
  adid: {
    title: 'Google Play Services Advertising ID',
    type: 'string',
    description: 'Google Play Services advertising ID. _(Android)_',
    defaultMapping: {
      '@if': {
        exists: { '@path': '$.context.device.advertisingId' },
        then: { '@path': '$.context.device.advertisingId' },
        else: { '@path': '$.context.device.idfa' }
      }
    }
  },
  android_id: {
    title: 'Android ID',
    type: 'string',
    description: 'Android ID (not the advertising ID). _(Android)_'
  },
  event_id: {
    title: 'Event ID',
    type: 'integer',
    description:
      'An incrementing counter to distinguish events with the same user ID and timestamp from each other. Amplitude recommends you send an event ID, increasing over time, especially if you expect events to occur simultanenously.'
  },
  session_id: {
    title: 'Session ID',
    type: 'string',
    format: 'date-time',
    description: 'The start time of the session, necessary if you want to associate events with a particular system.'
  },
  insert_id: {
    title: 'Insert ID',
    type: 'string',
    description:
      'Amplitude will deduplicate subsequent events sent with this ID we have already seen before within the past 7 days. Amplitude recommends generating a UUID or using some combination of device ID, user ID, event type, event ID, and time.'
  }
}
