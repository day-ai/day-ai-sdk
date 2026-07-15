import { DayAIClient } from '../../../src/client';

// 1x1 transparent PNG
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const tinyPng = () => Buffer.from(TINY_PNG_BASE64, 'base64');

const parseToolResult = (result: any): any => {
  if (!result.success) {
    throw new Error(`Call failed: ${result.error}`);
  }
  if (result.data?.isError) {
    throw new Error(`Tool error: ${result.data.content[0]?.text}`);
  }
  const text = result.data?.content?.[0]?.text;
  if (!text) {
    throw new Error('Empty tool response');
  }
  return JSON.parse(text);
};

const expectToolError = (result: any, matching: RegExp) => {
  // Schema/handler failures surface either as a failed JSON-RPC call or as an
  // isError tool result — accept both, but require the message to match.
  const message = !result.success
    ? String(result.error ?? '')
    : result.data?.isError
      ? String(result.data.content?.[0]?.text ?? '')
      : null;

  if (message === null) {
    throw new Error(
      `Expected a tool error matching ${matching}, but the call succeeded: ${JSON.stringify(result.data)}`
    );
  }
  if (!matching.test(message)) {
    throw new Error(
      `Expected error matching ${matching}, got: ${message}`
    );
  }
};

// Test Case 1: full round-trip — create page, upload+attach image, embed it,
// verify it survives reads and a later text-only edit (SHOULD-ALLOW path).
export const testCase1 = {
  name: 'page images - upload, embed, and survive edits',
  description:
    'Creates a page, uploads a PNG via the 2-step flow, embeds it, and verifies the image node survives read_page and a subsequent text-only update',
  toolName: 'create_page',

  input: {
    title: 'SDK Page Image Test',
    pageHtmlContent: '<h2>Image test</h2><p>Intro paragraph before the image.</p>',
  },

  async validate(result: any) {
    const created = parseToolResult(result);
    const pageId = created?.page?.id ?? created?.focusObject?.objectId;
    if (!pageId) {
      throw new Error(`No page id in create_page result: ${JSON.stringify(created)}`);
    }

    const client = new DayAIClient();
    const image = tinyPng();

    // Client-side oversize guard fires before any upload.
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    let oversizeRejected = false;
    try {
      await client.uploadPageImage(pageId, oversized, {
        mimeType: 'image/png',
        filename: 'too-big.png',
      });
    } catch (error) {
      oversizeRejected = /exceed/i.test(String(error));
    }
    if (!oversizeRejected) {
      throw new Error('Oversized image was not rejected by the size guard');
    }

    // 2-step upload flow.
    const attachment = await client.uploadPageImage(pageId, image, {
      mimeType: 'image/png',
      filename: 'sdk-test.png',
    });

    if (!attachment.fileId) throw new Error('attachPageImage returned no fileId');
    if (!attachment.previewUrl) throw new Error('attachPageImage returned no previewUrl');
    if (!attachment.imageHtml?.includes(attachment.fileId)) {
      throw new Error(`imageHtml missing fileId: ${attachment.imageHtml}`);
    }

    // The previewUrl serves the uploaded bytes.
    const preview = await fetch(attachment.previewUrl);
    if (!preview.ok) {
      throw new Error(`previewUrl fetch failed: HTTP ${preview.status}`);
    }
    const previewType = preview.headers.get('content-type') ?? '';
    if (!previewType.startsWith('image/')) {
      throw new Error(`previewUrl content-type is not an image: ${previewType}`);
    }

    // Embed the image in the page content.
    const { contentHtml } = await client.readPageFullHtml(pageId);
    await client.updatePage({
      pageId,
      pageHtmlContent: `${contentHtml}${attachment.imageHtml}<p>Caption under the image.</p>`,
      refreshFirst: true,
    });

    const afterEmbed = await client.readPageFullHtml(pageId);
    if (!afterEmbed.contentHtml.includes(`data-page-image-file-id="${attachment.fileId}"`)) {
      throw new Error(
        `Embedded image missing from page content after update:\n${afterEmbed.contentHtml}`
      );
    }

    // A later text-only edit must not strip the image (storage settling).
    await client.updatePage({
      pageId,
      pageHtmlContent: `${afterEmbed.contentHtml}<p>Follow-up paragraph added later.</p>`,
      refreshFirst: true,
    });

    const afterEdit = await client.readPageFullHtml(pageId);
    if (!afterEdit.contentHtml.includes(`data-page-image-file-id="${attachment.fileId}"`)) {
      throw new Error('Image was stripped by a subsequent text-only update');
    }
    if (!afterEdit.contentHtml.includes('Follow-up paragraph')) {
      throw new Error('Text-only update did not apply');
    }

    console.log(`      ℹ️  page: ${pageId}, image: ${attachment.fileId}`);
    return true;
  },
};

// Test Case 2: unsupported mime type is rejected (SHOULD-BLOCK).
export const testCase2 = {
  name: 'page images - rejects unsupported mime type',
  description: 'get_page_image_upload_url with image/svg+xml should fail schema/mime validation',
  toolName: 'create_page',

  input: {
    title: 'SDK Page Image Mime Test',
    pageHtmlContent: '<p>Mime rejection test.</p>',
  },

  async validate(result: any) {
    const created = parseToolResult(result);
    const pageId = created?.page?.id ?? created?.focusObject?.objectId;
    if (!pageId) {
      throw new Error(`No page id in create_page result: ${JSON.stringify(created)}`);
    }

    const client = new DayAIClient();
    const raw = await client.mcpCallTool('get_page_image_upload_url', {
      objectId: pageId,
      mimeType: 'image/svg+xml',
    });
    expectToolError(raw, /unsupported|invalid|expected|enum/i);
    return true;
  },
};

// Test Case 3: upload URL for a nonexistent page is rejected (SHOULD-BLOCK).
export const testCase3 = {
  name: 'page images - rejects unknown page',
  description: 'get_page_image_upload_url for a nonexistent page should fail authorization',

  toolName: 'get_page_image_upload_url',
  input: {
    objectId: '00000000-0000-0000-0000-000000000000',
    mimeType: 'image/png',
  },

  async validate(result: any) {
    expectToolError(result, /does not exist|not found|access/i);
    return true;
  },
};

// Test Case 4: attaching a blob that was never uploaded is rejected (SHOULD-BLOCK).
export const testCase4 = {
  name: 'page images - rejects unknown blob',
  description: 'attach_page_image with a bogus blobId should fail',
  toolName: 'create_page',

  input: {
    title: 'SDK Page Image Blob Test',
    pageHtmlContent: '<p>Bogus blob test.</p>',
  },

  async validate(result: any) {
    const created = parseToolResult(result);
    const pageId = created?.page?.id ?? created?.focusObject?.objectId;
    if (!pageId) {
      throw new Error(`No page id in create_page result: ${JSON.stringify(created)}`);
    }

    const client = new DayAIClient();
    const raw = await client.mcpCallTool('attach_page_image', {
      objectId: pageId,
      blobId: 'blob-that-does-not-exist',
      filename: 'ghost.png',
    });
    expectToolError(raw, /failed|not found|blob|upload/i);
    return true;
  },
};

export const testCase = testCase1; // Default export
