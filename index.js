// https://github.com/yzane/vscode-markdown-pdf

const fs = require('fs-extra')
const path = require('path')

const vscodeUri = require('vscode-uri').URI

const { launch, makeHtml, convertMarkdownToHtml } = require('./app/core/index')
const {
  getText,
  getConfiguration,
  isDirectory,
  isFile,
  addStylesheets
} = require('./app/utils/index')

const pdfDefaultOptions = require('./app/config/pdf-options')

module.exports = {
  activate,
  init
}

/**
 * @description 格式化入参，输出 输入文件路径、导出文件路径
 * @param {Object} { pathLike, output }
 * @returns
 */
function init({ pathLike, output }) {
  if (typeof pathLike !=='string') {
    throw new TypeError(`"pathLike" should be string`)
  }
  if (output && !fs.pathExistsSync(output)) {
    fs.ensureDirSync(output)
  }
  let filesPath = []
  if (isFile(pathLike)) {
    filesPath = [pathLike]
  } else if (isDirectory(pathLike)) {
    filesPath = fs.readdirSync(pathLike, { encoding: 'utf8' }).map(item => path.resolve(pathLike, item))
  }

  // 是文件且文件后缀名是支持转换的类型
  const typeEnum = ['.md']
  const isVerify = (pathLike) => isFile(pathLike) && typeEnum.includes(path.extname(pathLike))

  return filesPath.filter(isVerify)
    .map(item => {
      return {
        path: item,
        output: output ? output : item,
        file: path.basename(item)
      }
    })
}

async function activate({ pathLike, output }) {
  const filesPath = init({ pathLike, output })
  // filter
  const filterFiles = filesPath.filter(file => {
    const { name } = path.parse(file.path)
    const pdfFile = path.resolve(output, `${name}.pdf`)
    console.log(pdfFile, fs.existsSync(pdfFile) ? 'Already exists' : 'Not created')
    return !fs.existsSync(pdfFile)
  })

  console.log({ filterFiles })
  const browser = await launch()
  const len = filterFiles.length
  for (let index = 0; index < len; index += 10) {
    console.log(index)
    const tasks = filterFiles.slice(0, index + 10).map(item => markdownPdf('pdf', { browser, uri: item.path, output: item.output }))
    const result = await Promise.allSettled(tasks)
    console.log(`Done: ${result.length}`)
    if (index + 10 < len) {
      await sleep(2000)
    }
  }
  await browser.close()
}

async function markdownPdf(type, options = {}) {
  const { browser, uri, output } = options
  try {
    const { name: mdfilename, ext } = path.parse(uri)
    var types_format = ['html', 'pdf', 'png', 'jpeg']
    var exportFileName = path.resolve(output, `${mdfilename}.${type}`) // export
    // convert and export markdown to pdf, html, png, jpeg
    var text = getText(uri)
    var content = convertMarkdownToHtml(mdfilename, type, text)
    var html = makeHtml(content, uri)
    console.log({exportFileName, type, uri, ext})
    await exportPdf({ browser, html, exportFileName, type }) // TODO
  } catch (error) {
    console.log('markdownPdf()', error)
  }
}

/*
 * export a html to a html file
 */
function exportHtml(data, filename) {
  try {
    fs.outputFileSync(filename, data, { encoding: 'utf-8' })
  } catch (error) {
    console.log('exportHtml()', error)
  }
}

/*
 * export a html to a pdf file (html-pdf)
 */
async function exportPdf(exportOptions = {}) {
  const { browser, html, exportFileName, type } = exportOptions
  const timeout = getConfiguration('timeout')
  try {
    // export html
    if (type == 'html') {
      exportHtml(html, exportFileName) // TODO
      console.log('$(markdown) ', { exportFileName, timeout })
      return
    }

    // create temporary file
    const { dir, name } = path.parse(exportFileName)
    const tmpfilename = path.join(dir, name + '_tmp.html')
    exportHtml(html, tmpfilename)
    const page = await browser.newPage()
    const url = vscodeUri.file(tmpfilename).toString()
    console.log({ url, exportFileName, tmpfilename })
    await page.goto(url, { waitUntil: 'networkidle0', timeout })
    // await addStylesheets({ page, highlightStyle: getConfiguration('highlightStyle') })
    // generate pdf
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions
    if (type == 'pdf') {
      // If width or height option is set, it overrides the format option.
      // In order to set the default value of page size to A4, we changed it from the specification of puppeteer.
      const customWidth = { width: '1680' || '', format: '' }
      const pdfOptions = {
        path: exportFileName,
        ...pdfDefaultOptions,
        // ...customWidth
      }
      await page.evaluate(({ name }) => {
        document.title = name
      }, { name }) // 自定义 document title

      await page.pdf(pdfOptions)
    }

    // generate png and jpeg
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions
    if (type == 'png' || type == 'jpeg') {
      // Quality options do not apply to PNG images.
      var quality_option;
      if (type == 'png') {
        quality_option = undefined;
      }
      if (type == 'jpeg') {
        quality_option = getConfiguration('quality')['quality'] || 100
      }

      // screenshot size
      var clip_x_option = vscode.workspace.getConfiguration('markdown-pdf')['clip']['x'] || null;
      var clip_y_option = vscode.workspace.getConfiguration('markdown-pdf')['clip']['y'] || null;
      var clip_width_option = vscode.workspace.getConfiguration('markdown-pdf')['clip']['width'] || null;
      var clip_height_option = vscode.workspace.getConfiguration('markdown-pdf')['clip']['height'] || null;
      let screenshotOptions;
      if (clip_x_option !== null && clip_y_option !== null && clip_width_option !== null && clip_height_option !== null) {
        screenshotOptions = {
          path: exportFileName,
          quality: quality_option,
          fullPage: false,
          clip: {
            x: clip_x_option,
            y: clip_y_option,
            width: clip_width_option,
            height: clip_height_option,
          },
          omitBackground: vscode.workspace.getConfiguration('markdown-pdf')['omitBackground'],
        }
      } else {
        screenshotOptions = {
          path: exportFileName,
          quality: quality_option,
          fullPage: true,
          omitBackground: vscode.workspace.getConfiguration('markdown-pdf')['omitBackground'],
        }
      }
      await page.screenshot(screenshotOptions);
    }

    await page.close();

    // delete temporary file
    var debug = getConfiguration('debug') || false;
    if (!debug) {
      if (fs.pathExistsSync(tmpfilename)) {
        fs.removeSync(tmpfilename)
      }
    }

    console.log('$(markdown) end: ' + exportFileName, timeout)
  } catch (error) {
    console.log('exportPdf()', error);
  }
}
