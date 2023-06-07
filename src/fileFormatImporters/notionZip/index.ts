import type {
  ArraySchemaType,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  SanityClient,
  TypedObject,
} from 'sanity'
import type {FileFormatImporter} from '../../ImportViewComponent'
import mergeOrderedListsInDocument from './mergeOrderedLists'
import type {DeserializerRule} from '@sanity/block-tools'
import {htmlToBlocks} from '@sanity/block-tools'
import getFilesFromZip from './getFilesFromZip'
import {BlobWriter} from '@zip.js/zip.js'
import type {Entry} from '@zip.js/zip.js'

interface Config<
  NotionPageProps extends Record<string, any>,
  PreparedData extends Record<string, any>
> {
  prepare?: (props: {
    client: SanityClient
    pageProperties: NotionPageProps
    htmlDocument: Document
    imageFiles: Entry[]
  }) => Promise<PreparedData>
  deserializingRules: (prepareResult: PreparedData | undefined) => DeserializerRule[]
  pageToDocument: (data: {
    pageProperties: NotionPageProps
    blocks: (TypedObject | PortableTextTextBlock<PortableTextObject | PortableTextSpan>)[]
    preparedData: PreparedData
    htmlDocument: Document
  }) => Record<string, any>
  documentContentSchemaType: ArraySchemaType<unknown>
}
export type {Config as NotionZipImporterConfig}

export function defineNotionHtmlImporterConfig<
  NotionPageProps extends Record<string, any>,
  PreparedData extends Record<string, any>
>(config: Config<NotionPageProps, PreparedData>): Config<NotionPageProps, PreparedData> {
  return config
}

export function notionZipFileFormat<
  NotionPageProps extends Record<string, any>,
  PreparedData extends Record<string, any>
>({
  prepare,
  deserializingRules,
  pageToDocument,
  documentContentSchemaType,
}: Config<NotionPageProps, PreparedData>): FileFormatImporter {
  return {
    title: 'Notion HTML file',
    name: 'notionHtmlFile',
    async patchFromFile(file, documentId, client) {
      const {htmlFile, imageFiles} = await getFilesFromZip(file)

      const htmlString = await htmlFile.getData!(new BlobWriter()).then((blob) => blob.text())
      const htmlDocument = new DOMParser().parseFromString(htmlString, 'text/html')

      mergeOrderedListsInDocument(htmlDocument)

      const pagePropertiesElements = htmlDocument.body.querySelectorAll(
        'header table[class="properties"] tbody tr'
      )

      const pageProperties: Record<string, any> = {}

      pagePropertiesElements.forEach((tr) => {
        const name = tr.querySelector('th')?.textContent!
        const value = tr.querySelector('td')?.textContent!
        pageProperties[name] = value
      })

      const preparedData = await prepare?.({
        htmlDocument,
        imageFiles,
        // ! Fix this type error
        // @ts-expect-error
        pageProperties,
        client,
      })

      const blocks = htmlToBlocks(
        htmlDocument.querySelector('.page-body')!.innerHTML,
        documentContentSchemaType,
        {
          rules: deserializingRules(preparedData),
        }
      )

      const article = pageToDocument({
        props: pageProperties,
        // ! Fix this type error
        // @ts-expect-error
        blocks,
        // ! Fix this type error
        // @ts-expect-error
        preparedData,
        htmlDocument,
      })

      return client.createOrReplace({_id: `drafts.${documentId}`, _type: 'article', ...article})
    },
  }
}
