'use strict'

const {destination, handlebars, validate} = require('./integration')

const Slack = destination('Slack')
    .variable('webhookUrl', '', {
        description: 'A slack.com or discordapp.com webhook URL.',
        validations: [
            validate.isURL({https: true}),
            validate.matchRegex('^https:\\/\\/([a-zA-Z0-9.-]+\\.)?(slack|discordapp).com', {message: 'Must be a valid Slack or Discord URL.'})
        ]
    })
    .variable('channels', [], {
        description: 'Slack channels to post messages to.',
        validations: [validate.notEmpty()]
    })
    .helper('prettyName', ({event}) => {
        const name = event.findTrait('name')
        const firstName = event.findTrait('firstName')
        const lastName = event.findTrait('lastName')
        const username = event.findTrait('username')
        const email = event.findEmail()
        const userId = event.userId()
        const anonymousId = event.anonymousId()

        if (name) return name
        if (firstName && lastName) return `${firstName} ${lastName}`
        if (firstName) return firstName
        if (lastName) return lastName
        if (username) return username
        if (email) return email
        if (userId) return `User ${userId}`
        return `Anonymous user ${anonymousId}`
    })

Slack.subscribe({fql: 'type = "track" and match(event, "Test*")'})
    .transform('properties.name', transformations.underscore)
    .forEach(({variables}) => { return variables.channels })
        .post(handlebars`{{variables.webhookUrl}}`, {
            type: 'json',
            body: {
                text: handlebars`{{helpers.prettyName}} did {{event.event}}`,
                username: 'Segment',
                icon_url: 'https://logo.clearbit.com/segment.com'
            }
        })
    .end()

Slack.subscribe({type: 'identify'})
    .variable('whitelistTraits', [], {
        description: 'Whitelist of traits to post in Slack message.'
    })
    .helper('traitsText', ({event, variables}) => {
        return variables.whitelistTraits.map((trait) => {
            return `${trait}: ${event.findTrait(trait)}`
        }).join('\n')
    })
    .forEach(({variables}) => { return variables.channels })
        .post(handlebars`{{variables.webhookUrl}}`, {
            type: 'json',
            body: {
                text: handlebars`Identified {{helpers.prettyName}}\n\n{{helpers.traitsText}}`,
                username: 'Segment',
                icon_url: 'https://logo.clearbit.com/segment.com'
            }
        })
    .end()

console.log(Slack)