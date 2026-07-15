// Page-image content helpers. These mirror the canonical constants in the
// Day.ai backend (packages/common/src/pageImages.ts): a managed page image is
// an <img> whose src uses the stable prefix and whose file id attribute names
// a File object attached to the page.

export const PAGE_IMAGE_STABLE_SRC_PREFIX = 'day-ai-page-image:';
export const PAGE_IMAGE_FILE_ID_ATTR = 'data-page-image-file-id';

export const escapeHtmlAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Build the canonical <img> snippet for embedding a managed page image in
 * page HTML content. The fileId must come from attachPageImage/uploadPageImage
 * for the same page — images not attached to the page are stripped on save.
 */
export function buildPageImageHtml(fileId: string, alt: string): string {
  return `<img src="${PAGE_IMAGE_STABLE_SRC_PREFIX}${fileId}" ${PAGE_IMAGE_FILE_ID_ATTR}="${fileId}" alt="${escapeHtmlAttribute(alt)}">`;
}
