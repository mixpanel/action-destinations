# Destination Kit

<!-- ./node_modules/.bin/markdown-toc -i ./lib/destination-kit/README.md -->

<!-- toc -->

- [Overview](#overview)
- [Destination API](#destination-api)
  - [destination(config)](#destinationconfig)
- [Action API](#action-api)
  - [Action](#action)
    - [.cachedRequest()](#cachedrequest)
    - [.extendRequest(......)](#extendrequest)
    - [.request(fn)](#requestfn)
    - [.validatePayload()](#validatepayload)

<!-- tocstop -->

## Overview

Destination Kit is an experimental fluent interface for building destinations that are composed of
discrete actions that users want to perform when using an destination (e.g. "create or update
company", "track user", "trigger campaign").

```js
// Create or update a customer record in Customer.io
module.exports = {
  schema: require('./payload.schema.json'),
  perform: (req, { payload }) => {
    const { id, custom_attributes: customAttrs, created_at, ...body } = payload

    return req.put(`customers/${id}`, {
      json: { ...customAttrs, ...body }
    })
  }
}
```

The goals of Destination Kit are to minimize the amount of work it takes to build a destination (to
make them easy to build) and to standardize the most common patterns of destinations (to make them
easy to build correctly). Through this standard definition and dependency injection, we can use the same destination code to generate multiple things:

- JSON Schema validation

- Lambda functions to handle transformation and delivery of events.

- Documentation that outlines what a destination can do, what information it needs to perform each
  action, and how the destination behaves.

- Centrifuge GX job configuration to move logic and work out of Lambda piecemeal.

## Destination API

Use the destination API to instantiate a new destination, set base request options, and register
actions.

### destination(config: object)

destination() instantiates a new Destination object with the given configuration object.

The configuration object accepts the following fields:

| Field           | Type       | Description                                                  |
| --------------- | ---------- | ------------------------------------------------------------ |
| `name`          | `string`   | The human-readable name of the destination. E.g. "Amplitude" |
| `schema`        | `object`   | The JSON Schema repesenting destination settings             |
| `extendRequest` | `function` | (Optional) function to extend the `got` request instance     |

```js
const { destination } = require('./lib/destination-kit')

module.exports = destination({
  name: 'Webhook'
})
```

### Destination

Destination is the entrypoint for a destination. It holds the destination config (name, base request
options, etc.) and sends incoming events to actions registered with this destination.

The object returned by destination() supports the following configuration and chainable methods:

#### extendRequest(function(Context))

extendRequest() adds a callback function that can set default
[`got`](https://github.com/sindresorhus/got) request options for all requests made by actions
registered with this destination. It returns the base destination object.

```js
destination({
  name: 'Simple',
  extendRequest({ settings }) {
    return {
      password: settings.apiKey,
      responseType: 'json'
    }
  }
})
```

## Action API

Use the action API to define the behavior of a discrete action for a destination. An action is
composed of a sequence of steps that are created by calling chainable methods on the Action object.

### Action

The Action object is instantiated by the Destination API (see above) and passed to the callback
function in the `actions` array of the destination. Generally you won't instantiate this directly but instead use
the following chainable methods on the Action object. Each method appends a step to the execution
flow for the Action.

#### .cachedRequest(config: object)

cachedRequest() wraps an external HTTP request with a cache. This is useful for reducing the number
of GET requests made for common operations like generating access tokens or determining if a user
exists yet in the partner API.

Some notes on the cache implementation:

- cachedRequest() does not cache negative values (null, undefined) by default to avoid common errors
  in the most common use cases like caching access tokens or determining if a user needs to be
  created or updated in the partner API. Caching of negative values can be turned on using the
  `negative` option (see below).

- The backing cache is not shared among cachedRequest() calls. Every cachedRequest() block has its
  own cache.

- The cache holds a maximum of 1,000 keys currently. This could be expanded in the future if needs dictate.

The config object accepts the following fields (all fields are required unless otherwise noted):

| Field      | Type                      | Description                                                                                                                                                                                              |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ttl`      | `number`                  | Time, in seconds, that values are cached before they are expunged. E.g. `60` = 1 minute                                                                                                                  |
| `key`      | `function(Context)`       | A callback function that receives the [Context](#context) object and should return a unique string that identifies the object fetched by the `value` callback for the given payload.                     |
| `value`    | `function(Got, Conntext)` | A callback function that receives the [`got`-based](https://github.com/sindresorhus/got) request object and the [Context](#context) object and returns the value that should be associated with the key. |
| `as`       | `string`                  | The field name to store the value under in the Context object. See below for an example                                                                                                                  |
| `negative` | `boolean`                 | (Optional) Set this to `true` to cache negative values (null, undefined).                                                                                                                                |

```js
action.cachedRequest({
  ttl: 60, // 1 minute
  key: ({ payload }) => payload.userId,
  value: (req, { payload }) => {
    const resp = req.get(`http://example.com/users/${payload.userId}`)
    return resp.data
  },
  as: 'userEmail'
})
```

#### .extendRequest(...function(Context))

extendRequest() adds callback functions that can set default
[`got`](https://github.com/sindresorhus/got) request options for all subsequent requests made by
this Action. It should return an object with [`Got` request
options](https://github.com/sindresorhus/got#options).

```js
action
  .extendRequest(({ settings }) => ({
    password: settings.apiKey,
    responseType: 'json'
  }))
  .request(req => req.get('https://example.com'))
```

#### .request(function(Got, Context))

request() accepts a callback function that that receives
a [`got`-based](https://github.com/sindresorhus/got) request object and the [Context](#context)
object and returns the value that should be associated with the key.

```js
action.request((req, { payload, settings }) =>
  req.put(`http://example.com/users/${payload.userId}`, {
    headers: {
      Authorization: `Bearer ${settings.apiKey}`
    },
    responseType: 'json',
    json: payload.userProperties
  })
)
```

#### .validatePayload(schema: object)

validatePayload() accepts a [JSON Schema](https://json-schema.org) configuration and validates the
`payload` field of the Context object against it. It throws an error and halts execution of the
Action if validation fails.

```js
action.validatePayload({
  type: 'object',
  properties: {
    userId: { type: 'string' }
  },
  required: ['userId']
})
```

### Context

The Context object is an object passed to many of the callbacks that you'll define when adding steps
to an Action object. The Context object is used to propagate the incoming payload, settings, and
other values created at runtime among the various steps. While there is currently no set schema for
this, we're currently using at least the following two fields:

| Field      | Type     | Description                                                  |
| ---------- | -------- | ------------------------------------------------------------ |
| `paylaod`  | `object` | Incoming Segment event payload.                              |
| `settings` | `object` | Per-destination and per-action setting values. E.g. `apiKey` |
