import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/** Pixels of the page hidden behind the on-screen keyboard, so a bar kept in view sits above it (iOS leaves `sticky` behind the keyboard). */
export const useKeyboardInset = (): Ref<number> => {
  const inset = ref(0);

  const measure = (): void => {
    const viewport = window.visualViewport;
    inset.value = viewport ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)) : 0;
  };

  onMounted(() => {
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
  });
  onBeforeUnmount(() => {
    window.visualViewport?.removeEventListener('resize', measure);
    window.visualViewport?.removeEventListener('scroll', measure);
  });

  return inset;
};
