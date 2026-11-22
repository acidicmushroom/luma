
// Copies songs chosen by the user into the folder that is open in the player.

const fs = require('fs');
const path = require('path');

// The folder must be a existing folder
function checkFolder(folder) {
  const isFolder = folder && path.isAbsolute(folder) && fs.existsSync(folder) && fs.statSync(folder).isDirectory();
  if (!isFolder) throw new Error('Open a folder first (click "Folder" in the player).');
}

// If a song with the same name already exists change the new to ...(1) so we never overwrite the user's files.
function uniquePath(folder, fileName) {
  const extension = path.extname(fileName);
  const base = path.basename(fileName, extension);
  let candidate = path.join(folder, fileName);
  for (let n = 1; fs.existsSync(candidate); n++) {
    candidate = path.join(folder, `${base} (${n})${extension}`);
  }
  return candidate;
}

// type of files so the player knows how to read it
const MIME_TYPES = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wma': 'audio/x-ms-wma'
};
function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'audio/mpeg';
}

// copies a song into the folder. Returns the path of the new copy.
async function copySongToFolder(sourcePath, folder) {
  checkFolder(folder);
  if (!path.isAbsolute(sourcePath) || !fs.existsSync(sourcePath)) throw new Error('File not found.');
  if (path.dirname(sourcePath) === folder) throw new Error('This song is already in the folder.');

  const destination = uniquePath(folder, path.basename(sourcePath));
  await fs.promises.copyFile(sourcePath, destination);
  return destination;
}

module.exports = { copySongToFolder, getMimeType };
