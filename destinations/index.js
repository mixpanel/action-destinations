const { statSync, readFileSync, readdirSync } = require('fs')
const { join, basename } = require('path')

module.exports = () => {
  return readdirSync(__dirname)
    .filter(slug => fileExists(filePath(slug, 'destination.json')))
    .map(slug => destinationMetadata(slug))
}

const fileExists = path => {
  try {
    statSync(path)
    return true
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return false
    throw e
  }
}

const filePath = (...path) => {
  return join(__dirname, ...path)
}

// {
//   name: 'Slack',
//   slug: 'slack',
//   path: '/.../destinations/slack',
//   settings: [ ... ],
//   defaultSubscriptions: [ ... ],
//   partnerActions: [ ... ]
// }
const destinationMetadata = slug => {
  return {
    ...require(filePath(slug, 'destination.json')),
    slug,
    path: filePath(slug),
    settings: requireOr(filePath(slug, 'settings.schema.json'), []),
    partnerActions: partnerActions(slug),
  }
}

const partnerActions = destinationSlug => {
  return readdirSync(filePath(destinationSlug))
    .filter(actionSlug =>
      fileExists(filePath(destinationSlug, actionSlug, 'index.js')),
    )
    .map(actionSlug => partnerAction(filePath(destinationSlug, actionSlug)))
}

// {
//   slug: "postToChannel",
//   settings: [ ... ],
//   mapping: { ... },
//   schema: { ... },
//   code: "..."
// }
const partnerAction = path => {
  return {
    slug: basename(path),
    settings: requireOr(join(path, 'settings.schema.json'), []),
    schema: requireOr(join(path, 'payload.schema.json'), null),
    code: readFileSync(join(path, 'index.js'), 'utf-8'),
  }
}

const requireOr = (path, def) => {
  if (fileExists(path)) return require(path)
  return def
}
