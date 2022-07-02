/**
 * @see https://pptr.dev/api/puppeteer.pdfoptions
 * @see https://zhaoqize.github.io/puppeteer-api-zh_CN/#?product=Puppeteer&version=v15.2.0&show=api-pagepdfoptions
 * {@link https://pptr.dev/api/puppeteer.page.pdf Page.pdf}
 */

const scale = {
  type: Number,
  default: 1,
  description: 'Scale of the page rendering.'
}

const displayHeaderFooter = {
  type: Boolean,
  default: true,
  description: 'pdf only. Display header and footer. 显示页眉和页脚。',
  scope: 'resource'
}

const headerTemplate = {
  type: String,
  default: `<div style="font-size: 9px; margin-left: 1cm;"> <span class='title'></span></div> <div style="font-size: 9px; margin-left: auto; margin-right: 1cm; "> <span class='date'></span></div>`,
  description: 'pdf only. HTML template for the print header.',
  scope: 'resource'
}

const footerTemplate = {
  type: String,
  default: `<div style="font-size: 9px; margin: 0 auto;"> <span class='pageNumber'></span> / <span class='totalPages'></span></div>`,
  description: 'pdf only. HTML template for the print footer.',
  scope: 'resource'
}

const printBackground = {
  type: Boolean,
  default: true,
  description: 'pdf only. Print background graphics.',
  scope: 'resource'
}

const landscape = {
  type: Boolean,
  default: false,
  description: 'pdf only. Paper orientation. portrait or landscape.',
  scope: 'resource'
}

const pageRanges = {
  type: String,
  default: '',
  description: `pdf only. Paper ranges to print, e.g., '1-5, 8, 11-13'.`,
  scope: 'resource'
}

const format = {
  type: String,
  enum: [
    'Letter',
    'Legal',
    'Tabloid',
    'Ledger',
    'A0',
    'A1',
    'A2',
    'A3',
    'A4',
    'A5',
    'A6'
  ],
  default: 'A4',
  description: 'pdf only. Paper format [Letter, Legal, Tabloid, Ledger, A0, A1, A2, A3, A4, A5, A6].',
  scope: 'resource'
}

const width = {
  type: String,
  default: '',
  description: 'pdf only. Paper width, accepts values labeled with units(mm, cm, in, px). If it is set, it overrides the markdown-pdf.format option.',
  scope: 'resource'
}

const height = {
  type: String,
  default: '',
  description: 'pdf only. Paper height, accepts values labeled with units(mm, cm, in, px). If it is set, it overrides the markdown-pdf.format option.',
  scope: 'resource'
}

const margin = {
  top: '1.5cm', // <string> Page Option. Border Top. units: mm, cm, in, px
  right: '1cm', // <string> Page Option. Border right. units: mm, cm, in, px
  bottom: '1cm', // <string> Page Option. Border bottom. units: mm, cm, in, px
  left: '1cm', // <string> Page Option. Border left. units: mm, cm, in, px
}

const preferCSSPageSize = {
  type: Boolean,
  default: false,
  description: '给页面优先级声明的任何CSS @page 大小超过 width 和 height 或 format 选项中声明的大小。 默认为 false，它将缩放内容以适合纸张大小。',
  scope: 'resource'
}

module.exports = {
  scale: scale.default,
  displayHeaderFooter: displayHeaderFooter.default,
  headerTemplate: headerTemplate.default,
  footerTemplate: footerTemplate.default,
  printBackground: printBackground.default,
  landscape: landscape.default,
  pageRanges: pageRanges.default,
  format: format.default,
  width: width.default,
  height: height.default,
  margin,
  preferCSSPageSize: preferCSSPageSize.default,
}
