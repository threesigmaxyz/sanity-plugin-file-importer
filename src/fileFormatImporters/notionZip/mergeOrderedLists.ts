export default function mergeOrderedListsInDocument(htmlDocument: Document): void {
  return Array.from(htmlDocument.querySelectorAll('ol[start="1"]'))
    .reverse()
    .forEach((list) => {
      let next = list.nextElementSibling
      while (next?.nodeName === 'OL' && next.getAttribute('start') !== '1') {
        list.innerHTML += next.innerHTML
        const nextNext = next.nextElementSibling
        next.remove()
        next = nextNext
      }
    })
}
