
const { readFile } = require('node:fs/promises');
const path = require('path');
const fs = require('fs');

const DATA_URI_SCHEME = {
  '.gif'  : 'data:image/gif;',
  '.png'  : 'data:image/png;',
  '.jpg'  : 'data:image/jpg;',
  '.jpeg' : 'data:image/jpeg;',
  '.svg'  : 'data:image/svg+xml;',
  '.icon' : 'data:image/x-icon;',
  ''      : 'data:image/jpeg;'
}

async function toBase64(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return
  }

  const contents = await readFile(filePath);
  const { ext } = path.parse(filePath);

  return `${DATA_URI_SCHEME[ext]}base64,${Buffer.from(contents).toString('base64')}`
}

module.exports = { toBase64 }
