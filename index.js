// https://github.com/yzane/vscode-markdown-pdf

const fs = require('fs-extra')
const path = require('path')

const puppeteer = require('puppeteer-core')
const mustache = require('mustache')
const vscodeUri = require('vscode-uri').URI

const { convertMarkdownToHtml } = require('./app/core/convert-markdown-to-html')
const {
  readFile,
  getText,
  getConfiguration,
  readStyles
} = require('./app/utils/index')

module.exports = {
  activate
}

async function activate({ pathLike, output }) {
  const filesPath = init({ pathLike, ext: 'md', output })
  const tasks = filesPath.map(item => markdownPdf('pdf', { uri: item.path, output: item.output }))
  const result = await Promise.allSettled(tasks)
  console.log(result, filesPath)
}

function init({ pathLike, ext, output }) {
  if (output && !fs.pathExistsSync(output)) {
    fs.ensureDirSync(output)
  }
  let filesPath = fs.readdirSync(pathLike, { encoding: 'utf8' })
    .map(item => path.resolve(pathLike, item))
    .filter(item => fs.statSync(item).isFile() && path.extname(item).includes(ext))
    .map(item => {
      return {
        path: item,
        output: output ? output : item,
        file: path.basename(item)
      }
    })

  return filesPath
}

async function markdownPdf(type, options) {
  const { uri, output } = options
  try {
    const { name: mdfilename, ext } = path.parse(uri)
    var types_format = ['html', 'pdf', 'png', 'jpeg']
    var filename = path.resolve(output, `${mdfilename}.${type}`) // export
    // convert and export markdown to pdf, html, png, jpeg
    var text = getText(uri)
    var content = convertMarkdownToHtml(mdfilename, type, text)
    var html = makeHtml(content, uri)
    console.log({filename, type, uri, ext})
    await exportPdf(html, filename, type, uri)

  } catch (error) {
    console.log('markdownPdf()', error)
  }
}

/*
 * make html
 */
function makeHtml(data, uri) {
  try {
    // read styles
    const style = readStyles(uri);

    // get title
    var title = path.basename(uri);

    // read template
    var filename = path.join(__dirname, 'template', 'template.html');
    var template = readFile(filename);

    // read mermaid javascripts
    var mermaidServer = getConfiguration('mermaidServer') || '';
    const mermaid = `<script src="${mermaidServer}"></script>`;

    // compile template
    var view = {
      title: title,
      style: style,
      content: data,
      mermaid: mermaid
    };
    return mustache.render(template, view);
  } catch (error) {
    console.log('makeHtml()', error);
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
async function exportPdf(data, filename, type, uri) {
  const timeout = getConfiguration('timeout')
  var exportFilename = path.resolve(__dirname, './sample', filename) // getOutputDir(filename, uri)
  try {
    // export html
    if (type == 'html') {
      exportHtml(data, exportFilename)
      console.log('$(markdown) ', { exportFilename, timeout })
      return
    }

    // create temporary file
    var f = path.parse(filename)
    var tmpfilename = path.join(f.dir, f.name + '_tmp.html')
    exportHtml(data, tmpfilename)
    const options = {
      executablePath: getConfiguration('executablePath') || puppeteer.executablePath(),
      args: ['--lang=zh-cn', '--no-sandbox', '--disable-setuid-sandbox'],
      headless: true // must
      // Setting Up Chrome Linux Sandbox
      // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#setting-up-chrome-linux-sandbox
    };
    const browser = await puppeteer.launch(options)
    const page = await browser.newPage()
    console.log(vscodeUri.file(tmpfilename).toString(), exportFilename)
    await page.goto(vscodeUri.file(path.resolve(__dirname, tmpfilename)).toString(), { waitUntil: 'networkidle0', timeout })
    // await page.addStyleTag({
    //   path: path.resolve(__dirname, './styles/markdown.css')
    // })
    // await page.addStyleTag({
    //   path: path.resolve(__dirname, './styles/markdown-pdf.css')
    // })
    // await page.addStyleTag({
    //   path: path.resolve(__dirname, './node_modules/highlight.js/styles/monokai-sublime.css')
    // })
    // generate pdf
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions
    if (type == 'pdf') {
      // If width or height option is set, it overrides the format option.
      // In order to set the default value of page size to A4, we changed it from the specification of puppeteer.
      var width_option = getConfiguration('width') || ''
      var height_option = getConfiguration('height') || ''
      var format_option = ''
      if (!width_option && !height_option) {
        format_option = getConfiguration('format', uri) || 'A4'
      }
      var landscape_option;
      if (getConfiguration('orientation', uri) === 'landscape') {
        landscape_option = true;
      } else {
        landscape_option = false;
      }
      const pdfOptions = {
        path: exportFilename,
        scale: getConfiguration('scale', uri),
        displayHeaderFooter: getConfiguration('displayHeaderFooter', uri),
        headerTemplate: getConfiguration('headerTemplate', uri) || '',
        footerTemplate: getConfiguration('footerTemplate', uri) || '',
        printBackground: getConfiguration('printBackground', uri),
        landscape: landscape_option,
        pageRanges: getConfiguration('pageRanges', uri) || '',
        format: format_option,
        width: getConfiguration('width', uri)['width'] || '',
        // width: '1680' || getConfiguration('width', uri)['width'] || '',
        height: getConfiguration('height', uri)['height'] || '',
        margin: {
          top: getConfiguration('margin.top', uri) || '',
          right: getConfiguration('margin.right', uri) || '',
          bottom: getConfiguration('margin.bottom', uri) || '',
          left: getConfiguration('margin.left', uri) || ''
        }
      }
      await page.pdf(pdfOptions);
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
          path: exportFilename,
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
          path: exportFilename,
          quality: quality_option,
          fullPage: true,
          omitBackground: vscode.workspace.getConfiguration('markdown-pdf')['omitBackground'],
        }
      }
      await page.screenshot(screenshotOptions);
    }

    // await page.close();
    await browser.close();

    // delete temporary file
    var debug = getConfiguration('debug') || false;
    if (!debug) {
      if (fs.pathExistsSync(tmpfilename)) {
        fs.removeSync(tmpfilename)
      }
    }

    console.log('$(markdown) end: ' + exportFilename, timeout);
  } catch (error) {
    console.log('exportPdf()', error);
  }
}
