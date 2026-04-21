import { dog } from './dog.js'
import { cat } from './cat.js'
import { bird } from './bird.js'

const registry = { dog, cat, bird }

// Returns the template object for a given id, falling back to dog.
export function getTemplate(id) {
  return registry[id] || dog
}

// Merges user params with template defaults and builds line segments.
export function buildFromTemplate(id, params = {}) {
  const template = getTemplate(id)
  const merged = { ...template.defaultParams, ...params }
  return template.build(merged)
}

export const templateIds = Object.keys(registry)
