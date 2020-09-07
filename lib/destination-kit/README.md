# Destination Kit

<!-- ./node_modules/.bin/markdown-toc -i ./lib/destination-kit/README.md -->

<!-- toc -->

- [Overview](#overview)
- [Destination API](#destination-api)
  - [destination(config)](#destinationconfig)
    - [.extendRequest(...callbacks)](#extendrequestcallbacks)
    - [.partnerAction(slug, callback)](#partneractionslug-callback)
- [Action API](#action-api)
  - [Action](#action)
    - [.cachedRequest()](#cachedrequest)
    - [.do()](#do)
    - [.extendRequest(......)](#extendrequest)
    - [.fanOut()](#fanout)
    - [.mapField()](#mapfield)
    - [.request(fn)](#requestfn)
    - [.validatePayload()](#validatepayload)
    - [.validateSettings()](#validatesettings)

<!-- tocstop -->

## Overview

Destination Kit is an experimental fluent interface for building destinations that are composed of
discrete actions that users want to perform when using an destination (e.g. "create or update
company", "track user", "trigger campaign").

```js
// Create or update a customer record in Customer.io
module.exports = action =>
  action
    .validatePayload(require('./payload.schema.json'))

    // Customer.io wants Unix timestamps
    .mapField('created_at', {
      '@timestamp': {
        timestamp: { '@path': '$.created_at' },
        format: 'X',
      },
    })

    .request(async (req, { payload }) => {
      const { id, custom_attributes: customAttrs, ...body } = payload
      return req.put(`customers/${id}`, {
        json: { ...customAttrs, ...body },
      })
    })
```

The goals of Destination Kit are to minimize the amount of work it takes to build a destination (to
make them easy to build) and to standardize the most common patterns of destinations (to make them
easy to build correctly). Additionally, by using a fluent interface and dependency injection rather
than bare imperative JavaScript, we can use the same destination code to generate multiple things:

- Lambda functions to handle transformation and delivery of events.

- Documentation that outlines what a destination can do, what information it needs to perform each
  action, and how the destination behaves.

- Centrifuge GX job configuration to move logic and work out of Lambda piecemeal.

A fluent interface also makes it significantly easier to translate destination actions into UI. For
example, the following code would require you to parse the full JavaScript AST to translate it into
a UI that a user could make sense of:

```js
let responses = []

for (let user of users) {
  try {
    const response = req.put(`https://example.com/${user.id}`)
    console.log(`${user.id} updated`)
    responses.push(response)
  } catch (error) {
    responses.push(error)
  }
}

return responses
```

Whereas a fluent interface maps more easily to UI components without requiring JavaScript AST
traversal. Instead, you simply swap out the default `action()` implementation for one that generates
something the UI can consume, like JSON.

```js
.fanOut({on: 'users', as: 'user'})
  .request(req, ({user}) => (
    req.put(`https://example.com/${user.id}`)
  )
  .do(({user}) => {
    console.log(`${user.id} updated`)
  })
.fanIn()
```

<img width="640" alt="image" src="https://user-images.githubusercontent.com/111501/88086596-720aad00-cb3c-11ea-8353-a8d0bb477c51.png">

## Destination API

Use the destination API to instantiate a new destination, set base request options, and register
actions.

### destination(config: object)

destination() instantiates a new Destination object with the given configuration object.

The configuration object accepts the following fields:

| Field                  | Type     | Description                                                  |
| ---------------------- | -------- | ------------------------------------------------------------ |
| `name`                 | `string` | The human-readable name of the destination. E.g. "Amplitude" |
| `defaultSubscriptions` | `object` | TODO (not sure if we want to keep this)                      |

```js
const { destination } = require('./lib/destination-kit')

module.exports = destination({
  name: 'Webhook',
})
```

### Destination

Destination is the entrypoint for a destination. It holds the destination config (name, base request
options, etc.) and sends incoming events to actions registered with this destination.

The object returned by destination() supports the following chainable methods:

#### .extendRequest(...function(Context))

extendRequest() adds callback functions that can set default
[`got`](https://github.com/sindresorhus/got) request options for all requests made by actions
registered with this destination. It returns the base destination object.

```js
destination({ name: 'Simple' }).extendRequest(({ settings }) => ({
  password: settings.apiKey,
  responseType: 'json',
}))
```

extendRequest() calls should come before partnerAction() calls.

#### .partnerAction(slug: string, callback: function(Action))

.partnerAction() registers an action with this destination. It accepts an action slug (e.g.
"trackUser") and a callback that is passed an Action object that can be used to define the behavior
of the Action (see ["Action API"](#action-api) below). It returns the base destination object.

```js
destination({ name: 'Amplitude' })
  .partnerAction('trackUser', (action) => {
    action.request(...)
  })
  .partnerAction('annotateChart', (action) => {
    action.mapField(...).request(...)
  })
```

partnerAction() calls should come after extendRequest() calls.

## Action API

Use the action API to define the behavior of a discrete action for a destination. An action is
composed of a sequence of steps that are created by calling chainable methods on the Action object.

### Action

The Action object is instantiated by the Destination API (see above) and passed to the callback
function in the .partnerAction() call. Generally you won't instantiate this directly but instead use
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

- The cache holds a maximum of 1,000 keys currently. This could be expanded in the future if needs
  dictate, but currently we run Fab 5 / Destinations 2.0 in Lambda where we have very little memory
  left after the Node runtime.

The config object accepts the following fields (all fields are required unless otherwise noted):

| Field      | Type                      | Description                                                                                                                                                                                              |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ttl`      | `number`                  | Time, in seconds, that values are cached before they are expunged. E.g. `60` = 1 minute                                                                                                                  |
| `key`      | `function(Context)`       | A callback function that receives the [Context](#context) object and should return a unique string that identifies the object fetched by the `value` callback for the given payload.                     |
| `value`    | `function(Got, Conntext)` | A callback function that receives the [`got`-based](https://github.com/sindresorhus/got) request object and the [Context](#context) object and returns the value that should be associated with the key. |
| `as`       | `string`                  | The field name to store the value under in the Context object. See below for an example                                                                                                                  |
| `negative` | `boolean`                 | (Optional) Set this to `true` to cache negative values (null, undefined).                                                                                                                                |

```js
action
  .cachedRequest({
    ttl: 60, // 1 minute
    key: ({ payload }) => payload.userId,
    value: (req, { payload }) => {
      const resp = req.get(`http://example.com/users/${payload.userId}`)
      return resp.data
    },
    as: 'userEmail',
  })
  .do(({ payload, userEmail }) => {
    console.log(`User: ${payload.userId} -> ${userEmail}`)
  })
```

#### .do(function(Context))

do() runs the given function at runtime. The return value of this callback function is ignored.

```js
action.do(({ payload }) => {
  console.log(`Processing user ${payload.userId}`)
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
    responseType: 'json',
  }))
  .request(req => req.get('https://example.com'))
```

#### .fanOut(config: object)

fanOut() splits the execution flow into parallel flows based on an array of values and returns
a FanOut object on which steps can be appended. This is most useful for running requests in
parallel. Parallel execution continues until fanIn() is called on the FanOut object.

The config object requires the following fields:

| Field | Type     | Description                                                                                                                                                                                                         |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `on`  | `string` | A [JSONPath expression](https://goessner.net/articles/JsonPath/) that is applied to the Context object and should resolve to an array of values. A parallel flow of execution will be run for each of these values. |
| `as`  | `string` | The field name that each value will be available as on the Context object to callbacks in each parallel flow of execution.                                                                                          |

fanOut() supports only a subset of the steps available on the parent Action object:

- cachedRequest()

- extendRequest()

- request()

- do()

fanIn() returns the parent Action object.

```js
action
  .fanOut({ on: '$.payload.ids', as: 'userId' })
  .request((req, { payload, userId }) =>
    req.post(`http://example.com/${userId}/ping`),
  )
  .do(({ userId }) => console.log(`${userId} pinged`))
  .fanIn()
```

#### .mapField(path: string, mapping: object)

mapField() maps a single field in the payload value of the Context object using
[`mapping-kit`](https://github.com/segmentio/fab-5-engine/tree/master/lib/mapping-kit). It accepts
a [JSONPath expression](https://goessner.net/articles/JsonPath/) path to the field to be mapped and
a `mapping-kit` mapping configuration. You can overwrite an existing field or add a new field.

```js
action.do(({ payload }) => {
  payload.time = '2020-07-21T22:24:06.277Z'
})
mapField('$.time', {
  '@timestamp': {
    timestamp: { '@path': '$.time' },
    format: 'x',
  },
}).do(({ payload }) => {
  console.log(`Unix timestamp: ${payload.time}`)
})
```

#### .request(function(Got, Context))

request() accepts a callback function that that receives
a [`got`-based](https://github.com/sindresorhus/got) request object and the [Context](#context)
object and returns the value that should be associated with the key.

```js
action.request((req, { payload, settings }) =>
  req.put(`http://example.com/users/${payload.userId}`, {
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
    responseType: 'json',
    json: payload.userProperties,
  }),
)
```

#### .validatePayload(schema: object)

validatePayload() accepts a [JSON Schema](https://json-schema.org) configuration and validates the
`payload` field of the Context object against it. It throws an error and halts execution of the
Action if validation fails.

```js
action
  .validatePayload({
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
    required: ['userId'],
  })
  .do(({ payload }) => {
    console.log(`User's ID is ${payload.userId}`)
  })
```

#### .validateSettings(schema: object)

validateSettings() accepts a [JSON Schema](https://json-schema.org) configuration and validates the
`settings` field of the Context object against it. It throws an error and halts execution of the
Action if validation fails.

```js
action
  .validateSettings({
    type: 'object',
    properties: {
      apiKey: {
        title: 'API Key',
        type: 'string',
        minLength: 32,
      },
    },
    required: [apiKey],
  })
  .extendRequest(({ settings }) => ({
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
  }))
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
