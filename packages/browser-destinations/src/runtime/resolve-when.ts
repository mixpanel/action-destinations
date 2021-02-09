export async function resolveWhen(condition: () => boolean): Promise<void> {
  return new Promise((resolve, _reject) => {
    if (condition()) {
      resolve()
      return
    }

    const check = () =>
      setTimeout(() => {
        if (condition()) {
          resolve()
        } else {
          check()
        }
      })

    check()
  })
}
