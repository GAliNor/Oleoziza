import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

const FOLLOW_DISTANCE_PX = 240;
/** Share of the remaining distance covered each frame: a critically damped glide, never a jump. */
const GLIDE_FACTOR = 0.16;
const SETTLED_PX = 0.5;
const USER_SCROLL_EVENTS = ['wheel', 'touchmove', 'keydown'] as const;

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Keeps the newest answer in view only while the reader is near the bottom, gliding as it grows; otherwise it raises `hasUnread` for a « latest » pill. */
export const useChatScroll = (endRef: Ref<HTMLElement | null>): { hasUnread: Ref<boolean>; scrollToLatest: (isSmooth?: boolean) => void; followAnswer: () => void } => {
  const hasUnread = ref(false);
  let isFollowing = true;
  let frame = 0;

  const bottomOf = (): number => {
    const end = endRef.value;
    if (!end) return document.documentElement.scrollHeight - window.innerHeight;
    const margin = parseFloat(getComputedStyle(end).scrollMarginBottom) || 0;
    return Math.max(0, window.scrollY + end.getBoundingClientRect().bottom + margin - window.innerHeight);
  };

  const stopGlide = (): void => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const glide = (): void => {
    if (frame) return;
    const step = (): void => {
      const remaining = bottomOf() - window.scrollY;
      if (!isFollowing || Math.abs(remaining) < SETTLED_PX) {
        frame = 0;
        return;
      }
      window.scrollTo(0, window.scrollY + remaining * GLIDE_FACTOR + Math.sign(remaining) * SETTLED_PX);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  const handleScroll = (): void => {
    const remaining = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    isFollowing = remaining < FOLLOW_DISTANCE_PX;
    if (isFollowing) hasUnread.value = false;
  };

  /** The reader took the wheel: let go at once instead of fighting them. */
  const handleUserScroll = (event: Event): void => {
    if (event instanceof KeyboardEvent && !['ArrowUp', 'PageUp', 'Home'].includes(event.key)) return;
    stopGlide();
  };

  const scrollToLatest = (isSmooth = false): void => {
    isFollowing = true;
    hasUnread.value = false;
    void nextTick(() => {
      stopGlide();
      if (isSmooth && !prefersReducedMotion()) glide();
      else window.scrollTo(0, bottomOf());
    });
  };

  const followAnswer = (): void => {
    if (!isFollowing) {
      hasUnread.value = true;
      return;
    }
    if (prefersReducedMotion()) void nextTick(() => window.scrollTo(0, bottomOf()));
    else void nextTick(glide);
  };

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    USER_SCROLL_EVENTS.forEach((name) => window.addEventListener(name, handleUserScroll, { passive: true }));
  });
  onBeforeUnmount(() => {
    stopGlide();
    window.removeEventListener('scroll', handleScroll);
    USER_SCROLL_EVENTS.forEach((name) => window.removeEventListener(name, handleUserScroll));
  });

  return { hasUnread, scrollToLatest, followAnswer };
};
