// Shared background-scroll lock using a reference counter.
//
// Multiple overlays (mobile sidebar, notifications drawer, profile drawer,
// cargo manifest, etc.) each call lockScroll() when they open and
// unlockScroll() when they close. The page only becomes scrollable again once
// every lock is released, so one overlay closing can never unlock the page
// while another is still open.
//
// We lock both <body> and <html> (documentElement) because in some setups the
// vertical scroll happens on the html element rather than body, and locking
// only one of them can fail to actually stop background scrolling.

let lockCount = 0;
let previousHtmlOverflow = '';
let previousBodyOverflow = '';
let previousHtmlOverscroll = '';
let previousBodyOverscroll = '';

export function lockScroll(): void {
  lockCount += 1;
  if (lockCount === 1) {
    previousHtmlOverflow = document.documentElement.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
  }
}

export function unlockScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    document.body.style.overscrollBehavior = previousBodyOverscroll;
  }
}
