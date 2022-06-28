// https://github.com/yzane/vscode-markdown-pdf

const fs = require('fs-extra')
const path = require('path')
const url = require('url')
const os = require('os')

const puppeteer = require('puppeteer-core')
const hljs = require('highlight.js')
const cheerio = require('cheerio')
const mustache = require('mustache')
const grayMatter = require('gray-matter')
const vscodeUri = require('vscode-uri').URI

const { executablePath, defaultViewport, ignoreHTTPSErrors } = require('./app/config/index')
const { Slug, fixHref, readFile, deleteFile, getText, getConfiguration, setBooleanValue, sleep } = require('./app/utils/index')

module.exports = {
  activate
}

async function activate({ pathLike, output }) {
  const filesPath = init({ pathLike, ext: 'md', output })
  const tasks = filesPath.map(item => markdownPdf('pdf', { uri: item.path, output: item.output }))
  const result = await Promise.allSettled(tasks)
  console.log(result, filesPath)
  // await markdownPdf('pdf', { uri: path.resolve(__dirname, './sample/readme.md') })
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
    console.log(filename, type, uri, ext)
    await exportPdf(html, filename, type, uri)

  } catch (error) {
    console.log('markdownPdf()', error)
  }
}

/*
 * convert markdown to html (markdown-it)
 */
