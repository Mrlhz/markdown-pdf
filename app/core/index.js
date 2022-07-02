const { convertMarkdownToHtml } = require('./convert-markdown-to-html')
const { makeHtml } = require('./make-html')
const { launch } = require('./launch')

module.exports = {
  launch,
  makeHtml,
  convertMarkdownToHtml
}
