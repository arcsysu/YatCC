const LIGHTBOX_ROOT_CLASS = 'yat-lightbox';
const LIGHTBOX_OPEN_CLASS = 'yat-lightbox--open';
const BODY_LOCK_CLASS = 'yat-lightbox-open';
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const QUICK_ZOOM = 2;
const CLICK_DELAY = 220;
const DRAG_THRESHOLD = 3;

let lightboxRoot = null;
let lightboxPanel = null;
let lightboxViewport = null;
let lightboxPan = null;
let lightboxImage = null;
let lightboxCaption = null;
let lightboxZoomOut = null;
let lightboxZoomIn = null;
let lightboxZoomReset = null;
let lightboxZoomValue = null;
let isLightboxOpen = false;
let hasGlobalBindings = false;

const zoomState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  hasPointerMoved: false,
  suppressClick: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartOffsetX: 0,
  dragStartOffsetY: 0,
  baseWidth: 0,
  baseHeight: 0,
  pendingClickTimer: null,
};

function isImageLikeHref(href) {
  if (!href) {
    return false;
  }

  const sanitized = href.split('#')[0].split('?')[0].toLowerCase();
  return /\.(png|apng|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(sanitized);
}

function getImageSourceFromLinkOrImage(img) {
  const link = img.closest('a[href]');
  if (!link) {
    return img.currentSrc || img.src;
  }

  const href = link.getAttribute('href') || '';
  if (isImageLikeHref(href)) {
    return link.href;
  }

  const imgSrc = img.currentSrc || img.src;
  if (link.href === imgSrc) {
    return imgSrc;
  }

  return null;
}

function getImageCaption(img) {
  const figure = img.closest('figure');
  const figcaption = figure?.querySelector('figcaption');
  if (figcaption && figcaption.textContent) {
    return figcaption.textContent.trim();
  }

  return (img.getAttribute('alt') || '').trim();
}

function clearPendingClick() {
  if (!zoomState.pendingClickTimer) {
    return;
  }

  window.clearTimeout(zoomState.pendingClickTimer);
  zoomState.pendingClickTimer = null;
}

function handleViewportClick(event) {
  if (!isLightboxOpen || event.button !== 0) {
    return;
  }

  if (zoomState.suppressClick) {
    zoomState.suppressClick = false;
    return;
  }

  clearPendingClick();
  zoomState.pendingClickTimer = window.setTimeout(() => {
    zoomState.pendingClickTimer = null;
    setScale(zoomState.scale + ZOOM_STEP);
  }, CLICK_DELAY);
}

function handleViewportDoubleClick(event) {
  if (!isLightboxOpen || event.button !== 0) {
    return;
  }

  clearPendingClick();

  if (zoomState.suppressClick) {
    zoomState.suppressClick = false;
    return;
  }

  setScale(zoomState.scale > 1 ? 1 : QUICK_ZOOM, true);
}

function ensureLightboxElements() {
  if (lightboxRoot) {
    return;
  }

  const root = document.createElement('div');
  root.className = LIGHTBOX_ROOT_CLASS;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Image preview');

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'yat-lightbox__backdrop';
  backdrop.setAttribute('aria-label', 'Zoom out image');

  const panel = document.createElement('figure');
  panel.className = 'yat-lightbox__panel';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'yat-lightbox__close';
  close.setAttribute('aria-label', 'Close image preview');
  close.textContent = '×';

  const toolbar = document.createElement('div');
  toolbar.className = 'yat-lightbox__toolbar';

  const zoomOut = document.createElement('button');
  zoomOut.type = 'button';
  zoomOut.className = 'yat-lightbox__zoom-button';
  zoomOut.setAttribute('aria-label', 'Zoom out');
  zoomOut.textContent = '-';

  const zoomValue = document.createElement('span');
  zoomValue.className = 'yat-lightbox__zoom-value';
  zoomValue.textContent = '100%';

  const zoomIn = document.createElement('button');
  zoomIn.type = 'button';
  zoomIn.className = 'yat-lightbox__zoom-button';
  zoomIn.setAttribute('aria-label', 'Zoom in');
  zoomIn.textContent = '+';

  const zoomReset = document.createElement('button');
  zoomReset.type = 'button';
  zoomReset.className = 'yat-lightbox__zoom-button yat-lightbox__zoom-button--reset';
  zoomReset.setAttribute('aria-label', 'Reset zoom');
  zoomReset.textContent = '1:1';

  toolbar.append(zoomOut, zoomValue, zoomIn, zoomReset);

  const viewport = document.createElement('div');
  viewport.className = 'yat-lightbox__viewport';

  const pan = document.createElement('div');
  pan.className = 'yat-lightbox__pan';

  const image = document.createElement('img');
  image.className = 'yat-lightbox__image';
  image.draggable = false;

  pan.append(image);
  viewport.append(pan);

  const caption = document.createElement('figcaption');
  caption.className = 'yat-lightbox__caption';

  panel.append(close, toolbar, viewport, caption);
  root.append(backdrop, panel);
  document.body.appendChild(root);

  lightboxRoot = root;
  lightboxPanel = panel;
  lightboxViewport = viewport;
  lightboxPan = pan;
  lightboxImage = image;
  lightboxCaption = caption;
  lightboxZoomOut = zoomOut;
  lightboxZoomIn = zoomIn;
  lightboxZoomReset = zoomReset;
  lightboxZoomValue = zoomValue;

  backdrop.addEventListener('click', (event) => {
    event.preventDefault();
    if (!isLightboxOpen) {
      return;
    }

    setScale(zoomState.scale - ZOOM_STEP);
  });
  close.addEventListener('click', closeLightbox);
  zoomOut.addEventListener('click', () => setScale(zoomState.scale - ZOOM_STEP));
  zoomIn.addEventListener('click', () => setScale(zoomState.scale + ZOOM_STEP));
  zoomReset.addEventListener('click', () => setScale(1, true));

  viewport.addEventListener(
    'wheel',
    (event) => {
      if (!isLightboxOpen) {
        return;
      }

      event.preventDefault();
      const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setScale(zoomState.scale + delta);
    },
    { passive: false },
  );

  viewport.addEventListener('click', handleViewportClick);
  viewport.addEventListener('dblclick', handleViewportDoubleClick);

  viewport.addEventListener('pointerdown', (event) => {
    if (!isLightboxOpen || event.button !== 0 || zoomState.scale <= 1) {
      return;
    }

    zoomState.isDragging = true;
    zoomState.hasPointerMoved = false;
    zoomState.dragStartX = event.clientX;
    zoomState.dragStartY = event.clientY;
    zoomState.dragStartOffsetX = zoomState.offsetX;
    zoomState.dragStartOffsetY = zoomState.offsetY;

    lightboxViewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!zoomState.isDragging) {
      return;
    }

    const moveX = event.clientX - zoomState.dragStartX;
    const moveY = event.clientY - zoomState.dragStartY;

    if (!zoomState.hasPointerMoved && (Math.abs(moveX) > DRAG_THRESHOLD || Math.abs(moveY) > DRAG_THRESHOLD)) {
      zoomState.hasPointerMoved = true;
      lightboxRoot.classList.add('yat-lightbox--dragging');
    }

    const nextX = zoomState.dragStartOffsetX + moveX;
    const nextY = zoomState.dragStartOffsetY + moveY;
    const { x, y } = clampOffsets(nextX, nextY);
    zoomState.offsetX = x;
    zoomState.offsetY = y;
    applyImageTransform();
  });

  const stopDrag = () => {
    clearPendingClick();

    if (zoomState.isDragging && zoomState.hasPointerMoved) {
      zoomState.suppressClick = true;
      window.setTimeout(() => {
        zoomState.suppressClick = false;
      }, 0);
    }

    zoomState.isDragging = false;
    zoomState.hasPointerMoved = false;
    lightboxRoot.classList.remove('yat-lightbox--dragging');
  };

  viewport.addEventListener('pointerup', stopDrag);
  viewport.addEventListener('pointercancel', stopDrag);

  image.addEventListener('load', () => {
    if (!isLightboxOpen) {
      return;
    }

    resetZoomState();
    cacheBaseSize();
    applyImageTransform();
  });
}

