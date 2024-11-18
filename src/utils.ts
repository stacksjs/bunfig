import type { DeepMerge, SimplifyDeep } from './types'

/**
 * Deep Merge
 *
 * Merges two objects or arrays deeply.
 *
 * @param target - The target object (default config).
 * @param source - The source objects (loaded configs that should override defaults).
 * @returns The merged object.
 */
export function deepMerge<T, S>(target: T, source: S): T extends any[]
  ? S extends any[]
    ? Array<SimplifyDeep<DeepMerge<T[number], S[number]>>>
    : S
  : T extends object
    ? S extends any[]
      ? S
      : S extends object
        ? SimplifyDeep<DeepMerge<T, S>>
        : T
    : T {
  // If source is an array and target isn't, return source
  if (Array.isArray(source) && !Array.isArray(target)) {
    return source as any
  }

  // If both are arrays, merge their contents
  if (Array.isArray(source) && Array.isArray(target)) {
    return source.map((sourceItem, index) => {
      const targetItem = target[index]
      if (isObject(sourceItem) && isObject(targetItem)) {
        return deepMerge(targetItem, sourceItem)
      }
      return sourceItem
    }) as any
  }

  // Handle non-objects (primitives)
  if (!isObject(source) || !isObject(target)) {
    return source as any
  }

  // Handle objects
  const merged = { ...target } as any

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key]
      const targetValue = merged[key]

      if (sourceValue === null || sourceValue === undefined) {
        merged[key] = sourceValue
      }
      else if (isObject(sourceValue) && isObject(targetValue)) {
        merged[key] = deepMerge(targetValue, sourceValue)
      }
      else {
        merged[key] = sourceValue
      }
    }
  }

  return merged
}

function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item))
}
