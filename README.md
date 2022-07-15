# markdown-pdf
This extension converts Markdown files to pdf, html, png or jpeg files.

- [vscode-markdown-pdf](https://github.com/yzane/vscode-markdown-pdf)
- [md-to-pdf](https://github.com/simonhaenisch/md-to-pdf)
- [puppeteer page.pdf](https://zhaoqize.github.io/puppeteer-api-zh_CN/#?product=Puppeteer&version=v14.3.0&show=api-pagepdfoptions)

```shell

yarn add puppeteer-core fs-extra markdown-it highlight.js mustache vscode-uri
```

```
yarn add jsdom cheerio fs-extra gray-matter highlight.js markdown-it markdown-it-checkbox markdown-it-container markdown-it-include markdown-it-named-headers markdown-it-plantuml mustache puppeteer-core vscode-uri
```

## Usage

```js
const { activate } = require('./index')

const output = '.'
activate({
  pathLike: path.resolve(output, 'md'),
  output: path.resolve(output, 'pdf'),
  type: 'pdf', // default
  overwrite: false // default
})
```

### 问题

- [引入纯 ESM 模块化的第三方包](https://blog.csdn.net/xs20691718/article/details/122727795)
- [highlight Deprecated since version 10.7: This will be removed entirely in v12.](https://highlightjs.readthedocs.io/en/latest/api.html#id2)


### TODO

- [] 是否启用 `styles = getConfiguration('styles')`
- [] `fixHref`
- [x] `hljs.highlight(lang, str, true).value` Deprecated as of 10.7.0. highlight(lang, code, ...args) has been deprecated.
- [] 批处理任务数提取到配置文件`size = getConfiguration('size')`
- [x] `exportPdf` 方法入参 改为对象
