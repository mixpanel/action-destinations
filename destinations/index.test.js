const destinations = require('.')

describe('metadata', () => {
  test('load it up!', () => {
    const all = destinations()
    expect(Array.isArray(all)).toBe(true)

    for (const destination of all) {
      expect(Object.keys(destination).sort()).toStrictEqual(
        [
          'name',
          'slug',
          'path',
          'settings',
          'defaultSubscriptions',
          'partnerActions'
        ].sort()
      )

      for (const action of destination.partnerActions) {
        expect(Object.keys(action).sort()).toStrictEqual(
          ['slug', 'settings', 'schema', 'code'].sort()
        )
      }
    }
  })
})
