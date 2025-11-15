import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

function copyRecursive(src, dest) {
  if (!existsSync(src)) {
    console.warn(`Source directory ${src} does not exist`)
    return
  }

  const stats = statSync(src)
  if (stats.isDirectory()) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true })
    }
    const files = readdirSync(src)
    for (const file of files) {
      copyRecursive(join(src, file), join(dest, file))
    }
  } else {
    const destDir = dirname(dest)
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }
    copyFileSync(src, dest)
  }
}

const cesiumSource = join(rootDir, 'node_modules/cesium/Build/Cesium')
const cesiumDest = join(rootDir, 'public/Cesium')

const assetsToCopy = ['Workers', 'ThirdParty', 'Assets', 'Widgets']

console.log('Copying Cesium assets...')
for (const asset of assetsToCopy) {
  const src = join(cesiumSource, asset)
  const dest = join(cesiumDest, asset)
  if (existsSync(src)) {
    copyRecursive(src, dest)
    console.log(`✓ Copied ${asset}`)
  } else {
    console.warn(`⚠ ${asset} not found at ${src}`)
  }
}
console.log('Cesium assets copied successfully!')

