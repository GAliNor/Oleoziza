import { onScopeDispose, ref, watch, type CSSProperties, type Ref } from 'vue';

export type FloatingPlacement = 'below' | 'above';

const GAP = 8;
const EDGE = 8;
const ROOM_BELOW = 220;

interface IViewportBox {
  top: number;
  bottom: number;
  width: number;
}

/** The part of the page the person sees, in layout-viewport coordinates: on a tablet it shrinks when the keyboard is up. */
const visibleBox = (): IViewportBox => {
  const viewport = window.visualViewport;
  if (!viewport) return { top: 0, bottom: window.innerHeight, width: document.documentElement.clientWidth };
  return { top: viewport.offsetTop, bottom: viewport.offsetTop + viewport.height, width: document.documentElement.clientWidth };
};

/** Picks the side with room, preferring below, and the height the panel may take there. */
export const placePanel = (anchor: DOMRect, box: IViewportBox, panelHeight: number): { placement: FloatingPlacement; maxHeight: number } => {
  const roomBelow = box.bottom - anchor.bottom - GAP - EDGE;
  const roomAbove = anchor.top - box.top - GAP - EDGE;
  const fitsBelow = roomBelow >= Math.min(ROOM_BELOW, panelHeight || ROOM_BELOW);
  if (fitsBelow || roomBelow >= roomAbove) return { placement: 'below', maxHeight: Math.max(0, roomBelow) };
  return { placement: 'above', maxHeight: Math.max(0, roomAbove) };
};

/** Keeps the panel's start edge on the anchor's, shifted back inside the screen when it would overflow. */
export const alignPanel = (anchor: DOMRect, panelWidth: number, viewportWidth: number, isRtl: boolean): number => {
  const start = isRtl ? anchor.right - panelWidth : anchor.left;
  return Math.min(Math.max(EDGE, start), Math.max(EDGE, viewportWidth - panelWidth - EDGE));
};

/**
 * Places a teleported dropdown panel against its anchor with fixed positioning, so no container with hidden
 * overflow can cut it, flipping above when the room below (keyboard included) is too short. While open it
 * follows scrolling and resizing, and calls `onDismiss` when a pointer goes down outside the anchor and the panel.
 */
export const useFloatingPanel = (anchor: Ref<HTMLElement | null>, panel: Ref<HTMLElement | null>, isOpen: Ref<boolean>, onDismiss: () => void) => {
  const panelStyle = ref<CSSProperties>({});
  const placement = ref<FloatingPlacement>('below');
  let frame = 0;

  const update = (): void => {
    frame = 0;
    if (!anchor.value) return;
    const rect = anchor.value.getBoundingClientRect();
    const box = visibleBox();
    const placed = placePanel(rect, box, panel.value?.scrollHeight ?? 0);
    const isRtl = getComputedStyle(anchor.value).direction === 'rtl';
    const left = alignPanel(rect, panel.value?.offsetWidth ?? rect.width, box.width, isRtl);
    placement.value = placed.placement;
    panelStyle.value = {
      position: 'fixed',
      left: `${left}px`,
      minWidth: `${rect.width}px`,
      maxHeight: `${placed.maxHeight}px`,
      ...(placed.placement === 'below' ? { top: `${rect.bottom + GAP}px` } : { bottom: `${document.documentElement.clientHeight - rect.top + GAP}px` }),
    };
  };

  const schedule = (): void => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  const handleScroll = (event: Event): void => {
    if (panel.value?.contains(event.target as Node)) return;
    schedule();
  };

  const handlePointerDown = (event: Event): void => {
    const target = event.target as Node;
    if (anchor.value?.contains(target) || panel.value?.contains(target)) return;
    onDismiss();
  };

  const listen = (isOn: boolean): void => {
    const method = isOn ? 'addEventListener' : 'removeEventListener';
    window[method]('scroll', handleScroll, { capture: true, passive: true });
    window[method]('resize', schedule);
    window.visualViewport?.[method]('resize', schedule);
    window.visualViewport?.[method]('scroll', schedule);
    document[method]('pointerdown', handlePointerDown, { capture: true });
  };

  watch(
    isOpen,
    (open) => {
      listen(open);
      if (open) {
        update();
        requestAnimationFrame(update);
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { flush: 'post' },
  );

  onScopeDispose(() => {
    listen(false);
    if (frame) cancelAnimationFrame(frame);
  });

  return { panelStyle, placement, update };
};
