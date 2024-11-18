import type { DeepMerge, SimplifyDeep } from './types'

/**
 * Deep Merge
 *
 * Merges arrays if both configs are arrays, otherwise does object deep merge.
 *
 * @param target - The target object.
 * @param sources - The source objects.
 * @returns The merged object.
 * @example ```ts
 * deepMerge({ foo: 'bar' }, { bar: 'baz' })
 * deepMerge([{ foo: 'bar' }], [{ bar: 'baz' }])
 * deepMerge({ foo: 'bar' }, [{ foo: 'baz' }])
 * ```
 */
export function deepMerge<T, S>(target: T, ...sources: S[]): T extends object
  ? S extends any[]
    ? S
    : S extends object
      ? SimplifyDeep<DeepMerge<T, S>>
      : T
  : T extends any[]
    ? S extends any[]
      ? T
      : T
    : T {
  if (!sources.length)
    return target as any

  const source = sources.shift()
  if (!source)
    return target as any

  if (Array.isArray(source) !== Array.isArray(target)
    || isObject(source) !== isObject(target)) {
    return source as any
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source] as any
  }

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key]
        if (!Object.prototype.hasOwnProperty.call(target, key)) {
          (target as any)[key] = sourceValue
          continue
        }

        (target as any)[key] = deepMerge((target as any)[key], sourceValue)
      }
    }
  }

  return deepMerge(target, ...sources)
}

function isObject(item: unknown): item is Record<string, unknown> {
  return (item && typeof item === 'object' && !Array.isArray(item)) as boolean
}
