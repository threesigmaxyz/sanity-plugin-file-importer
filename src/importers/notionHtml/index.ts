import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  SanityClient,
  TypedObject,
} from 'sanity'
import type {FileFormatToDocument} from '../../ImportViewComponent'
import mergeOrderedListsInDocument from './mergeOrderedLists'
import type {DeserializerRule} from '@sanity/block-tools'
import {htmlToBlocks} from '@sanity/block-tools'
import groq from 'groq'

// TODO improve types of the config

interface Config<
  NotionPageProps extends Record<string, any>,
  PreparedData extends Record<string, any>
> {
  prepare: (props: {
    client: SanityClient
    preparedImgUrlList: string
    pageProperties: NotionPageProps
  }) => Promise<PreparedData>
  deserializingRules: (prepareResult: PreparedData) => DeserializerRule[]
  pageToDocument: (propsAndBlocks: {
    headerImageUrl: string
    props: NotionPageProps
    blocks: (TypedObject | PortableTextTextBlock<PortableTextObject | PortableTextSpan>)[]
    preparedData: PreparedData
    title: string
  }) => Record<string, any>
  documentContentSchemaType: any
}
export type {Config as NotionHtmlImporterConfig}

export function notionHtmlFileToDocument<
  NotionPageProps extends Record<string, any>,
  PrepareQueryType extends Record<string, any>
>({
  prepare,
  deserializingRules,
  pageToDocument,
  documentContentSchemaType,
}: Config<NotionPageProps, PrepareQueryType>): FileFormatToDocument {
  return {
    title: 'Notion HTML file',
    name: 'notionHtmlFile',
    patchFromFile: async (file, documentId, client) => {
      const htmlString = await file.text()
      const htmlDocument = new DOMParser().parseFromString(htmlString, 'text/html')
      const headerImageUrl =
        htmlDocument.body.querySelector('header img')?.getAttribute('src') ?? ''

      mergeOrderedListsInDocument(htmlDocument)

      const pagePropertiesItems = htmlDocument.body.querySelectorAll(
        'header table[class="properties"] tbody tr'
      )

      const pageProperties: Record<string, any> = {}

      pagePropertiesItems.forEach((tr) => {
        const name = tr.querySelector('th')?.textContent!
        const value = tr.querySelector('td')?.textContent!
        pageProperties[name] = value
      })

      const pageBody = htmlDocument.querySelector('.page-body')!
      const images = Array.from(pageBody.querySelectorAll('img'))
      const urlList = images
        .map((img) => `"${img.getAttribute('src')}"`)
        .concat(`"${headerImageUrl}"`)
        .join(', ')

      const preparedData = await prepare({
        preparedImgUrlList: urlList,
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
        headerImageUrl,
        // ! Fix this type error
        // @ts-expect-error
        props: pageProperties,
        // ! Fix this type error
        // @ts-expect-error
        blocks,
        preparedData,
        title: htmlDocument.title,
      })

      const draftArticleExists =
        (await client.fetch(groq`count(*[_id == $id][0])`, {id: `drafts.${documentId}`})) > 0

      return draftArticleExists
        ? client.patch(`drafts.${documentId}`, {set: article}).commit()
        : client.createOrReplace({_id: `drafts.${documentId}`, _type: 'article', ...article})
    },
  }
}
