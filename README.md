# Fab 5 Engine

[![Build status](https://badge.buildkite.com/ec5e2cfa66d153ebaf3477af80de2a23f17b647e11e148c63c.svg?branch=master)](https://buildkite.com/segment/fab-5-engine)

Fab 5 Engine is an early prototype implementation of five destinations following the Destinations
2.0 vision. 2.0 destinations are comprised of one or more subscriptions ("if" statements) that
trigger partner actions along with a mapping that maps the incoming event to a payload that matches
the action's schema.

![Destinations 2.0 flow][architecture]

Using the included `./cli.js` command, you can deploy the Fab 5 destinations to staging or, from
a workbench, production.

See also: [Beginner's Guide][beginner]

[architecture]: https://user-images.githubusercontent.com/111501/83700205-10f23e80-a5bb-11ea-9fbe-b1b10c1ed464.png
[beginner]: https://paper.dropbox.com/doc/Fab-5-Engine-Beginners-Guide--A2~KoOcu4qM1rlyX_ZfpyCFTAg-BMfDUPaKMvghmXEtaZpq2

## CLI

The `./cli.js` command allows you to create destinations and actions from templates and run actions locally:

```
cli.js <command>

Commands:
  cli.js run-local <action>                 Run a partner action locally.
  cli.js new-destination <slug>             Create a new destination from a template.
  cli.js new-action <destination> <action>  Create a new action from a template.

Options:
  --version  Show version number  [boolean]
  --help     Show help  [boolean]
```

To run commands in staging, run `robo sshuttle` in another terminal session on your local machine
and then run `./cli.js` locally. To run commands in production, SSH in to the workbench and check
out this repository:

```
% robo prod.ssh
% git clone git@github.com:segmentio/fab-5-engine.git
% cd fab-5-engine
% yarn install
% ./cli.js
```

## Test Actions Locally

To test actions locally, you can use `./cli.js run-local`. For example:

```
./cli.js run-local ./dist/src/destinations/slack/postToChannel -i ./sample/slack
```

## Inspecting

If you want to dump the definition metadata for all destinations, run this:

```
$ node -e "console.log(JSON.stringify(require('./destinations')()))"
[
  {
    "name": "No-op",
    "defaultSubscriptions": [
      {
        "subscribe": "all",
        "partnerAction": "noop"
      }
    ],
    "slug": "noop",
    "path": "/Users/tysonmote/dev/src/github.com/segmentio/fab-5-engine/destinations/noop",
    "settings": [],
    "partnerActions": [
      {
        "slug": "noop",
        "settings": [],
        "mapping": null,
        "schema": null,
        "code": "require('../../../lib/action-kit')\n\nmodule.exports = action()\n ..."
      }
    ]
  },
...
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
