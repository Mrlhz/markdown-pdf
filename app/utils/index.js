const fs = require('fs-extra')
const path = require('path')

const { statSync } = fs

const { properties } = require('../config/configuration.json')

const showErrorMessage = console.log

function setBooleanValue(a, b) {
  if (a === false) {
    return false
  }
  return a || b
}

function Slug(string) {
  try {
    const stg = encodeURI(
      string.trim()
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace whitespace with -
            .replace(/[\]\[\!\'\#\$\%\&\(\)\*\+\,\.\/\:\\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, '') // Remove known punctuators
            .replace(/^\-+/, '') // Remove leading -
            .replace(/\-+$/, '') // Remove trailing -
    )
    return stg
  } catch (error) {
    console.log('Slug()', error)
  }
}

function getConfiguration(key) {
  const property = properties[key]
  if (property) {
    return property.default
  }
  return ''
}

function getText(filePath) {
  return fs.readFileSync(filePath, { encoding: 'utf8' })
}

function readFile(fileName, { encoding = 'utf8' } = {}) {
  return fs.readFileSync(fileName, { encoding })
}

function isFile(pathLike, ...args) {
  return statSync(pathLike, ...args).isFile()
}

function isDirectory(pathLike, ...args) {
  return statSync(pathLike, ...args).isDirectory()
}

function makeCss(filename) {
  try {
    const css = readFile(filename)
    if (css) {
      return `\n<style>\n${css}\n</style>\n`
    } else {
      return ''
    }
  } catch (error) {
    console.log('makeCss()', error)
  }
}

const stylesPath = path.resolve(__dirname, '../../styles')
const workspace = path.resolve(__dirname, '../../')
function readStyles(uri) {
  console.log({ stylesPath, workspace }, __dirname)
  try {
    let filename = '';

    const includeDefaultStyles = getConfiguration('includeDefaultStyles');
    const stylesList = []
    // 1. read the style of the vscode.
    if (includeDefaultStyles) {
      filename = path.join(stylesPath, 'markdown.css');
      stylesList.push(makeCss(filename))
    }

    // 2. read the style of the markdown.styles setting.

    // 3. read the style of the highlight.js.
    const highlightStyle = getConfiguration('highlightStyle') || ''
    const ishighlight = getConfiguration('highlight')
    if (ishighlight) {
      const highlightStylePath = path.join(workspace, 'node_modules', 'highlight.js', 'styles', highlightStyle)
      filename = fs.pathExistsSync(highlightStylePath) ? highlightStylePath : path.join(stylesPath, 'tomorrow.css')
      stylesList.push(makeCss(filename))
    }

    // 4. read the style of the markdown-pdf.
    if (includeDefaultStyles) {
      filename = path.join(stylesPath, 'markdown-pdf.css');
      stylesList.push(makeCss(filename))
    }

    // 5. read the style of the markdown-pdf.styles settings.
    // fs.outputFileSync(`${filename}_${Date.now()}.html`, stylesList.join(''))

    return stylesList.join('');
  } catch (error) {
    console.log('readStyles()', error);
  }
}

async function addStylesheets({ page, highlightStyle } = {}) {
  const stylesheets = [
    path.resolve(__dirname, '../../styles/markdown.css'),
    path.resolve(__dirname, '../../styles/markdown-pdf.css'),
    // path.resolve(__dirname, './node_modules/highlight.js/styles/intellij-light.css')
  ]
  const getPath = p => path.resolve(__dirname, `../../node_modules/highlight.js/styles/${p}`)
  stylesheets.push(
    fs.pathExistsSync(getPath(highlightStyle)) ? getPath(highlightStyle) : getPath('intellij-light.css')
  )
  for (const stylesheet of stylesheets) {
    await page.addStyleTag({ path: stylesheet })
  }
}

/**
 * @description 延迟
 * @param {Number} delay
 * @returns
 * @example
 * await sleep(3000) // 延迟3秒
 */
async function sleep (delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

module.exports = {
  setBooleanValue,
  getConfiguration,
  getText,
  Slug,
  readFile,
  sleep,
  isFile,
  isDirectory,
  readStyles,
  addStylesheets
}
