const { readdirSync } = require('fs')
const { join } = require('path')
const validate = require('./validate')

function* fixtures(subdir) {
  const path = join(__dirname, 'schema-fixtures', subdir)
  const files = readdirSync(path, { withFileTypes: true }).filter(f => f.isFile() && f.name.match(/\.json$/))

  for (const f of files) {
    const { mapping, expectError } = require(join(path, f.name))
    yield {
      name: f.name,
      mapping,
      expectError
    }
  }
}

describe('validation', () => {
  describe('passes valid mappings', () => {
    for (const fixture of fixtures('valid')) {
      it(fixture.name, () => {
        expect(() => {
          validate(fixture.mapping)
        }).not.toThrow()
      })
    }
  })

  describe('fails invalid mappings', () => {
    for (const fixture of fixtures('invalid')) {
      it(fixture.name, () => {
        expect(typeof fixture.expectError).toStrictEqual('string')
        expect(fixture.expectError.length).not.toStrictEqual(0)
        expect(() => {
          validate(fixture.mapping)
        }).toThrow(new Error(fixture.expectError))
      })
    }
  })
})
