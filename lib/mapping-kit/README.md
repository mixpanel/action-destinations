# Mapping Kit

Mapping Kit is a library that accepts a mapping configuration and a payload and outputs a mapped and
transformed payload. A mapping configuration is a mixture of raw values (values that appear in the
output payload as they appear in the mapping configuration) and directives, which can fetch data
from the input payload and transform data.

For example:

```
Mapping:

{
  "name": "Mr. Rogers",
  "neighborhood": { "@field": "properties.neighborhood" },
  "greeting": { "@handlebars": "Won't you be my {{properties.noun}}?" }
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
  },

}

Output:

{
  "name": "Mr. Rogers",
  "neighborhood": "Latrobe",
  "greeting": "Won't you be my neighbor?"
}
```

## Table of contents

<!-- To update, run: ./scripts/gh-md-toc --insert ./lib/mapping-kit/README.md -->

<!--ts-->
   * [Mapping Kit](#mapping-kit)
   * [Table of contents](#table-of-contents)
   * [Terms](#terms)
   * [Mixing raw values and directives](#mixing-raw-values-and-directives)
   * [Validation](#validation)
   * [Directives](#directives)
      * [@field](#field)
      * [@handlebars](#handlebars)
      * [@merge](#merge)

<!-- Added by: tysonmote, at: Mon Jun  1 14:39:13 PDT 2020 -->

<!--te-->

## Terms

In Mapping Kit, there are only two kinds of values: **raw values** and **directives**. Raw values
can be any JSON value and Mapping Kit will return them in the output payload untouched:

```
42

"Hello, world!"

{ "foo": "bar" }

["product123", "product456"]
```

Directives are objects with a single @-prefixed key that tell Mapping Kit to fetch data from the
input payload or transform some data:

```
{ "@field": "properties.name" }

{ "@handlebars": "Hello there, {{traits.name}}" }

{
  "@merge": [
    { "name": "No name found" },
    { "@field": "traits" }
  ]
}
```

In this document, the act of converting a directive to its final raw value is called "resolving" the
directive.

## Mixing raw values and directives

Directives and raw values can be mixed to create complex mappings. For example:

```
Mapping:

{
  "action": "create",
  "userId": {
    "@field": "traits.email"
  },
  "userProperties": {
    "@whitelist": {
      "object": "traits",
      "fields": ["name", "email", "plan"]
    }
  },
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

```
Invalid:

{
  "foo": "bar",
  "@field:
}

Valid:

{
  "foo": "bar",
  "baz": { "@field": "properties.biz" }
}
```

And a directive may only have one @-prefixed directive in it:

```
Invalid:

{
  "@field": "foo.bar",
  "@whitelist": {
    "object: "biz.baz",
    "fields": ["a", "b", "c"]
  }
}

Valid:

{
  "foo": { "@field": "foo.bar" },
  "baz": {
    "@whitelist": {
      "object: "biz.baz",
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


## Directives

### @field

**TODO:** Support JSONPath

The @field directive resolves to the value at the given dot-separated path in the input payload:

```
Input:

{
  "foo": {
    "bar" {
      "baz": 42
    },
  },
  "hello": "world"
}

Mappings:

{ "@field": "hello" } => "world"

{ "@field": "foo.bar" } => { "baz": 42 }

{ "@field": "foo.bar.baz" } => 42

{ "@field": "foo.oops" } => null
```

### @handlebars

**TODO:** Support Handlebars.js or use a custom format that embeds JSONPath?

The @handlebars directive resolves to string using the given
[Handlebars.js](https://handlebarsjs.com/guide/) template string.

```
Input:

{
  "traits": {
    "name": "Mr. Rogers"
  },
  "userId": "abc123"
}

Mappings:

{ "@handlebars": "Hello, {{traits.name}}!" } => "Hello, Mr. Rogers!"

{ "@handlebars": "Hello, {{traits.fullName}}!" } => "Hello, !"

{ "@handlebars": "{{traits.name}} ({{userId}})" } => "Mr.Rogers (abc123)"
```

### @merge

The @merge directive accepts a list of one or more objects (either raw objects or directives that
resolve to objects) and resolves to a single object. The resolved object is built by combining each
object in turn, overwriting any duplicate keys.

```
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
    { "@field": "traits" },
    { "@field": "properties" }
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
    { "@field": "properties" },
    { "@field": "traits" }
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

```
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
    { "@field": "traits" }
  ]
}

Output:

{
  "name": "Mr. Rogers",
  "neighborhood": "Missing neighborhood"
}
```

