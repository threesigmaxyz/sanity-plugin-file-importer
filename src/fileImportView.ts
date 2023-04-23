import type {ComponentViewBuilder, StructureBuilder} from 'sanity/desk'
import ImportViewComponent from './ImportViewComponent'
import type {ImportViewComponentConfig} from './ImportViewComponent'

interface Config extends ImportViewComponentConfig {
  S: StructureBuilder
  viewTitle?: string
}
export type {Config as FileImporterConfig}

/**
 * Usage in `sanity.config.ts` (or .js)
 *
 * ```ts
 * import {defineConfig} from 'sanity'
 * import {FileImporter} from 'sanity-plugin-file-importer'
 *
 * export default defineConfig({
 *   // ...
 *   plugins: [deskTool({
 *    defaultDocumentNode: (S, {schemaType}) => {
 *      if (schemaType === 'article') {
 *        return S.document().views([
 *          // Your other views...
 *          fileImporterView(config),
 *        ])
 *      }
 *      return null
 *    },
 *   })],
 * })
 * ```
 */
export function fileImportView({
  S,
  viewTitle = 'Import',
  ...importViewComponentConfig
}: Config): ComponentViewBuilder {
  return S.view.component(ImportViewComponent(importViewComponentConfig)).title(viewTitle)
}
