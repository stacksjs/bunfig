// Fallback declaration for the virtual module used to provide dynamic config name types.
// Build tools can override this by supplying the real virtual module via a plugin.
declare module 'virtual:bunfig-types' {
  export type ConfigNames = string
}
