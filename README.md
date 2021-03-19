# Fab 5 Engine

[![Build status](https://badge.buildkite.com/ec5e2cfa66d153ebaf3477af80de2a23f17b647e11e148c63c.svg?branch=master)](https://buildkite.com/segment/fab-5-engine)

Fab 5 Engine is a prototype of destinations following the Destinations 2.0 vision. 2.0 destinations are comprised of one or more subscriptions ("if" statements) that trigger partner actions along with a mapping that transforms the incoming event to a payload that matches the action's schema.

![Destinations 2.0 flow][architecture]

See also: [Destination Actions Interface][paper]

[architecture]: https://user-images.githubusercontent.com/111501/83700205-10f23e80-a5bb-11ea-9fbe-b1b10c1ed464.png
[paper]: https://paper.dropbox.com/doc/Destination-Actions-Interface--BEm_rg0r5EoNyrJriPt~tOA7Ag-BS1RKGj9VKTcjqLrCSuBV

## Local Development

This project is a monorepo with multiple packages using Yarn Workspaces:

- `packages/cli` - a set of command line tools for interacting with the repo
- `packages/destinations-actions` - an npm package for use in `integrations`
- `packages/browser-destinations` - an npm package for use in `@segment/analytics-next`
- `packages/server` - a data plane ECS service (the main `app.js`) and control plane ECS service (`ops/server.js`)

```
$ goto fab-5-engine
$ yarn install
$ yarn start
```

To install deps in a particular workspace (i.e. `packages/*`) you will need to use one of our shorthand commands defined in the root package.json's `scripts` section:

- `yarn actions <add/remove> <package>`
- `yarn server <add/remove> <package>`
- `yarn cli <add/remove> <package>`

Or you can use the native Yarn longhand command:

- `yarn workspace @segment/destination-actions <add/remove> <package>`
- `yarn workspace @segment/browser-destinations <add/remove> <package>`
- `yarn workspace @segment/destination-actions-server <add/remove> <package>`
- `yarn workspace @segment/destination-actions-cli <add/remove> <package>`

To install deps across all workspaces, i.e. in the root package.json:

- `yarn <add/remove> -W <package>`

## NPM Package

This repository also is used to publish a subset of the functionality as an npm package that can be used in the `integrations` monoservice. It contains only the destination definitions and the destination-kit / mapping-kit code to run them.

Publishing is done via `yarn np` and the package output is compiled using the `tsconfig.package.json`

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
      "subscription": {
        "mapping": {
          "channel": "test-fab-5",
          "url": "https://hooks.slack.com/services/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",
          "text": {
            "@template": "Event = {{event}}, properties.text = {{properties.text}}"
          }
        },
        "partnerAction": "postToChannel",
        "subscribe": "type = \"track\""
      }
    }
  }
]'
```

## Configuring

Action destinations are configured using a single Destination setting (`subscriptions`) that should contain a JSON blob of all subscriptions for the destination. The format should look like this:

```js
[
  {
    "subscribe": "<fql query>",
    "partnerAction": "<actionSlug>",

    // See ./lib/mapping-kit/README.md for documentation. The keys in this object should match the `action.fields`
    "mapping": { ... }
  }
]
```

Here's a full example:

```json
[
  {
    "subscribe": "type = 'track'",
    "partnerAction": "postToChannel",
    "mapping": {
      "text": {
        "@template": "Tracked! event={{event}}, {{properties.text}}"
      },
      "url": "https://hooks.slack.com/services/0HL7TC62R/0T276CRHL/8WvI6gEiE9ZqD47kWqYbfIhZ",
      "channel": "test-fab-5"
    }
  },
  {
    "subscribe": "type = 'identify'",
    "partnerAction": "postToChannel",
    "mapping": {
      "text": {
        "@template": "User identified! email={{email}}"
      },
      "url": "https://hooks.slack.com/services/0HL7TC62R/0T276CRHL/8WvI6gEiE9ZqD47kWqYbfIhZ",
      "channel": "test-fab-5"
    }
  }
]
```

## Syncing json schemas

Everytime the definition for destinations or actions changes, run the following commands:

```sh
$ robo sshuttle
$ yarn cli sync-json-schemas
#  If the above commands worked without any issues, continue
$ robo prod.ssh
$ goto fab-5-engine && yarn install
$ yarn cli sync-json-schemas
```

## Deploying

Deploying changes to destination actions is slightly different depending on changes for browser destinations (the `browser-destinations` package) or cloud destinations (the `destination-actions` package). For cloud destinations you can follow this guide:

1. Merge PR into `master` (with tests + approval)
2. Check out latest master changes locally – `git checkout master && git fetch origin && git rebase origin/master`
3. Publish privately to npm – `yarn workspace @segment/destination-actions publish --access restricted`
4. In [`integrations`](https://github.com/segmentio/integrations/), upgrade the package: `yarn upgrade @segment/destination-actions`
5. Merge your `integrations` PR once CI passes and it is approved by the Integrations team ([here's an example PR](https://github.com/segmentio/integrations/pull/1820/files#diff-7ae45ad102eab3b6d7e7896acd08c427a9b25b346470d7bc6507b6481575d519))

Once your commit to `integrations#master` finishes in CI, [autotreb will deploy it](https://github.com/segmentio/integrations/blob/master/.run/integration-actions.yml#L36-L40) separately from the rest of the integrations services (to avoid disrupting other integrations and a lengthy deploy process via terraform).
