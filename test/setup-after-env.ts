import nock from 'nock'

jest.mock('@/lib/stats')

beforeEach(() => {
  // Removes mocks between unit tests so they run in isolation
  nock.cleanAll()
})

beforeAll(() => {
  if (!nock.isActive()) {
    nock.activate()
  }
})

afterAll(() => {
  // Avoids memory-leaks with the way nock monkey-patches http and Jest messes with modules
  nock.restore()
})
