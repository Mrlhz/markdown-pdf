const puppeteer = require('puppeteer-core')
const { getConfiguration } = require('../utils/index')

async function launch() {
  const options = {
    executablePath: getConfiguration('executablePath') || puppeteer.executablePath(),
    args: ['--lang=zh-cn', '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1520, height: 705 },
    headless: true // must
    // Setting Up Chrome Linux Sandbox
    // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#setting-up-chrome-linux-sandbox
  };
  const browser = await puppeteer.launch(options) // TODO
  return browser
}

module.exports = {
  launch
}
