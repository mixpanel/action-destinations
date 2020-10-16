# Fab 5 Engine

[![Build status](https://badge.buildkite.com/ec5e2cfa66d153ebaf3477af80de2a23f17b647e11e148c63c.svg?branch=master)](https://buildkite.com/segment/fab-5-engine)

Fab 5 Engine is an early prototype implementation of five destinations following the Destinations
2.0 vision. 2.0 destinations are comprised of one or more subscriptions ("if" statements) that
trigger partner actions along with a mapping that maps the incoming event to a payload that matches
the action's schema.

![Destinations 2.0 flow][architecture]

See also: [Beginner's Guide][beginner]

[architecture]: https://user-images.githubusercontent.com/111501/83700205-10f23e80-a5bb-11ea-9fbe-b1b10c1ed464.png
[beginner]: https://paper.dropbox.com/doc/Fab-5-Engine-Beginners-Guide--A2~KoOcu4qM1rlyX_ZfpyCFTAg-BMfDUPaKMvghmXEtaZpq2

```
$ robo prod.ssh
$ git clone git@github.com:segmentio/fab-5-engine.git
$ cd fab-5-engine
$ yarn install
```

## Test Actions Locally

To test actions locally, you send a curl request. For example:

```sh
curl --request POST \
  --url http://localhost:3000/actions/5f7dd8e302173ff732db5cc4 \
  --header 'content-type: application/cloudevents-batch+json' \
  --data '[
	{
		"id": "dkjfksldfjiuhfenjk",
		"source": "some-source",
		"destination": "slack",
		"data": {
			"channel": "server",
			"context": {
				"library": {
					"name": "unknown",
					"version": "unknown"
				}
			},
			"event": "Example Event",
			"integrations": {},
			"messageId": "api-1iI59hvBEtckNicjbfqG7VdjRw2",
			"projectId": "29qHxXL9muph5R19vwAnDP",
			"properties": {
				"text": "Hello, from dev :blobcatwave:!"
			},
			"receivedAt": "2020-10-01T19:55:15.068Z",
			"timestamp": "2020-10-01T19:55:15.068Z",
			"type": "track",
			"userId": "sloth@segment.com",
			"version": 2
		},
		"settings": {
			"subscriptions":  [
			{
				"mapping": {
					"channel": "test-fab-5",
					"url": "https://hooks.slack.com/services/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",
					"text": {
						"@template": "Event = {{event}}, properties.text = {{properties.text}}"
					}
				},
				"partnerAction": "postToChannel",
				"subscribe": {
					"operator": "and",
					"children": [
						{
							"operator": "=",
							"type": "event-type",
							"value": "track"
						}
					]
				}
			}
		]
		}
	}
]'
```

## Configuring

Fab 5 destinations are configured using a single Destination Function setting (`subscriptions`) that
should contain a JSON blob of all subscriptions for the destination. The format should look like
this:

```js
[
  {
    // "type" subscriptions are the only ones supported currently
    "subscribe": {
      "type": "<eventType>"
    },

    "partnerAction": "<actionSlug>",

    // See ./lib/mapping-kit/README.md for documentation. The schema for each partner action is
    // defined in ./destinations/<destinationSlug/<actionSlug>/schema.json
    "mapping": { ... },

    // See ./destinations/<destinationSlug>/<actionSlug>/settings.json. This can be a mapping-kit
    // mapping definition. See ./lib/mapping-kit/README.md for documentation.
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
        "@template": "Tracked! event={{event}}, {{properties.text}}"
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
        "@template": "User identified! email={{email}}"
      }
    },
    "settings": {
      "url": "https://hooks.slack.com/services/0HL7TC62R/0T276CRHL/8WvI6gEiE9ZqD47kWqYbfIhZ",
      "channels": ["test-fab-5"]
    }
  }
]
```

## Misc.

Code in this repo is formatted using `eslint`. You can format everything by running `yarn lint`.
