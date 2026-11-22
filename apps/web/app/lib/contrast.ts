import { ref, watch } from 'vue'
export function useContrast() {
  const contrast = ref(false)
  try {contrast.value = localStorage.getItem('inherit.highContrast') === 'true'} catch { /* Use the default palette. */ }
  watch(contrast,value=>{
    try {localStorage.setItem('inherit.highContrast',String(value))} catch { /* Keep this session's preference. */ }
  })
  return contrast
}
