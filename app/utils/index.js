const fs = require('fs')
const path = require('path')

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
    var stg = encodeURI(
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

function fixHref(resource, href) {
  try {
    if (!href) {
      return href
    }

    // Use href if it is already an URL
    // const hrefUri = vscode.Uri.parse(href)
    // if (['http', 'https'].indexOf(hrefUri.scheme) >= 0) {
    //   return hrefUri.toString()
    // }

    // // Use a home directory relative path If it starts with ^.
    // if (href.indexOf('~') === 0) {
    //   return vscode.Uri.file(href.replace(/^~/, os.homedir())).toString()
    // }

    // // Use href as file URI if it is absolute
    // if (path.isAbsolute(href)) {
    //   return vscode.Uri.file(href).toString()
    // }

    // // Use a workspace relative path if there is a workspace and markdown-pdf.stylesRelativePathFile is false
    // var stylesRelativePathFile = getConfiguration('stylesRelativePathFile')
    // let root = vscode.workspace.getWorkspaceFolder(resource)
    // if (stylesRelativePathFile === false && root) {
    //   return vscode.Uri.file(path.join(root.uri.fsPath, href)).toString()
    // }

    // // Otherwise look relative to the markdown file
    // return vscode.Uri.file(path.join(path.dirname(resource.fsPath), href)).toString()
    return href
  } catch (error) {
    console.log('fixHref()', error)
  }
}

function deleteFile (path) {
  var rimraf = require('rimraf')
  rimraf.sync(path)
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
  fixHref,
  readFile,
  deleteFile,
  sleep
}
