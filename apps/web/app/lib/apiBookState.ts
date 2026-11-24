import { computed, nextTick, ref, shallowRef } from 'vue'

export interface ApiBookOpener { focus(): void }

const sectionKey = 'inherit.v8.api-section'

export function useApiBook() {
  const opener = shallowRef<ApiBookOpener>()
  const isOpen = computed(() => !!opener.value)
  const sectionId = ref<string>()
  try { sectionId.value = sessionStorage.getItem(sectionKey) ?? undefined }
  catch { /* Keep the selection in this frame when storage is unavailable. */ }

  function selectSection(id: string) {
    sectionId.value = id
    try { sessionStorage.setItem(sectionKey, id) }
    catch { /* The selection still survives closing the book. */ }
  }

  function open(from: ApiBookOpener) {
    opener.value ??= from
  }

  async function close() {
    const from = opener.value
    opener.value = undefined
    await nextTick()
    if (!isOpen.value) from?.focus()
  }

  return { isOpen, sectionId, selectSection, open, close }
}
