import {Button, Spinner, Card, Flex, useToast, Radio, Label} from '@sanity/ui'
import {ComponentProps, FormEvent, useCallback, useState} from 'react'
import {SanityClient, useClient} from 'sanity'
import {UserViewComponent} from 'sanity/desk'
import {usePaneRouter} from 'sanity/desk'

// TODO add dynamic error message to config

export type PatchFromFileFn<DocumentType extends Record<string, any> = Record<string, any>> = (
  file: File,
  documentId: string,
  client: SanityClient
) => Promise<DocumentType>

export interface FileFormatImporter {
  name: string
  title: string
  patchFromFile: PatchFromFileFn
}

export interface Config {
  fileFormatImporters: FileFormatImporter[]
  defaultSelectedFormat?: string
  switchPaneOnSuccess?: boolean
  hideFormatSelector?: boolean
  successMessage?: string
}
export type {Config as ImportViewComponentConfig}

export function generateFileImporterViewComponent({
  fileFormatImporters,
  defaultSelectedFormat,
  switchPaneOnSuccess = true,
  hideFormatSelector = false,
  successMessage,
}: Config) {
  return function ImportViewComponent({documentId}: ComponentProps<UserViewComponent>) {
    const router = usePaneRouter()
    const toast = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const client = useClient({apiVersion: '2023-04-23'})

    const onSubmit = useCallback(
      async (ev: FormEvent<HTMLFormElement>) => {
        setIsLoading(true)
        ev.preventDefault()
        const formData = new FormData(ev.target as HTMLFormElement)
        const fileFormat = formData.get('fileFormat')
        const patchFromFile = fileFormatImporters.find(
          ({name}) => name === fileFormat
        )!.patchFromFile
        try {
          await patchFromFile(formData.get('file')! as File, documentId, client)
          setIsLoading(false)
          toast.push({
            title: successMessage ?? 'Article imported successfully',
            status: 'success',
          })
          if (switchPaneOnSuccess) router.setView('editor')
        } catch (e) {
          setIsLoading(false)
          toast.push({
            title: 'There was an error while importing the article',
            description:
              "In the future, this error message will be more detailed. Please hang tight while we work on it. Most likely, you forgot to upload one or more images (don't forget the cover image!) into Sanity and use them inside Notion before importing.",
            status: 'error',
          })
        }
      },
      [client, documentId, router, toast]
    )

    if (
      !fileFormatImporters ||
      !Array.isArray(fileFormatImporters) ||
      fileFormatImporters.length === 0 ||
      new Set(fileFormatImporters.map(({name}) => name)).size !== fileFormatImporters.length
    )
      throw new Error('Invalid prop `fileFormatImporters`. Check documentation')

    const defaultFormatName = defaultSelectedFormat ?? fileFormatImporters[0].name

    return (
      <Card padding={4}>
        <Card paddingY={3}>
          {/* @ts-expect-error */}
          <Flex gap={4} direction="column" align="flex-start" as="form" onSubmit={onSubmit}>
            {fileFormatImporters.map(({name, title}) => (
              <Flex key={name} align="center" gap={2}>
                <Radio
                  name="fileFormat"
                  value={name}
                  required
                  hidden={hideFormatSelector}
                  defaultChecked={name === defaultFormatName}
                />
                <Label as="label">{title}</Label>
              </Flex>
            ))}

            <input name="file" required type="file" disabled={isLoading} />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner /> : 'Import'}
            </Button>
          </Flex>
        </Card>
      </Card>
    )
  }
}
