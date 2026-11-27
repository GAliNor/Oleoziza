import { onBeforeUnmount, ref, type Ref } from 'vue';

export interface IVoiceRecording {
  blob: Blob;
  seconds: number;
  mimeType: string;
}

const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const LEVEL_BARS = 28;
const AUDIO_BITS_PER_SECOND = 32_000;

const pickMimeType = (): string => PREFERRED_MIME_TYPES.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) ?? '';

/** Records the microphone with a live level per bar for a waveform; at `maximumSeconds` it calls `onLimit` so the caller stops it as usual. `stop` resolves with the recording, `cancel` drops it. */
export const useVoiceRecorder = (
  maximumSeconds: number,
  onLimit: () => void,
): {
  isSupported: boolean;
  isRecording: Ref<boolean>;
  seconds: Ref<number>;
  levels: Ref<number[]>;
  hasDenied: Ref<boolean>;
  start: () => Promise<void>;
  stop: () => Promise<IVoiceRecording | null>;
  cancel: () => void;
} => {
  const isSupported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const isRecording = ref(false);
  const seconds = ref(0);
  const levels = ref<number[]>(Array(LEVEL_BARS).fill(0));
  const hasDenied = ref(false);
  let recorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let frame = 0;
  let finish: ((recording: IVoiceRecording | null) => void) | null = null;
  let isCancelled = false;

  const release = (): void => {
    clearInterval(timer);
    cancelAnimationFrame(frame);
    recorder?.stream.getTracks().forEach((track) => track.stop());
    void audioContext?.close().catch(() => undefined);
    audioContext = null;
    recorder = null;
    isRecording.value = false;
    levels.value = Array(LEVEL_BARS).fill(0);
  };

  /** Started inside the tap, as Safari requires, on the same stream as the recorder. */
  const listen = (stream: MediaStream): void => {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext = new AudioContextClass();
    void audioContext.resume();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const step = Math.floor(samples.length / LEVEL_BARS);
    const read = (): void => {
      analyser.getByteFrequencyData(samples);
      levels.value = Array.from({ length: LEVEL_BARS }, (_, index) => Math.min(1, samples[index * step] / 200));
      frame = requestAnimationFrame(read);
    };
    read();
  };

  const start = async (): Promise<void> => {
    if (!isSupported || isRecording.value) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
      listen(stream);
    } catch {
      hasDenied.value = true;
      return;
    }
    hasDenied.value = false;
    chunks = [];
    isCancelled = false;
    recorder.ondataavailable = (event: BlobEvent): void => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = (): void => {
      const type = recorder?.mimeType || pickMimeType() || 'audio/webm';
      const recording = isCancelled || !chunks.length ? null : { blob: new Blob(chunks, { type }), seconds: Math.max((Date.now() - startedAt) / 1000, 1), mimeType: type };
      release();
      finish?.(recording);
      finish = null;
    };
    startedAt = Date.now();
    seconds.value = 0;
    recorder.start();
    isRecording.value = true;
    timer = setInterval(() => {
      seconds.value = Math.floor((Date.now() - startedAt) / 1000);
      if (seconds.value >= maximumSeconds) {
        clearInterval(timer);
        onLimit();
      }
    }, 250);
  };

  const stop = (): Promise<IVoiceRecording | null> =>
    new Promise((resolve) => {
      if (!recorder || recorder.state === 'inactive') return resolve(null);
      finish = resolve;
      recorder.stop();
    });

  const cancel = (): void => {
    isCancelled = true;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else release();
  };

  onBeforeUnmount(cancel);

  return { isSupported, isRecording, seconds, levels, hasDenied, start, stop, cancel };
};
