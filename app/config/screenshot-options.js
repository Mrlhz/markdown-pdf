/**
 * @see https://zhaoqize.github.io/puppeteer-api-zh_CN/#?product=Puppeteer&version=v15.3.0&show=api-pagescreenshotoptions
 */

 module.exports = {
  // path <string> 截图保存路径。截图图片类型将从文件扩展名推断出来。如果是相对路径，则从当前路径解析。如果没有指定路径，图片将不会保存到硬盘。
  // type: 'png', // <string> 指定截图类型, 可以是 jpeg 或者 png。默认 'png'.
  quality: 100, // <number> 图片质量, 可选值 0-100. png 类型不适用。
  fullPage: false, //  <boolean> 如果设置为true，则对完整的页面（需要滚动的部分也包含在内）。默认是false
  clip: null, //  <Object> 指定裁剪区域。需要配置：
    // x <number> 裁剪区域相对于左上角（0， 0）的x坐标
    // y <number> 裁剪区域相对于左上角（0， 0）的y坐标
    // width <number> 裁剪的宽度
    // height <number> 裁剪的高度
  omitBackground: false, //  <boolean> 隐藏默认的白色背景，背景透明。默认不透明
  encoding: 'binary', //  <string> 图像的编码可以是 base64 或 binary。 默认为“二进制”。
}
