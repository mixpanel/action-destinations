'use strict'

module.exports = async (req, { payload, settings, page }) => {
  const response = await req('marketing/lists', {
    searchParams: {
      page_token: page
    }
  })

  const items = response.body.result.map(list => ({
    label: list.name,
    value: list.id
  }))

  let nextPage

  if (response.body._metadata.next) {
    nextPage = new URL(response.body._metadata.next).searchParams.get(
      'page_token'
    )
  }

  return {
    body: {
      data: items,
      pagination: { nextPage }
    }
  }
}
