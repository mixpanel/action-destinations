export interface AutocompleteResponse {
  body: {
    data: AutocompleteItem[]
    pagination: {
      nextPage?: string
    }
  }
}

export interface AutocompleteItem {
  label: string
  value: string
}
