import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { dts } from 'bun-plugin-dtsx'

console.log('Building...')

// Build the main package
await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  target: 'bun',
  plugins: [dts()],
})

// Build the ts-plugin
await Bun.build({
  entrypoints: ['src/ts-plugin.ts'],
  outdir: './dist',
  target: 'node',
  plugins: [dts()],
})

// Build the browser version
await Bun.build({
  entrypoints: ['src/browser.ts'],
  outdir: './dist',
  target: 'browser',
  plugins: [dts()],
})

// Build the CLI
await Bun.build({
  entrypoints: ['bin/cli.ts'],
  outdir: './dist',
  target: 'bun',
  plugins: [dts()],
})

// Read the built file
const filePath = './dist/index.js'
const content = await readFile(filePath, 'utf8')

// add vite-ignore to dynamic import to suppress vite warning given we know
const updatedContent = content.replace(
  /await import\(configPath\)/g,
  'await import(/* @vite-ignore */configPath)',
)

// Write the modified content back to the file
await writeFile(filePath, updatedContent)

// Copy the virtual module fallback types to dist so consumers can reference them when needed
try {
  await copyFile('src/virtual-bunfig-types.d.ts', 'dist/virtual-bunfig-types.d.ts')
  console.log('Copied virtual-bunfig-types.d.ts to dist')
}
catch (error) {
  console.warn('Could not copy virtual-bunfig-types.d.ts:', error)
}

console.log('Built and updated dynamic imports')
