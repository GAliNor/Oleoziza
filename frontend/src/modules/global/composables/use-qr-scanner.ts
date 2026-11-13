import { onBeforeUnmount, ref, type Ref } from 'vue';

import { getQrDetector } from '~/plugins/barcode-detector';

export type QrScannerStatus = 'idle' | 'starting' | 'scanning' | 'denied' | 'unavailable';

const SCAN_INTERVAL_MS = 200;

/** Opens the rear camera into `video` and calls `onRead` with the first QR code it sees, then stops. */
export const useQrScanner = (video: Ref<HTMLVideoElement | null>, onRead: (text: string) => void) => {
  const status = ref<QrScannerStatus>('idle');
  let stream: MediaStream | null = null;
  let timer = 0;

  const stop = (): void => {
    window.clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video.value) video.value.srcObject = null;
    if (status.value === 'starting' || status.value === 'scanning') status.value = 'idle';
  };

  const scan = async (read: (source: HTMLVideoElement) => Promise<string[]>): Promise<void> => {
    if (!stream || !video.value) return;
    const [text] = video.value.readyState >= 2 ? await read(video.value).catch(() => []) : [];
    if (text && stream) {
      stop();
      onRead(text.trim());
      return;
    }
    timer = window.setTimeout(() => scan(read), SCAN_INTERVAL_MS);
  };

  const start = async (): Promise<void> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      status.value = 'unavailable';
      return;
    }
    status.value = 'starting';
    try {
      const [detector, media] = await Promise.all([
        getQrDetector(),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }),
      ]);
      stream = media;
      if (!video.value) return stop();
      video.value.srcObject = media;
      await video.value.play();
      status.value = 'scanning';
      scan((source) => detector.detect(source));
    } catch (error) {
      stop();
      status.value = error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'unavailable';
    }
  };

  onBeforeUnmount(stop);

  return { status, start, stop };
};
