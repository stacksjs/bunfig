/**
 * Deep merge objects or arrays
 *
 * @param target - The target object or array
 * @param sources - The source objects or arrays
 * @returns The merged result
 */
export function deepMerge<T>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length)
    return target

  const source = sources.shift()
  if (!source)
    return target

  if (Array.isArray(target) && Array.isArray(source)) {
    // If both are arrays, concatenate them
    return [...target, ...source] as T
  }

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key]
        if (Array.isArray(sourceValue) && Array.isArray((target as any)[key])) {
          // Merge arrays within objects
          (target as any)[key] = [...(target as any)[key], ...sourceValue]
        }
        else if (isObject(sourceValue) && isObject((target as any)[key])) {
          // Deep merge nested objects
          (target as any)[key] = deepMerge((target as any)[key], sourceValue)
        }
        else {
          // Replace primitive values and objects/arrays that don't match in type
          (target as any)[key] = sourceValue
        }
      }
    }
  }

  return deepMerge(target, ...sources)
}

function isObject(item: unknown): item is Record<string, unknown> {
  return (item && typeof item === 'object' && !Array.isArray(item)) as boolean
}
