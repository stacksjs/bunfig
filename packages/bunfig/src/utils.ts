import type { ArrayMergeStrategy, DeepMerge, SimplifyDeep } from './types'

/**
 * Get a value from environment variables or return a default value
 * @param key - Environment variable key
 * @param defaultValue - Default value if environment variable is not set
 * @returns The environment variable value or default value
 */
export function getEnvOrDefault<T>(key: string, defaultValue: T): T {
  // eslint-disable-next-line ts/no-require-imports
  const process = require('node:process')
  if (typeof process === 'undefined' || !process.env)
    return defaultValue

  const envValue = process.env[key]
  return envValue !== undefined ? (envValue as unknown as T) : defaultValue
}

/**
 * Merge strategies for array handling
 */
export const ArrayMergeStrategies = {
  /** Replace target array with source array */
  replace: 'replace',
  /** Concatenate arrays with deduplication based on content */
  concat: 'concat',
  /** Merge arrays by key for object arrays, concat for primitives */
  smart: 'smart',
} as const

export type ArrayMergeMode = keyof typeof ArrayMergeStrategies

/**
 * Deep merge configuration options
 */
export interface DeepMergeOptions {
  /** How to handle array merging */
  arrayMergeMode?: ArrayMergeMode
  /** Whether to skip null/undefined values from source */
  skipNullish?: boolean
  /** Custom merge function for specific types */
  customMerger?: (target: unknown, source: unknown, key?: string) => unknown | undefined
}

/**
 * Deep Merge
 *
 * Merges two objects or arrays deeply with configurable behavior.
 *
 * @param target - The target object (default config)
 * @param source - The source object (loaded config that should override defaults)
 * @param options - Merge configuration options
 * @returns The merged object
 */
export function deepMerge<T, S>(
  target: T,
  source: S,
  options: DeepMergeOptions = {},
): T extends any[]
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
  // Initialize circular reference tracking if not already done
  const visited = new WeakMap()
  return deepMergeWithVisited(target, source, options, visited) as any
}

function deepMergeWithVisited<T, S>(
  target: T,
  source: S,
  options: DeepMergeOptions,
  visited: WeakMap<object, any>,
): any {
  const {
    arrayMergeMode = 'replace', // Default: simple replacement behavior
    skipNullish = false, // Default: allow null/undefined to override
    customMerger,
  } = options

  // Handle null or undefined source
  if (source === null || source === undefined) {
    return skipNullish ? target as any : source as any
  }

  // Allow custom merge logic
  if (customMerger) {
    const customResult = customMerger(target, source)
    if (customResult !== undefined) {
      return customResult as any
    }
  }

  // Handle arrays
  if (Array.isArray(source) || Array.isArray(target)) {
    return mergeArraysWithVisited(target, source, arrayMergeMode, visited) as any
  }

  // Handle non-objects (primitives)
  if (!isObject(source) || !isObject(target)) {
    return source as any
  }

  // Handle objects with circular reference detection
  return mergeObjectsWithVisited(target, source, options, visited) as any
}

function mergeArraysWithVisited<T, S>(target: T, source: S, mode: ArrayMergeMode, visited: WeakMap<object, any>): T | S | unknown[] {
  // If types differ, source takes precedence
  if (Array.isArray(source) && !Array.isArray(target)) {
    return source
  }
  if (Array.isArray(target) && !Array.isArray(source)) {
    return source
  }

  // If both are arrays
  if (Array.isArray(source) && Array.isArray(target)) {
    switch (mode) {
      case 'replace':
        return source

      case 'concat':
        return concatArraysWithDedup(target, source)

      case 'smart':
        return smartMergeArraysWithVisited(target, source, visited)

      default:
        return source
    }
  }

  return source
}

/**
 * Concatenate arrays with deduplication
 */
function concatArraysWithDedup<T extends unknown[]>(target: T, source: T): T {
  const result = [...source]

  for (const item of target) {
    if (!result.some(existingItem => deepEquals(existingItem, item))) {
      result.push(item)
    }
  }

  return result as T
}

function smartMergeArraysWithVisited<T extends unknown[]>(target: T, source: T, visited: WeakMap<object, any>): T {
  if (source.length === 0)
    return target
  if (target.length === 0)
    return source

  // For arrays of objects, merge by key and add missing items
  if (isObject(source[0]) && isObject(target[0])) {
    return mergeObjectArraysWithVisited(target, source, visited) as T
  }

  // For primitive arrays, concatenate with deduplication (only for string arrays)
  if (source.every(item => typeof item === 'string') && target.every(item => typeof item === 'string')) {
    const result = [...source]
    for (const item of target) {
      if (!result.includes(item)) {
        result.push(item)
      }
    }
    return result as T
  }

  // Default to replacement for mixed types
  return source
}

