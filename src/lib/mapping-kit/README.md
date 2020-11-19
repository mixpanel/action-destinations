# Mapping Kit

Mapping Kit is a library for mapping and transforming JSON payloads. It exposes a function that
accepts a mapping configuration object and a payload object and outputs a mapped and transformed
payload. A mapping configuration is a mixture of raw values (values that appear in the output
payload as they appear in the mapping configuration) and directives, which can fetch and transform
data from the input payload.

For example:

```json
Mapping:

{
  "name": "Mr. Rogers",
  "neighborhood": { "@path": "$.properties.neighborhood" },
  "greeting": { "@template": "Won't you be my {{properties.noun}}?" }
}

Input:

{
  "type": "track",
  "event": "Sweater On",
  "context": {
    "library": {
      "name": "analytics.js",
      "version": "2.11.1"
    }
  },
  "properties": {
    "neighborhood": "Latrobe",
    "noun": "neighbor",
    "sweaterColor": "red"
  }
}

Output:

{
  "name": "Mr. Rogers",
  "neighborhood": "Latrobe",
  "greeting": "Won't you be my neighbor?"
}
```

## Table of contents

<!-- ./node_modules/.bin/markdown-toc -i ./src/lib/mapping-kit/README.md -->

<!-- toc -->

- [Usage](#usage)
- [Terms](#terms)
- [Mixing raw values and directives](#mixing-raw-values-and-directives)
- [Validation](#validation)
- [Options](#options)
  - [merge](#merge)
- [Removing values from object](#removing-values-from-object)
- [Directives](#directives)
  - [@base64](#base64)
  - [@if](#if)
  - [@lowercase](#lowercase)
  - [@merge](#merge)
  - [@omit](#omit)
  - [@path](#path)
  - [@pick](#pick)
  - [@root](#root)
  - [@template](#template)
  - [@timestamp](#timestamp)
  - [@uuid](#uuid)

<!-- tocstop -->

## Usage

```ts
import { transform } from '../mapping-kit'

const mapping = { '@path': '$.foo.bar' }
const input = { foo: { bar: 'Hello!' } }

const output = transform(mapping, input)
// => "Hello!"
```

## Terms

In Mapping Kit, there are only two kinds of values: **raw values** and **directives**. Raw values
can be any JSON value and Mapping Kit will return them in the output payload untouched:

```json
42

"Hello, world!"

{ "foo": "bar" }

["product123", "product456"]
```

Directives are objects with a single @-prefixed key that tell Mapping Kit to fetch data from the
input payload or transform some data:

```json
{ "@path": "$.properties.name" }

{ "@template": "Hello there, {{traits.name}}" }

{
  "@merge": [
    { "name": "No name found" },
    { "@path": "$.traits" }
  ]
}
```

In this document, the act of converting a directive to its final raw value is called "resolving" the
directive.

## Mixing raw values and directives

Directives and raw values can be mixed to create complex mappings. For example:

```json
Mapping:

{
  "action": "create",
  "userId": {
    "@path": "$.traits.email"
  },
  "userProperties": {
    "@pick": {
      "object": "traits",
      "fields": ["name", "email", "plan"]
    }
  }
}

Input:

{
  "traits": {
    "name": "Peter Gibbons",
    "email": "peter@example.com",
    "plan": "premium",
    "logins": 5,
    "address": {
      "street": "6th St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94103",
      "country": "USA"
    }
  }
}


Output:

{
  "action": "create",
  "userId": "peter@example.com",
  "userProperties": {
    "name": "Peter Gibbons",
    "email": "peter@example.com",
    "plan": "premium"
  }
}
```

A directive may not, however, be mixed in at the same level as a raw value:

```json
Invalid:

{
  "foo": "bar",
  "@path": "$.properties.biz"
}

Valid:

{
  "foo": "bar",
  "baz": { "@path": "$.properties.biz" }
}
```

And a directive may only have one @-prefixed directive in it:

```json
Invalid:

{
  "@path": "$.foo.bar",
  "@pick": {
    "object": "biz.baz",
    "fields": ["a", "b", "c"]
  }
}

Valid:

{
  "foo": { "@path": "$.foo.bar" },
  "baz": {
    "@pick": {
      "object": "biz.baz",
      "fields": ["a", "b", "c"]
    }
  }
}
```

## Validation

Mapping configurations can be validated using [JSON Schema][schema.json]. The [test
suite][schema.test.js] is a good source-of-truth for current implementation behavior.

[schema.json]: https://github.com/segmentio/fab-5-engine/blob/master/lib/mapping-kit/schema.json
[schema.test.js]: https://github.com/segmentio/fab-5-engine/blob/master/lib/mapping-kit/schema.test.js

## Options

Options can be passed to the `transform()` function as the third parameter:

```js
const output = transform(mapping, input, options)
```

Available options:

```js
{
  merge: true // default false
}
```

### merge

If true, `merge` will cause the mapped value to be merged onto the input payload. This is useful
when you only want to map/transform a small number of fields:

```json
Input:

{
  "a": {
    "b": 1
  },
  "c": 2
}

Options:

{
  "merge": true
}

Mappings:

{}
=>
{
  "a": {
    "b": 1
  },
  "c": 2
}

{
  "a": 3
}
=>
{
  "a": 3,
  "c": 2
}

{
  "a": {
    "c": 3
  }
}
=>
{
  "a": {
    "b": 1,
    "c": 3
  },
  "c": 2
}
```

## Removing values from object

`undefined` values in objects are removed from the mapped output while `null` is not:

```json
Input:

{
  "a": 1
}

Mappings:

{
  "foo": {
    "@path": "$.a"
  },
  "bar": {
    "@path": "$.b"
  },
  "baz": null
}
=>
{
  "foo": 1,
  "baz": null
}
```

## Directives

### @base64

The @base64 directive resolves to the base64-encoded version of the given string:

```json
Input:

{
  "hello": "world!"
}

Mappings:

{ "@base64": "x" } => "eAo="
{ "@base64": { "@path": "$.hello" } } => "d29ybGQhCg=="
```

### @if

The @if directive resolves to different values based on a given conditional. It must have at least
one conditional (see below) and one branch ("then" or "else").

The supported conditional values are:

- "exists": If the given value is not undefined or null, the @if directive resolves to the "then"
  value. Otherwise, the "else" value is used.

- "true": If the given value resolves to `true` or "true" (case-insensitive), the "then" value is
  used. Otherwise, the "else" value is used.

```json
Input:

{
  "a": "cool",
  "b": true
}

Mappings:

{
  "@if": {
    "exists": { "@path": "$.a" },
    "then": "yep",
    "else": "nope"
  }
}
=>
"yep"

{
  "@if": {
    "exists": { "@path": "$.nope" },
    "then": "yep",
    "else": "nope"
  }
}
=>
"nope"

{
  "@if": {
    "true": { "@path": "$.b" },
    "then": "yep",
    "else": "nope"
  }
}
=>
"yep"

{
  "@if": {
    "true": { "@path": "$.doesnt.exist" },
    "then": 1,
    "else": 2
  }
}
=>
"nope"
```

If "then" or "else" are not defined and the conditional indicates that their value should be used,
the field will not appear in the resolved output. This is useful for including a field only if it
(or some other field) exists:

```json
Input:

{
  "a": "cool"
}

Mappings:

{
  "foo-exists": {
    "@if": {
      "exists": { "@path": "$.foo" },
      "then": true
    }
  }
}
=>
{}

{
  "a": {
    "@if": {
      "exists": { "@path": "$.oops" },
      "then": { "@path": "$.a" }
    }
  }
}
=>
{}
```

### @lowercase

The @lowercase directive resolves to the lowercase version of the given string.

```json
Input:

{
  "greeting": "Hello, world!"
}

Mappings:

{ "@lowercase": "HELLO" } => "hello"
{ "@lowercase": { "@path": "$.greeting" } } => "hello, world!"
```

### @merge

The @merge directive accepts a list of one or more objects (either raw objects or directives that
resolve to objects) and resolves to a single object. The resolved object is built by combining each
object in turn, overwriting any duplicate keys.

```json
Input:

{
  "traits": {
    "name": "Mr. Rogers",
    "greeting": "Neighbor",
    "neighborhood": "Latrobe"

  },
  "properties": {
    "neighborhood": "Make Believe"
  }
}

Mappings:

{
  "@merge": [
    { "@path": "$.traits" },
    { "@path": "$.properties" }
  ]
}
=>
{
  "name": "Mr. Rogers",
  "greeting": "Neighbor",
  "neighborhood": "Make Believe"
}

{
  "@merge": [
    { "@path": "$.properties" },
    { "@path": "$.traits" }
  ]
}
=>
{
  "name": "Mr. Rogers",
  "greeting": "Neighbor",
  "neighborhood": "Latrobe"
}
```

The @merge directive is especially useful for providing default values:

```json
Input:

{
  "traits": {
    "name": "Mr. Rogers"
  }
}

Mapping:

{
  "@merge": [
    {
      "name": "Missing name",
      "neighborhood": "Missing neighborhood"
    },
    { "@path": "$.traits" }
  ]
}

Output:

{
  "name": "Mr. Rogers",
  "neighborhood": "Missing neighborhood"
}
```

### @omit

The @omit directive resolves an object with the given list of fields removed from it:

```json
Input:

{
  "foo": {
    "a": 1,
    "b": 2,
    "c": 3
  }
}

Mapping:

{
  "@omit": {
    "object": { "@path": "$.foo" },
    "fields": ["a", "c"]
  }
}
=>
{ "b": 2 }
```

The "fields" list can also be a directive that resolves to an array of strings or it can be an array
of strings and directives that resolve to strings:

```json
Input:

{
  "fieldList": ["b"],
  "singleField": "c"
}

Mappings:

{
  "@omit": {
    "object": { "a": 1, "b": 2, "c": 3 },
    "fields": { "@path": "$.fieldList" }
  }
}
=>
{ "a": 1, "c": 3 }

{
  "@omit": {
    "object": { "a": 1, "b": 2, "c": 3 },
    "fields": [
      "a",
      { "@path": "$.singleField" }
    ]
  }
}
=>
{ "b": 2 }
```

### @path

The @path directive resolves to the value at the given
[JSONPath](https://goessner.net/articles/JsonPath/) location. @path supports the
[`jsonpath-plus`](https://github.com/s3u/JSONPath) extensions.

```json
Input:

{
  "foo": {
    "bar": 42,
    "baz": [{ "num": 1 }, { "num": 2 }]
  },
  "hello": "world"
}

Mappings:

{ "@path": "$.hello" } => "world"

{ "@path": "$.foo.bar" } => 42

{ "@path": "$.foo.baz..num" } => [1, 2]
```

### @pick

The @pick directive resolves an object with the only the given list of fields in it:

```json
Input:

{
  "foo": {
    "a": 1,
    "b": 2,
    "c": 3
  }
}

Mapping:

{
  "@pick": {
    "object": { "@path": "$.foo" },
    "fields": ["a", "c"]
  }
}
=>
{ "a": 1, "c": 3 }
```

The "fields" list can also be a directive that resolves to an array of strings or it can be an array
of strings and directives that resolve to strings:

```json
Input:

{
  "fieldList": ["b"],
  "singleField": "c"
}

Mappings:

{
  "@pick": {
    "object": { "a": 1, "b": 2, "c": 3 },
    "fields": { "@path": "$.fieldList" }
  }
}
=>
{ "b": 2 }

{
  "@pick": {
    "object": { "a": 1, "b": 2, "c": 3 },
    "fields": [
      "a",
      { "@path": "$.singleField" }
    ]
  }
}
=>
{ "a": 1, "c": 3 }
```

### @root

The @root directive resolves to the root of the input JSON object. The value of the "@root" key is
ignored.

```json
Input:

{
  "cool": true
}

Mappings:

{ "@root": true } => { "cool": true }
{ "@root": {} } => { "cool": true }
{ "@root": "" } => { "cool": true }
```

The @root directive is useful for adding or overriding keys to the root input JSON object:

```json
Input:

{
  "a": 1,
  "b": 2
}

Mappings:

{
  "@merge": [
    { "@root": {} },
    { "b": 22, "c": 33 }
  ]
}
=>
{
  "a": 1,
  "b": 22,
  "c": 33
}
```

### @template

The @template directive resolves to a string using the given
[mustache.js](http://mustache.github.io/) template string.

```json
Input:

{
  "traits": {
    "name": "Mr. Rogers"
  },
  "userId": "abc123"
}

Mappings:

{ "@template": "Hello, {{traits.name}}!" } => "Hello, Mr. Rogers!"

{ "@template": "Hello, {{traits.fullName}}!" } => "Hello, !"

{ "@template": "{{traits.name}} ({{userId}})" } => "Mr.Rogers (abc123)"
```

### @timestamp

The @timestamp directive parses a string or number timestamp and resolves to a string timestamp
using the given format. The @timestamp directive uses [day.js](https://day.js.org/) to parse and
format timestamps.

```json
Input:

{
  "ts": "Mon, 01 Jun 2020 00:00:00"
}

Mappings:

{
  "timestamp": "Mon, 01 Jun 2020 00:00:00",
  "format": "YYYY-MM-DD"
}
=>
"2020-06-01"

{
  "timestamp": { "@path": "$.ts" },
  "format": "json"
}
=>
"2020-06-01T07:00:00.000Z"
```

The @timestamp directive is fairly liberal in what it accepts by default. In order, it checks for
the ISO 8601 format, RFC 2822 format, and then it falls back to `new Date(...)`. In Node.js, `new Date(...)` also accepts a UNIX timestamp (seconds since epoch) as a number or string. If you want to
use a custom format, supply a `inputFormat` value using the [format specified by
day.js](https://day.js.org/docs/en/parse/string-format):

```json
Mappings:

{
  "timestamp": "20-6-1",
  "inputFormat": "YY-M-D",
  "format": "json"
}
=>
"2020-06-01T07:00:00.000Z"

{
  "timestamp": "MMM Do, YYYY",
  "inputFormat": "June 1st, 2020",
  "format": "json"
}
=>
"2020-06-01T07:00:00.000Z"
```

### @uuid

The @uuid directive resolves to a v4 UUID string generated using the [uuid
package](https://www.npmjs.com/package/uuid).

```json
Mappings:

{
  "uuid": {}
}
=>
"a3c8e5ac-fff9-43d1-b053-3049a62fcbeb"
```
