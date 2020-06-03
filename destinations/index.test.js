const destinations = require('.')

describe('metadata', () => {
  test('load it up!', () => {
    const all = destinations()
    expect(typeof all).toBe('object')
  })
})
