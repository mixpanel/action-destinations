import Mustache from 'mustache'

export function renderTemplate(template: string, data?: unknown) {
  return Mustache.render(template, data)
}
