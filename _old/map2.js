var _ = require('lodash')

function T (fn) {
  const base = {}

  base.event = function (strs, values) {
    if (values) throw new Error('not implemented')
    return _.get(base.event.event, strs[0].slice(1))
  }

  base.event.stmt = function (strs, values) {
    return () => {
      const ctxConsts = Object.entries(base.event.event).map(([k, v]) => {
        if (k === 'stmt') return ''
        if (typeof v === 'function') v = v()
        return `const ${k} = ${JSON.stringify(v)}`
      }).join(';')

      return eval(`${ctxConsts} ; (${strs[0]})`)
    }
  }

  base.event.event = {
    type: 'identify',
    context: {
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      device: {
        type: 'foo device',
        manufacturer: 'foo manufacturer'
      }
    },
    traits: {
      name: 'Bob Smith',
      email: 'bob@smith.com',
      plan: 'premium',
      logins: 5,
      createdAt: '2020-02-23T22:28:55.387Z',
      nested: { delete: 'me' }
    },
    userId: 'abc123',
    receivedAt: '2020-02-23T22:28:55.387Z',
    sentAt: '2020-02-23T22:28:55.111Z',
    timestamp: '2020-02-23T22:28:55.111Z',
    options: {
      active: true
    }
  }

  base.helpers = {
    companyName: function () {
      return 'Company Name (from helper)'
    }
  }

  console.log(fn(base))
}

function stmt (strs, values) {
  if (values) throw new Error('not implemented')
  return (ctx) => {
    const ctxConsts = Object.entries(ctx).map(([k, v]) => {
      if (typeof v === 'function') v = v()
      return `const ${k} = ${JSON.stringify(v)}`
    }).join(';')

    return eval(`${ctxConsts} ; (${strs[0]})`)
  }
}

const DROP = '__DROP'

const map = {
  if: (statement, value) => {
    if (typeof statement !== 'function') throw new Error('if statement must be function')

    if (statement({ value: value })) {
      if (typeof value === 'function') value = value()
      return value
    } else {
      return DROP
    }
  },

  flatten: (obj, opts) => {
    if (typeof obj === 'function') obj = obj()
    const newObj = {}
    Object.entries(obj).forEach(([k, v]) => {
      if (opts.drop) {
        if (typeof v === 'object') return
        newObj[k] = v
      } else {
        throw new Error('not implemented')
      }
    })
    return newObj
  },

  blacklist: (obj, keys) => {
    return function () {
      if (typeof obj === 'function') obj = obj()
      keys.forEach((k) => delete obj[k])
      return obj
    }
  },

  combine: (base, ...addtl) => {
    if (typeof base === 'function') base = base()
    return Object.assign(base, ...addtl.map((a) => { return typeof a === 'function' ? a() : a }))
  }
}

const transform = {
  unixTime: (ts) => {
    return Math.round(new Date(ts).getTime() / 1000)
  }
}

T(({ event, helpers }) => ({
  user_id: event('userId'),

  remote_created_at: map.if(
    stmt('value > 0'),
    transform.unixTime(event('traits.createdAt'))
  ),

  last_request_at: map.if(
    event('options.active === true'),
    transform.unixTime(event('timestamp'))
  ),

  company: map.if(
    stmt('value.length > 0'),
    helpers.companyName()
  ),

  custom_attributes: map.combine(
    map.blacklist(
      map.flatten(event('traits'), { drop: true }),
      ['name', 'email', 'company', 'companies', 'phone']
    ),
    {
      device_type: map.if(
        stmt('typeof value === "string"'),
        event('context.device.type')
      ),
      device_manufacturer: map.if(
        stmt('typeof value === "string"'),
        event('context.device.manufacturer')
      )
    }
  )
}))