/**
 * Merge arrays of objects by common identifiers
 */
function _mergeObjectArrays<T extends Record<string, unknown>[]>(target: T, source: T): T {
  const result = [...source]

  for (const targetItem of target) {
    if (!isObject(targetItem)) {
      result.push(targetItem)
      continue
    }

    // Try to find matching item by common identifier keys
    const identifierKeys = ['id', 'name', 'key', 'path', 'type']
    let hasMatch = false

    for (const key of identifierKeys) {
      if (key in targetItem) {
        const existingItem = result.find(item =>
          isObject(item) && key in item && item[key] === targetItem[key],
        )
        if (existingItem) {
          hasMatch = true
          break
        }
      }
    }

    // If no matching item found by any identifier, add the target item
    if (!hasMatch) {
      result.push(targetItem)
    }
    // If matching item found, source takes precedence (already in result)
  }

  return result as T
}

function mergeObjectArraysWithVisited<T extends Record<string, unknown>[]>(target: T, source: T, _visited: WeakMap<object, any>): T {
  const result = [...source]

  for (const targetItem of target) {
    if (!isObject(targetItem)) {
      result.push(targetItem)
      continue
    }

    // Try to find matching item by common identifier keys
    const identifierKeys = ['id', 'name', 'key', 'path', 'type']
    let hasMatch = false

    for (const key of identifierKeys) {
      if (key in targetItem) {
        const existingItem = result.find(item =>
          isObject(item) && key in item && item[key] === targetItem[key],
        )
        if (existingItem) {
          hasMatch = true
          break
        }
      }
    }

    // If no matching item found by any identifier, add the target item
    if (!hasMatch) {
      result.push(targetItem)
    }
    // If matching item found, source takes precedence (already in result)
  }

  return result as T
}

/**
 * Merge objects recursively with circular reference detection
 */
function mergeObjectsWithVisited<T, S>(target: T, source: S, options: DeepMergeOptions, visited: WeakMap<object, any>): Record<string, unknown> {
  const sourceObj = source as Record<string, unknown>

  // Check for circular reference in source
  if (isObject(sourceObj) && visited.has(sourceObj)) {
    return visited.get(sourceObj)
  }

  const merged = { ...target } as Record<string, unknown>

  // Mark source as visited
  if (isObject(sourceObj)) {
    visited.set(sourceObj, merged)
  }

  for (const key in sourceObj) {
    if (!Object.prototype.hasOwnProperty.call(sourceObj, key)) {
      continue
    }

    const sourceValue = sourceObj[key]
    const targetValue = merged[key]

    // Skip null/undefined if configured to do so
    if (options.skipNullish && (sourceValue === null || sourceValue === undefined)) {
      continue
    }

    // Handle null/undefined values explicitly
    if (sourceValue === null || sourceValue === undefined) {
      merged[key] = sourceValue
      continue
    }

    // Recursively merge nested objects
    if (isObject(sourceValue) && isObject(targetValue)) {
      merged[key] = deepMergeWithVisited(targetValue, sourceValue, options, visited)
    }
    // Handle arrays
    else if (Array.isArray(sourceValue) || Array.isArray(targetValue)) {
      merged[key] = mergeArraysWithVisited(targetValue, sourceValue, options.arrayMergeMode || 'smart', visited)
    }
    // Primitive values override
    else {
      merged[key] = sourceValue
    }
  }

  return merged
}

/**
 * Deep merge with configurable array strategy.
 * - strategy 'replace' (default): source arrays replace target arrays
 * - strategy 'merge': use deepMerge behavior that merges arrays uniquely
 */
export function deepMergeWithArrayStrategy<T, S>(
  target: T,
  source: S,
  strategy: ArrayMergeStrategy = 'replace',
): any {
  const arrayMergeMode: ArrayMergeMode = strategy === 'replace' ? 'replace' : 'smart'

  return deepMerge(target, source, {
    arrayMergeMode,
    skipNullish: true, // Skip null/undefined in config loading to preserve defaults
  })
}

// Helper for deep equality check
function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b)
    return true

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length)
      return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i]))
        return false
    }
    return true
  }

  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length)
      return false

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key))
        return false
      if (!deepEquals(a[key], b[key]))
        return false
    }

    return true
  }

  return false
}

function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item))
}
