# Fab 5 Engine

Fab 5 Engine is an early prototype implementation of five destinations following the Destinations
2.0 vision. 2.0 destinations are comprised of one or more subscriptions ("if") that trigger partner
actions along with a mapping that maps the incoming event to a payload that matches the action's
schema.

This prototype deploys the Fab 5 destinations as Destination Functions to staging. This is currently
hard-coded to the `tyson` workspace in staging. (TODO: make this configurable)

## Settings

Fab 5 destinations are configured using a single Destination Function setting (`subscriptions`) that
contains a JSON blob of all subscriptions for the destination. The format should look like this:


```js
[
  {
    // "type" subscriptions are the only ones supported currently
    "subscribe": {
      "type": "track"
    },

    "partnerAction": "<actionSlug>",

    // See ./lib/mapping-kit/README.md for documentation. The schema for each partner action is
    defined in ./destinations/<destinationSlug/<actionSlug>/schema.json
    "mapping": { ... },

    // See ./destinations/<destinationSlug>/<actionSlug>/settings.json
    "settings": { ... }
  }
]
```

Here's a full example:

```json
[
  {
    "subscribe": {
      "type": "track"
    },
    "partnerAction": "postToChannel",
    "mapping": {
      "text": {
        "@handlebars": "Tracked! event={{event}}, {{properties.text}}"
      }
    },
    "settings": {
      "url": "https://hooks.slack.com/services/0HL7TC62R/0T276CRHL/8WvI6gEiE9ZqD47kWqYbfIhZ",
      "channels": ["test-fab-5"]
    }
  },
  {
    "subscribe": {
      "type": "identify"
    },
    "partnerAction": "postToChannel",
    "mapping": {
      "text": {
        "@handlebars": "User identified! email={{email}}"
      }
    },
    "settings": {
      "url": "https://hooks.slack.com/services/0HL7TC62R/0T276CRHL/8WvI6gEiE9ZqD47kWqYbfIhZ",
      "channels": ["test-fab-5"]
    }
  }
]
```
