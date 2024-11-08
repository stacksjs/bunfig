/**
 * Deep merge objects
 *
 * @param target - The target object
 * @param sources - The source objects
 * @returns The merged object
 * @example deepMerge({ foo: 'bar' }, { bar: 'baz' }) // { foo: 'bar', bar: 'baz' }
 */
export function deepMerge<T extends object>(target: T, ...sources: Array<Partial<T>>): T {
  if (!sources.length)
    return target

  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key]
        if (isObject(sourceValue) && isObject(target[key])) {
          target[key] = deepMerge(target[key] as any, sourceValue as any)
        }
        else {
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