function convertMarkdownToHtml(filename, type, text) {
  var matterParts = grayMatter(text)

  try {
    try {
      var breaks = setBooleanValue(matterParts.data.breaks, getConfiguration('breaks'))
      var md = require('markdown-it')({
        html: true,
        breaks: breaks,
        highlight: function (str, lang) {
          if (lang && lang.match(/\bmermaid\b/i)) {
            return `<div class="mermaid">${str}</div>`
          }
          if (lang && hljs.getLanguage(lang)) {
            try {
              str = hljs.highlight(lang, str, true).value
            } catch (error) {
              str = md.utils.escapeHtml(str)

              console.log('markdown-it:highlight', error)
            }
          } else {
            str = md.utils.escapeHtml(str)
          }
          return '<pre class="hljs"><code><div>' + str + '</div></code></pre>'
        }
      })
    } catch (error) {
      console.log('require(\'markdown-it\')', error)
    }

  // convert the img src of the markdown
  var defaultRender = md.renderer.rules.image
  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    var token = tokens[idx]
    var href = token.attrs[token.attrIndex('src')][1]
    // console.log("original href: " + href);
    if (type === 'html') {
      href = decodeURIComponent(href).replace(/("|')/g, '')
    } else {
      href = convertImgPath(href, filename)
    }
    // console.log("converted href: " + href);
    token.attrs[token.attrIndex('src')][1] = href
    // // pass token to default renderer.
    return defaultRender(tokens, idx, options, env, self)
  };

  if (type !== 'html') {
    // convert the img src of the html
    md.renderer.rules.html_block = function (tokens, idx) {
      var html = tokens[idx].content;
      var $ = cheerio.load(html);
      $('img').each(function () {
        var src = $(this).attr('src');
        var href = convertImgPath(src, filename);
        $(this).attr('src', href);
      });
      return $.html();
    };
  }

  // checkbox
  md.use(require('markdown-it-checkbox'));

  // emoji
  var emoji_f = setBooleanValue(matterParts.data.emoji, getConfiguration('emoji'))
  if (emoji_f) {
    var emojies_defs = require(path.join(__dirname, 'data', 'emoji.json'))
    try {
      var options = {
        defs: emojies_defs
      };
    } catch (error) {
      statusbarmessage.dispose();
      console.log('markdown-it-emoji:options', error);
    }
    md.use(require('markdown-it-emoji'), options);
    md.renderer.rules.emoji = function (token, idx) {
      var emoji = token[idx].markup;
      var emojipath = path.join(__dirname, 'node_modules', 'emoji-images', 'pngs', emoji + '.png');
      var emojidata = readFile(emojipath, null).toString('base64');
      if (emojidata) {
        return '<img class="emoji" alt="' + emoji + '" src="data:image/png;base64,' + emojidata + '" />';
      } else {
        return ':' + emoji + ':';
      }
    };
  }

  // toc
  // https://github.com/leff/markdown-it-named-headers
  var options = {
    slugify: Slug
  }
  md.use(require('markdown-it-named-headers'), options);

  // markdown-it-container
  // https://github.com/markdown-it/markdown-it-container
  md.use(require('markdown-it-container'), '', {
    validate: function (name) {
      return name.trim().length;
    },
    render: function (tokens, idx) {
      if (tokens[idx].info.trim() !== '') {
        return `<div class="${tokens[idx].info.trim()}">\n`;
      } else {
        return `</div>\n`;
      }
    }
  });

  // PlantUML
  // https://github.com/gmunguia/markdown-it-plantuml
  var plantumlOptions = {
    openMarker: matterParts.data.plantumlOpenMarker || getConfiguration('plantumlOpenMarker') || '@startuml',
    closeMarker: matterParts.data.plantumlCloseMarker || getConfiguration('plantumlCloseMarker') || '@enduml',
    server: getConfiguration('plantumlServer') || ''
  }
  md.use(require('markdown-it-plantuml'), plantumlOptions);

  // markdown-it-include
  // https://github.com/camelaissani/markdown-it-include
  // the syntax is :[alt-text](relative-path-to-file.md)
  // https://talk.commonmark.org/t/transclusion-or-including-sub-documents-for-reuse/270/13
  if (getConfiguration('markdown-it-include.enable')) {
    md.use(require("markdown-it-include"), {
      root: path.dirname(filename),
      includeRe: /:\[.+\]\((.+\..+)\)/i
    });
  }

  return md.render(matterParts.content);

  } catch (error) {
    console.log('convertMarkdownToHtml()', error);
  }
}

/*
 * make html
 */
function makeHtml(data, uri) {
  try {
    // read styles
    var style = '';
    style += readStyles(uri);

    // get title
    var title = path.basename(uri);

    // read template
    var filename = path.join(__dirname, 'template', 'template.html');
    var template = readFile(filename);

    // read mermaid javascripts
    var mermaidServer = getConfiguration('mermaidServer') || '';
    var mermaid = '<script src=\"' + mermaidServer + '\"></script>';

    // compile template
    var mustache = require('mustache');

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
  fs.writeFile(filename, data, 'utf-8', function (error) {
    if (error) {
      console.log('exportHtml()', error)
      return;
    }
  });
}

/*
 * export a html to a pdf file (html-pdf)
 */
async function exportPdf(data, filename, type, uri) {
  var StatusbarMessageTimeout = getConfiguration('StatusbarMessageTimeout')
  var exportFilename = path.resolve(__dirname, './sample', filename) // getOutputDir(filename, uri)
  try {
    // export html
    if (type == 'html') {
      exportHtml(data, exportFilename)
      console.log('$(markdown) ' + exportFilename, StatusbarMessageTimeout)
      return
    }

    // create temporary file
    var f = path.parse(filename)
    var tmpfilename = path.join(f.dir, f.name + '_tmp.html')
    exportHtml(data, tmpfilename)
    var options = {
      executablePath: getConfiguration('executablePath') || puppeteer.executablePath(),
      args: ['--lang=zh-cn', '--no-sandbox', '--disable-setuid-sandbox'],
      headless: true // must
      // Setting Up Chrome Linux Sandbox
      // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#setting-up-chrome-linux-sandbox
    };
    const browser = await puppeteer.launch(options)
    const page = await browser.newPage()
    console.log(vscodeUri.file(tmpfilename).toString(), exportFilename)
    await page.goto(vscodeUri.file(path.resolve(__dirname, tmpfilename)).toString(), { waitUntil: 'networkidle0' })
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
      var options = {
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
      await page.pdf(options);
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
      var options;
      if (clip_x_option !== null && clip_y_option !== null && clip_width_option !== null && clip_height_option !== null) {
        options = {
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
        options = {
          path: exportFilename,
          quality: quality_option,
          fullPage: true,
          omitBackground: vscode.workspace.getConfiguration('markdown-pdf')['omitBackground'],
        }
      }
      await page.screenshot(options);
    }

    // await page.close();
    await browser.close();

    // delete temporary file
    var debug = getConfiguration('debug') || false;
    if (!debug) {
      if (fs.pathExistsSync(tmpfilename)) {
        deleteFile(tmpfilename);
      }
    }

    console.log('$(markdown) ' + exportFilename, StatusbarMessageTimeout);
  } catch (error) {
    console.log('exportPdf()', error);
  }
}

function convertImgPath(src, filename) {
  try {
    var href = decodeURIComponent(src);
    href = href.replace(/("|')/g, '')
          .replace(/\\/g, '/')
          .replace(/#/g, '%23');
    var protocol = url.parse(href).protocol;
    if (protocol === 'file:' && href.indexOf('file:///') !==0) {
      return href.replace(/^file:\/\//, 'file:///');
    } else if (protocol === 'file:') {
      return href;
    } else if (!protocol || path.isAbsolute(href)) {
      href = path.resolve(path.dirname(filename), href).replace(/\\/g, '/').replace(/#/g, '%23');
      if (href.indexOf('//') === 0) {
        return 'file:' + href;
      } else if (href.indexOf('/') === 0) {
        return 'file://' + href;
      } else {
        return 'file:///' + href;
      }
    } else {
      return src;
    }
  } catch (error) {
    console.log('convertImgPath()', error);
  }
}

function makeCss(filename) {
  try {
    var css = readFile(filename)
    if (css) {
      return '\n<style>\n' + css + '\n</style>\n'
    } else {
      return ''
    }
  } catch (error) {
    console.log('makeCss()', error)
  }
}

function readStyles(uri) {
  try {
    var includeDefaultStyles;
    var style = '';
    var styles = '';
    var filename = '';
    var i;

    includeDefaultStyles = getConfiguration('includeDefaultStyles');

    // 1. read the style of the vscode.
    if (includeDefaultStyles) {
      filename = path.join(__dirname, 'styles', 'markdown.css');
      style += makeCss(filename);
    }

    // 2. read the style of the markdown.styles setting.
    if (includeDefaultStyles) {
      styles = getConfiguration('styles')
      if (styles && Array.isArray(styles) && styles.length > 0) {
        for (i = 0; i < styles.length; i++) {
          var href = fixHref(uri, styles[i]);
          style += '<link rel=\"stylesheet\" href=\"' + href + '\" type=\"text/css\">';
        }
      }
    }

    // 3. read the style of the highlight.js.
    var highlightStyle = getConfiguration('highlightStyle') || ''
    var ishighlight = getConfiguration('highlight')
    if (ishighlight) {
      if (highlightStyle) {
        var css = getConfiguration('highlightStyle') || 'github.css'
        filename = path.join(__dirname, 'node_modules', 'highlight.js', 'styles', css)
        style += makeCss(filename);
      } else {
        filename = path.join(__dirname, 'styles', 'tomorrow.css');
        style += makeCss(filename);
      }
    }

    // 4. read the style of the markdown-pdf.
    if (includeDefaultStyles) {
      filename = path.join(__dirname, 'styles', 'markdown-pdf.css');
      style += makeCss(filename);
    }

    // 5. read the style of the markdown-pdf.styles settings.
    styles = getConfiguration('styles') || '';
    if (styles && Array.isArray(styles) && styles.length > 0) {
      for (i = 0; i < styles.length; i++) {
        var href = fixHref(uri, styles[i]);
        style += '<link rel=\"stylesheet\" href=\"' + href + '\" type=\"text/css\">';
      }
    }

    return style;
  } catch (error) {
    console.log('readStyles()', error);
  }
}
