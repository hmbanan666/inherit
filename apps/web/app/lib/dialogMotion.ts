import { ref, type ObjectDirective } from 'vue'

export function dialogClose(close: () => void) {
  const closing = ref(false)
  let fallback: ReturnType<typeof setTimeout> | undefined

  function finish() {
    if (fallback === undefined) return
    clearTimeout(fallback)
    fallback = undefined
    close()
  }
  function requestClose() {
    if (closing.value) return
    closing.value = true
    fallback = setTimeout(finish, 200)
  }
  function animationEnd(name: string) {
    if (name === 'dialog-panel-out') finish()
  }
  function reset() {
    clearTimeout(fallback)
    fallback = undefined
    closing.value = false
  }
  function onPanelEnd(event: Event) {
    if (event.target === event.currentTarget && event instanceof AnimationEvent) animationEnd(event.animationName)
  }

  // Both native shells put their panel directly inside the dialog. Set the
  // standalone book's focus target before its own mounted showModal() runs.
  const vDialogMotion: ObjectDirective<HTMLDialogElement> = {
    beforeMount(dialog) {
      const panel = dialog.firstElementChild as HTMLElement
      if (!panel.autofocus) {
        panel.querySelector('[autofocus]')?.removeAttribute('autofocus')
        panel.tabIndex = -1
        panel.autofocus = true
      }
      panel.addEventListener('animationend', onPanelEnd)
    },
    beforeUnmount(dialog) {
      dialog.firstElementChild?.removeEventListener('animationend', onPanelEnd)
      reset()
    },
  }
  return { closing, requestClose, animationEnd, reset, vDialogMotion }
}
