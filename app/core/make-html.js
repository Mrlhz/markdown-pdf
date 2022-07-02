const path = require('path')
const mustache = require('mustache')
const { readFile, getConfiguration, readStyles } = require('../utils/index')

/**
 * @description make html
 * @param {*} data 
 * @param {*} uri 
 * @returns 
 */
function makeHtml(data, uri) {
  try {
    // read styles
    const style = readStyles()

    // get title
    var title = path.basename(uri);

    // read template
    var filename = path.join(__dirname, '../../template/template.html');
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

module.exports = {
  makeHtml
}
