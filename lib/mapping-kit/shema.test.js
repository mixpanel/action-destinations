const { readdirSync, readFileSync } = require('fs')
const { join } = require('path')
const Ajv = require('ajv') // JSON Schema validator

function * fixtures (subdir) {
  const path = join(__dirname, 'schema-fixtures', subdir)
  const files = readdirSync(path, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.match(/\.json$/))

  for (const f of files) {
    yield ({
      name: f.name,
      json: readFileSync(join(path, f.name), 'utf-8')
    })
  }
}

describe('mapping schema', () => {
  it('is valid', () => {
    const path = join(__dirname, 'schema.json')
    let schema
    expect(() => {
      const json = readFileSync(path, 'utf-8')
      schema = JSON.parse(json)
    }).not.toThrow()

    const ajv = new Ajv()
    ajv.validateSchema(schema)
    expect(ajv.errorsText()).toBe('No errors')
  })

  describe('passes valid mappings', () => {
    for (const fixture of fixtures('valid')) {
      it(fixture.name, () => {
        const ajv = new Ajv()
        let schema
        expect(() => { schema = JSON.parse(fixture.json) }).not.toThrow()
        ajv.validate(schema)
        expect(ajv.errors).toBe(null)
      })
    }
  })
})