function cacheBaseSize() {
  if (!lightboxImage) {
    return;
  }

  const prevScale = zoomState.scale;
  const prevX = zoomState.offsetX;
  const prevY = zoomState.offsetY;

  zoomState.scale = 1;
  zoomState.offsetX = 0;
  zoomState.offsetY = 0;
  applyImageTransform();

  const rect = lightboxImage.getBoundingClientRect();
  zoomState.baseWidth = rect.width || 0;
  zoomState.baseHeight = rect.height || 0;

  zoomState.scale = prevScale;
  zoomState.offsetX = prevX;
  zoomState.offsetY = prevY;
}

function getOffsetBounds() {
  if (!lightboxViewport || !zoomState.baseWidth || !zoomState.baseHeight) {
    return { maxX: 0, maxY: 0 };
  }

  const viewportRect = lightboxViewport.getBoundingClientRect();
  const scaledWidth = zoomState.baseWidth * zoomState.scale;
  const scaledHeight = zoomState.baseHeight * zoomState.scale;

  const maxX = Math.max(0, (scaledWidth - viewportRect.width) / 2);
  const maxY = Math.max(0, (scaledHeight - viewportRect.height) / 2);

  return { maxX, maxY };
}

function clampOffsets(x, y) {
  const { maxX, maxY } = getOffsetBounds();
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  };
}

