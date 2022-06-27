const puppeteer = require('puppeteer-core')

const { executablePath } = require('./app/config/index')


async function pdf() {
  const browser = await puppeteer.launch({
    executablePath
  })
  const page = await browser.newPage()
  await page.goto('https://mrlhz.github.io/blog', {
    waitUntil: 'networkidle2',
  })
  await page.pdf({
    path: 'MyBlog.pdf',
    format: 'a4'
  })

  await browser.close()
}


pdf()