import { GoogleGenAI, Modality } from "@google/genai";
import type { ControlPanelState } from '../types';
import { uploadImageToBucket } from './appwriteService';

let ai: GoogleGenAI | null = null;

/**
 * Creates a sanitized, snake_case filename from a text prompt.
 * @param prompt The user-provided theme.
 * @param suffix The suffix to append before the file extension (e.g., 'org', 'mod').
 * @returns A sanitized string suitable for a filename.
 */
function createFileNameFromPrompt(prompt: string, suffix: string): string {
  const sanitizedBase = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
    .replace(/[\s-]+/g, '_')     // Replace spaces and hyphens with a single underscore
    .replace(/_+/g, '_')         // Collapse multiple underscores
    .slice(0, 50)                // Truncate to a reasonable length to avoid overly long filenames
    .replace(/_$/, '');          // Remove trailing underscore if any

  return `${sanitizedBase}_${suffix}.png`;
}

export function initGemini(apiKey: string) {
  if (!apiKey) {
    console.error("Attempted to initialize Gemini without an API key.");
    return;
  }
  ai = new GoogleGenAI({ apiKey });
}

interface GeneratedImages {
  original: string; // URL from storage or a base64 data URL
  modified: string; // URL from storage or a base64 data URL
}

export async function generateImages(
    settings: ControlPanelState,
    onProgress: (message: string) => void
): Promise<GeneratedImages> {
  if (!ai) {
    throw new Error("Gemini Service not initialized. Please configure the API Key in the settings.");
  }

  // Step 1: Generate the base image using Imagen
  onProgress('Generating base image...');
  const imageResponse = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: `Generate a photorealistic, detailed image suitable for a 'spot the difference' game. The theme is: ${settings.prompt}. The image should be rich in detail, but with clear, distinct subjects and avoid overly fine, repetitive textures that could be mistaken for noise. Style: digital art, high fantasy.`,
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
    },
  });

  const baseImage = imageResponse.generatedImages[0];
  if (!baseImage?.image?.imageBytes) {
    throw new Error('Base image generation failed to return image data.');
  }

  const originalBase64 = baseImage.image.imageBytes;
  const originalMimeType = 'image/png'; // Imagen returns png
  const originalDataUrl = `data:${originalMimeType};base64,${originalBase64}`;

  // Step 2: Edit the base image to create differences.
  onProgress('Generating modified image...');
  const editPrompt = `You are an expert image editor creating a 'spot the difference' game.
Your task is to introduce between 5 and 7 subtle but clearly visible changes to the provided image.
-   **VALID CHANGES:** Add a small object, remove a small object, or significantly alter an existing object's shape or position.
-   **INVALID CHANGES:** Do NOT make simple color changes, brightness adjustments, or tiny texture variations. The changes must be structural.
-   **VISIBILITY:** The changes MUST be unambiguously visible to a human eye.
Your output for this step MUST be the edited image ONLY. Do not output text.`;

  const editResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: originalBase64,
            mimeType: originalMimeType,
          },
        },
        {
          text: editPrompt,
        },
      ],
    },
    // We only expect an image back from this call
    config: {
        // FIX: Per SDK guidelines, responseModalities for image editing must include both IMAGE and TEXT.
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    }
  });

  // FIX: Find the image part in the response instead of assuming it's the first one.
  const modifiedImagePart = editResponse.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);

  if (!modifiedImagePart?.inlineData?.data) {
    console.error("Model Response Analysis (Image Edit):", JSON.stringify(editResponse, null, 2));
    throw new Error('Image editing failed. The model did not return an edited image. Check console for model response.');
  }
  const modifiedBase64 = modifiedImagePart.inlineData.data;
  const modifiedMimeType = modifiedImagePart.inlineData.mimeType;
  const modifiedDataUrl = `data:${modifiedMimeType};base64,${modifiedBase64}`;

  // Step 3: Attempt to upload images to Appwrite Storage, but fail gracefully.
  try {
    const originalFileName = createFileNameFromPrompt(settings.prompt, 'org');
    const modifiedFileName = createFileNameFromPrompt(settings.prompt, 'mod');

    onProgress('Uploading original image to storage...');
    const originalUrl = await uploadImageToBucket(originalDataUrl, originalFileName);
    
    onProgress('Uploading modified image to storage...');
    const modifiedUrl = await uploadImageToBucket(modifiedDataUrl, modifiedFileName);

    // If successful, return the Appwrite URLs
    return {
      original: originalUrl,
      modified: modifiedUrl,
    };
  } catch (error) {
    console.warn("Could not upload images to Appwrite. Using local data URLs instead. Error:", error);
    onProgress('Storage service unavailable. Proceeding locally...');
    
    // If Appwrite upload fails, return the base64 data URLs directly
    return {
        original: originalDataUrl,
        modified: modifiedDataUrl,
    };
  }
}