function syncZoomUi() {
  if (!lightboxRoot || !lightboxZoomValue || !lightboxZoomOut || !lightboxZoomIn) {
    return;
  }

  lightboxRoot.classList.toggle('yat-lightbox--zoomed', zoomState.scale > 1);
  lightboxZoomValue.textContent = `${Math.round(zoomState.scale * 100)}%`;
  lightboxZoomOut.disabled = zoomState.scale <= ZOOM_MIN;
  lightboxZoomIn.disabled = zoomState.scale >= ZOOM_MAX;
}

function applyImageTransform() {
  if (!lightboxPan || !lightboxImage) {
    return;
  }

  lightboxPan.style.transform = `translate3d(${zoomState.offsetX}px, ${zoomState.offsetY}px, 0)`;
  lightboxImage.style.transform = `scale(${zoomState.scale})`;
  syncZoomUi();
}

function resetZoomState() {
  clearPendingClick();
  zoomState.scale = 1;
  zoomState.offsetX = 0;
  zoomState.offsetY = 0;
  zoomState.isDragging = false;
  zoomState.hasPointerMoved = false;
  zoomState.suppressClick = false;
}

function setScale(nextScale, resetOffset = false) {
  const clampedScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextScale));

  if (clampedScale === zoomState.scale && !resetOffset) {
    return;
  }

  zoomState.scale = clampedScale;

  if (resetOffset || zoomState.scale === 1) {
    zoomState.offsetX = 0;
    zoomState.offsetY = 0;
  } else {
    const { x, y } = clampOffsets(zoomState.offsetX, zoomState.offsetY);
    zoomState.offsetX = x;
    zoomState.offsetY = y;
  }

  applyImageTransform();
}

function openLightbox(source, altText, captionText) {
  ensureLightboxElements();

  resetZoomState();
  applyImageTransform();

  lightboxImage.src = source;
  lightboxImage.alt = altText || captionText || 'Preview image';
  lightboxCaption.textContent = captionText || '';
  lightboxCaption.hidden = !captionText;

  lightboxRoot.classList.add(LIGHTBOX_OPEN_CLASS);
  document.body.classList.add(BODY_LOCK_CLASS);
  isLightboxOpen = true;
}

function closeLightbox() {
  if (!lightboxRoot || !isLightboxOpen) {
    return;
  }

  resetZoomState();
  applyImageTransform();

  lightboxRoot.classList.remove(LIGHTBOX_OPEN_CLASS);
  lightboxRoot.classList.remove('yat-lightbox--dragging');
  document.body.classList.remove(BODY_LOCK_CLASS);
  isLightboxOpen = false;
}

function shouldSkipImage(img) {
  if (!img || !img.isConnected) {
    return true;
  }

  if (img.dataset.noLightbox === 'true') {
    return true;
  }

  if (img.closest('pre, code, .yat-agent, .md-header, .md-sidebar, .md-footer')) {
    return true;
  }

  if (!img.closest('.md-content .md-typeset')) {
    return true;
  }

  return false;
}

function bindImage(img) {
  if (img.dataset.yatLightboxBound === 'true' || shouldSkipImage(img)) {
    return;
  }

  img.dataset.yatLightboxBound = 'true';
  img.classList.add('yat-lightbox-trigger');

  img.addEventListener('dblclick', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const source = getImageSourceFromLinkOrImage(img);
    if (!source) {
      return;
    }

    const link = img.closest('a[href]');
    if (link) {
      event.preventDefault();
    }

    openLightbox(source, img.getAttribute('alt') || '', getImageCaption(img));
  });
}

function bindImagesInDocument() {
  const images = document.querySelectorAll('.md-content .md-typeset img');
  for (const image of images) {
    bindImage(image);
  }
}

function bindGlobalHandlers() {
  if (hasGlobalBindings) {
    return;
  }

  hasGlobalBindings = true;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
    }
  });
}

function initImageLightbox() {
  bindGlobalHandlers();
  bindImagesInDocument();
}

document.addEventListener('DOMContentLoaded', initImageLightbox, { once: true });

if (typeof window.document$?.subscribe === 'function') {
  window.document$.subscribe(initImageLightbox);
}
