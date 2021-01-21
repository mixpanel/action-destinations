import asyncWrapper from '../async-handler'

test('asyncWrapper passes errors to express', async () => {
  const error = new Error('test')
  const middleware = asyncWrapper(
    // eslint-disable-next-line @typescript-eslint/require-await
    async () => {
      throw error
    }
  )
  const next = jest.fn()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/await-thenable
  await middleware({} as any, {} as any, next)

  expect(next).toBeCalledWith(error)
})
