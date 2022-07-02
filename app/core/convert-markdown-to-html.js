const path = require('path')
const hljs = require('highlight.js')
const cheerio = require('cheerio')
const grayMatter = require('gray-matter')

const { convertImgPath } = require('./convert-img-path')
const { Slug, setBooleanValue, getConfiguration, readFile } = require('../utils/index')

/*
 * convert markdown to html (markdown-it)
 */
function convertMarkdownToHtml(filename, type, text) {
  const matterParts = grayMatter(text)

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
              str = hljs.highlight(str, { language: lang }).value
            } catch (error) {
              str = md.utils.escapeHtml(str)

              console.log('markdown-it:highlight', error)
            }
          } else {
            str = md.utils.escapeHtml(str)
          }
          return `<pre class="hljs"><code><div>${str}</div></code></pre>`
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

  // toc
  // https://github.com/leff/markdown-it-named-headers
  const options = {
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
  const plantumlOptions = {
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

module.exports = {
  convertMarkdownToHtml
}
