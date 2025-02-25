import { readFile, writeFile } from 'node:fs/promises'
import { dts } from 'bun-plugin-dtsx'

console.log('Building...')

// Build the main package
await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  target: 'bun',
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

console.log('Built and updated dynamic imports')
