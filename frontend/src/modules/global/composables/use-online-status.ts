import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';

export const useOnlineStatus = (): { isOnline: Ref<boolean> } => {
  const isOnline = ref(navigator.onLine);

  const handleOnline = (): void => {
    isOnline.value = true;
  };
  const handleOffline = (): void => {
    isOnline.value = false;
  };

  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });

  return { isOnline };
};
