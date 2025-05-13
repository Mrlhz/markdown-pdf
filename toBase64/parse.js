const { readFile, writeFile, readdir } = require('node:fs/promises');
const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const { toBase64 } = require('./toBase64');
// const { readdirSync } = require('fs-extra');
// const { writeFile } = require('node:fs');

async function parse(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return
  }

  const { dir, name, ext } = path.parse(filePath);

  const html = await readFile(filePath, 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const images = document.querySelectorAll('img');

  for (const image of [...images]) {
    const src = image.getAttribute('src');
    const imagePath = path.resolve(dir, src);
    const base64 = await toBase64(imagePath);

    if (base64) {
      image.setAttribute('src', base64);
    }
  }

  const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
  for (const link of links) {
    const href = link.getAttribute('href');
    const stylePath = path.resolve(dir, href);
    if (fs.existsSync(stylePath)) {
      const stylesheet = await readFile(stylePath, 'utf-8');
      try {
        document.head.appendChild(createStyle(document, stylesheet));
        link.remove();
      } catch (error) {
        console.log(error)
      }
    }
  }

  const data = document.documentElement.innerHTML;
  await writeFile(`${name}${ext}`, data);

}

function createStyle(document, stylesheet) {
  const style = document.createElement('style');
  style.innerHTML = stylesheet;

  return style;
}

async function batch(files = []) {
  for (const file of files) {
    await parse(file)
  }
}

module.exports = {
  parse,
  batch
}
