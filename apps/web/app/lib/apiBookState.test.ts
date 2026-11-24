import { afterEach, expect, test, vi } from 'vitest'
import { useApiBook } from './apiBookState'

afterEach(() => vi.unstubAllGlobals())

test('closing the book returns focus to the API button or Monaco that opened it', async () => {
  const book = useApiBook()
  const button = { focus: vi.fn() }
  const editor = { focus: vi.fn() }

  for (const opener of [button, editor]) {
    book.open(opener)
    expect(book.isOpen.value).toBe(true)
    expect(opener.focus).not.toHaveBeenCalled()
    await book.close()
    expect(book.isOpen.value).toBe(false)
    expect(opener.focus).toHaveBeenCalledOnce()
  }
  expect(button.focus).toHaveBeenCalledOnce()
})

test('an open book keeps its original opener until it closes', async () => {
  const book = useApiBook()
  const button = { focus: vi.fn() }
  const editor = { focus: vi.fn() }
  book.open(button)
  book.open(editor)
  await book.close()
  expect(button.focus).toHaveBeenCalledOnce()
  expect(editor.focus).not.toHaveBeenCalled()
})

test('reopening and reloading in the same tab remember the last API section', async () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })
  const book = useApiBook()
  const opener = { focus() {} }
  book.open(opener)
  book.selectSection('lathe')
  await book.close()
  book.open(opener)
  expect(book.sectionId.value).toBe('lathe')
  expect(useApiBook().sectionId.value).toBe('lathe')
})
