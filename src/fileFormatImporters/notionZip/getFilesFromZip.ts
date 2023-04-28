import {ZipReader, BlobReader} from '@zip.js/zip.js'
import type {Entry} from '@zip.js/zip.js'

export default async function getFilesFromZip(
  file: File
): Promise<{htmlFile: Entry; imageFiles: Entry[]}> {
  const files = await new ZipReader(new BlobReader(file)).getEntries()

  const htmlFile = files.find(({filename}) => filename.endsWith('.html'))!
  const imageFiles = files.filter(({filename}) => !filename.endsWith('.html'))

  return {htmlFile, imageFiles}
}
