function destination () {}
function handlebars () {}
function expr () {}
function object () {}
const validate = {
  isURL () {}
}
const map = {
  'if' () {}
}

// ---

// context:
// - event
// - variables
// - helpers

const Slack = destination('Slack')
  .variable('webhookUrl', 'string', {
    description: 'Webhook URL for posting messages.',
    validations: [
      validate.isURL({
        https: true,
        host: ['*.slack.com', '*.discordapp.com']
      })
    ]
  })
  .variable('channels', 'strings', {
    description: 'Slack channels to post messages to.',
    validations: [
      validate.notEmpty()
    ]
  })
  .helper('prettyName', ({ event }) => {
    const name = event.get('traits.name')
    const firstName = event.get('traits.firstName')
    const lastName = event.get('traits.lastName')
    const username = event.get('traits.username')
    const email = event.get('properties.email')
    const userId = event.get('userId')
    const anonymousId = event.get('anonymousId')

    if (name) return name
    if (firstName && lastName) return `${firstName} ${lastName}`
    if (firstName) return firstName
    if (lastName) return lastName
    if (username) return username
    if (email) return email
    if (userId) return `User ${userId}`
    return `Anonymous user ${anonymousId}`
  })
  .schema('payload', {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'http://example.com/slack/payload.schema.json',
    title: 'Message',
    description: 'A Slack message.',
    type: 'object',
    properties: {
      productId: {
        description: 'The unique identifier for a product',
        type: 'integer'
      },
      productName: {
        description: 'Name of the product',
        type: 'string'
      },
      price: {
        description: 'The price of the product',
        type: 'number',
        exclusiveMinimum: 0
      },
      tags: {
        description: 'Tags for the product',
        type: 'array',
        items: {
          type: 'string'
        },
        minItems: 1,
        uniqueItems: true
      },
      dimensions: {
        type: 'object',
        properties: {
          length: {
            type: 'number'
          },
          width: {
            type: 'number'
          },
          height: {
            type: 'number'
          }
        },
        required: ['length', 'width', 'height']
      },
      warehouseLocation: {
        description: 'Coordinates of the warehouse where the product is located.',
        $ref: 'https://example.com/geographical-location.schema.json'
      }
    },
    required: ['productId', 'productName', 'price']
  })

Slack.subscribe({ type: 'identify' })
  .fanOut({ on: 'variables.channels', as: 'channel' })
  .map('payload', {
    channel: handlebars('{{channel}}'),
    text: map.if(
      expr('false || true'),
      handlebars('{{helpers.prettyName}} has been identified!')
    ),
    username: 'Segment',
    icon_url: 'https://logo.clearbit.com/segment.com'
  })
  .http('POST', handlebars('{{variables.webhookUrl}}'), {
    type: 'json',
    body: object('payload')
  })
  .fanIn()

Slack.subscribe({ fql: 'type = "track" and match(event, "Test*")' })
  .fanOut({ on: 'variables.channels', as: 'channel' })
  .map('payload', {
    channel: handlebars('{{channel}}'),
    text: map.if(
      expr('false || true'),
      handlebars('{{helpers.prettyName}} did {{event.event}}')
    ),
    username: 'Segment',
    icon_url: 'https://logo.clearbit.com/segment.com'
  })
  .http('POST', handlebars('{{variables.webhookUrl}}'), {
    type: 'json',
    body: object('payload')
  })
  .fanIn()
