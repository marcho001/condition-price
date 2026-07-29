let counter = 0

/** 供 UI 建立新實體用。引擎內部一律用注入的 nextId，不用這個。 */
export function newId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter.toString(36)}-${Math.floor(performance.now()).toString(36)}`
}
