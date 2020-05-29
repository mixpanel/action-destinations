const { readdirSync } = require('fs')
const { join } = require('path')
const Ajv = require('ajv') // JSON Schema validator

function * fixtures (subdir) {
  const path = join(__dirname, 'schema-fixtures', subdir)
  const files = readdirSync(path, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.match(/\.json$/))

  for (const f of files) {
    yield ({
      name: f.name,
      mapping: require(join(path, f.name))
    })
  }
}

describe('mapping schema', () => {
  const ajv = new Ajv()
  const schema = require(join(__dirname, 'schema.json'))

  it('is valid', () => {
    ajv.validateSchema(schema)
    expect(ajv.errorsText()).toBe('No errors')
  })

  describe('passes valid mappings', () => {
    for (const fixture of fixtures('valid')) {
      it(fixture.name, () => {
        ajv.validate(schema, fixture.mapping)
        expect(ajv.errors).toBe(null)
      })
    }
  })

  describe('fails valid mappings', () => {
    for (const fixture of fixtures('invalid')) {
      it(fixture.name, () => {
        ajv.validate(schema, fixture.mapping)
        expect(ajv.errors).not.toBe(null)
      })
    }
  })
})
