import type { Difference, AnalysisParams } from '../types';

// --- Adaptive Parameter Logic ---

/**
 * Calculates a complexity score for an image based on edge detection.
 * A higher score indicates a more detailed and complex image.
 * @param imageData The pixel data of the image to analyze.
 * @returns A normalized complexity score (typically 0.0 to 0.3+).
 */
export function calculateImageComplexity(imageData: ImageData): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  let edgeCount = 0;

  // A simple gradient check to find edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const currentBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const rightBrightness = (data[i + 4] + data[i + 5] + data[i + 6]) / 3;
      const bottomBrightness = (data[i + (width * 4)] + data[i + (width * 4) + 1] + data[i + (width * 4) + 2]) / 3;

      // If there's a significant change in brightness, it's likely an edge
      if (Math.abs(currentBrightness - rightBrightness) > 25 || Math.abs(currentBrightness - bottomBrightness) > 25) {
        edgeCount++;
      }
    }
  }
  // Normalize the score by the number of pixels
  return edgeCount / (width * height);
}

/**
 * Returns a set of analysis parameters tuned for the given image complexity.
 * @param complexity The complexity score from calculateImageComplexity.
 * @returns An object with tuned parameters for the analysis algorithm.
 */
export function getAdaptiveParameters(complexity: number): AnalysisParams {
  // Complexity typically ranges from ~0.02 (very simple) to 0.2+ (very complex)
  if (complexity < 0.06) {
    // Low complexity (e.g., simple cartoon, clean scene)
    return { 
        blurRadius: 1, colorThreshold: 40, minRegionSize: 150, mergeDistance: 25, minDensity: 0.20,
        minAspectRatio: 0.1, maxAspectRatio: 10, maxRegionSizePercent: 0.40, circleRadiusMultiplier: 1.3
    };
  } else if (complexity < 0.15) {
    // Medium complexity (e.g., detailed illustration, busy room)
    return { 
        blurRadius: 2, colorThreshold: 55, minRegionSize: 250, mergeDistance: 35, minDensity: 0.25,
        minAspectRatio: 0.1, maxAspectRatio: 10, maxRegionSizePercent: 0.35, circleRadiusMultiplier: 1.2
    };
  } else {
    // High complexity (e.g., intricate patterns, steampunk, heavy foliage)
    // FIX: Reduced the threshold and region size to be more sensitive to subtle changes in complex images.
    return { 
        blurRadius: 2, colorThreshold: 60, minRegionSize: 300, mergeDistance: 45, minDensity: 0.28,
        minAspectRatio: 0.1, maxAspectRatio: 10, maxRegionSizePercent: 0.30, circleRadiusMultiplier: 1.15
    };
  }
}

/**
 * CORS-safe image loader with proper error handling
 */
function loadImageSafely(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Only set crossOrigin for external URLs, not for data URLs
    if (src.startsWith('http') && !src.startsWith(window.location.origin)) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('Failed to load image:', error);
      reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
    };
    
    img.src = src;
  });
}

/**
 * Safely extracts image data with proper CORS error handling
 */
function safeGetImageData(ctx: CanvasRenderingContext2D, width: number, height: number): ImageData {
  try {
    return ctx.getImageData(0, 0, width, height);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'SecurityError') {
      const corsError = new Error('CORS_TAINTED_CANVAS');
      corsError.message = 'Canvas is tainted by cross-origin data. Cannot extract image data. Use data URLs instead of external image URLs.';
      throw corsError;
    }
    throw error;
  }
}

/**
 * Analyzes two images to find visual differences using a multi-stage mathematical analysis.
 * @param originalSrc - Data URL or external URL for the original image.
 * @param modifiedSrc - Data URL or external URL for the modified image.
 * @param params - The tuning parameters for the analysis algorithm.
 * @returns A promise that resolves to an array of detected differences.
 */
export function analyzeDifferences(
  originalSrc: string,
  modifiedSrc: string,
  params: AnalysisParams
): Promise<Difference[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Load images safely with CORS handling
      const originalImg = await loadImageSafely(originalSrc);
      const modifiedImg = await loadImageSafely(modifiedSrc);
      
      const differences = findDifferences(originalImg, modifiedImg, params);
      resolve(differences);
      
    } catch (error: any) {
      console.error('Difference analysis failed:', error);
      
      // Provide specific error messages based on the type of error
      if (error.message === 'CORS_TAINTED_CANVAS') {
        reject(new Error('Cannot analyze images due to CORS restrictions. Please ensure both images are data URLs or served with proper CORS headers.'));
      } else if (error.message.includes('Failed to load image')) {
        reject(new Error('Failed to load one or both images for analysis. Check that the image URLs are valid and accessible.'));
      } else {
        reject(new Error(`Image analysis failed: ${error.message}`));
      }
    }
  });
}

/**
 * Core difference finding logic with CORS safety.
 */
function findDifferences(
  originalImg: HTMLImageElement,
  modifiedImg: HTMLImageElement,
  params: AnalysisParams
): Difference[] {
  const width = originalImg.naturalWidth;
  const height = originalImg.naturalHeight;

  if (width === 0 || height === 0) {
    throw new Error("Image dimensions are zero, cannot analyze.");
  }
  if (width !== modifiedImg.naturalWidth || height !== modifiedImg.naturalHeight) {
    throw new Error("Image dimensions do not match.");
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");
  
  try {
    // --- Step 1: Pre-processing with adaptive blur (CORS-SAFE) ---
    ctx.filter = `blur(${params.blurRadius}px)`;
    ctx.drawImage(originalImg, 0, 0);
    const originalData = safeGetImageData(ctx, width, height).data;
    
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(modifiedImg, 0, 0);
    const modifiedData = safeGetImageData(ctx, width, height).data;
    ctx.filter = 'none';

    // --- Step 2: Build a binary difference map with adaptive threshold ---
    const diffMap = new Uint8Array(width * height);
    let differencePixelCount = 0;
    
    for (let i = 0; i < originalData.length; i += 4) {
      const r1 = originalData[i], g1 = originalData[i + 1], b1 = originalData[i + 2];
      const r2 = modifiedData[i], g2 = modifiedData[i + 1], b2 = modifiedData[i + 2];
      const distance = Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
      if (distance > params.colorThreshold) {
        diffMap[i / 4] = 1;
        differencePixelCount++;
      }
    }
        
    // Early exit if no differences found
    if (differencePixelCount === 0) {
      return [];
    }
    
    // --- Step 3: Find connected components (regions) using flood fill ---
    const regions = findConnectedComponents(diffMap, width, height);

    // --- Step 4: Filter regions with adaptive parameters ---
    const filteredRegions = regions
      .filter(region => region.size >= params.minRegionSize)
      .filter(region => { // Aspect Ratio Filter
          const regionWidth = region.maxX - region.minX + 1;
          const regionHeight = region.maxY - region.minY + 1;
          if (regionHeight === 0 || regionWidth === 0) return false;
          const aspectRatio = regionWidth / regionHeight;
          return aspectRatio > params.minAspectRatio && aspectRatio < params.maxAspectRatio;
      })
      .filter(region => { // DENSITY & LARGE REGION FILTER
          const boundingArea = (region.maxX - region.minX + 1) * (region.maxY - region.minY + 1);
          if (boundingArea === 0) return false;

          // For very large regions, the density test can be counter-productive.
          const isVeryLarge = region.size > (params.minRegionSize * 10);
          
          const density = region.size / boundingArea;
          return isVeryLarge || (density > params.minDensity);
      });

    // --- Step 5: Merge nearby regions with adaptive distance ---
    const mergedRegions = mergeNearbyRegions(filteredRegions, params.mergeDistance);

    // --- Step 6: Filter out excessively large regions to prevent unplayable circles ---
    const finalRegions = mergedRegions.filter(region => {
        const regionWidth = region.maxX - region.minX;
        const regionHeight = region.maxY - region.minY;
        const imageMinDimension = Math.min(width, height); 
        return (regionWidth / imageMinDimension) < params.maxRegionSizePercent &&
               (regionHeight / imageMinDimension) < params.maxRegionSizePercent;
    });

    // --- Step 7: Convert to Difference objects and filter for overlaps ---
    type Circle = { x: number; y: number; radius: number };

    const allCircles: Circle[] = finalRegions.map((region) => {
      const centerX = (region.minX + region.maxX) / 2;
      const centerY = (region.minY + region.maxY) / 2;
      const radiusX = (region.maxX - region.minX) / 2;
      const radiusY = (region.maxY - region.minY) / 2;
      const radius = Math.max(radiusX, radiusY) * params.circleRadiusMultiplier;
      return { x: centerX, y: centerY, radius };
    });

    const doCirclesOverlap = (circle1: Circle, circle2: Circle): boolean => {
      const dx = circle1.x - circle2.x;
      const dy = circle1.y - circle2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (circle1.radius + circle2.radius);
    };

    const filterOverlappingCircles = (circles: Circle[]): Circle[] => {
      const nonOverlappingCircles: Circle[] = [];
      circles.sort((a, b) => b.radius - a.radius);

      for (const circle of circles) {
        let overlaps = false;
        for (const existingCircle of nonOverlappingCircles) {
          if (doCirclesOverlap(circle, existingCircle)) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          nonOverlappingCircles.push(circle);
        }
      }
      return nonOverlappingCircles;
    };

    const filteredCircles = filterOverlappingCircles(allCircles);
    console.log(`${filteredCircles.length} final differences found.`);

    return filteredCircles.map((circle, index) => {
      return {
        id: index,
        x: circle.x / width,
        y: circle.y / height,
        radius: circle.radius / Math.min(width, height),
        description: '',
      };
    });
    
  } catch (error: any) {
    if (error.message === 'CORS_TAINTED_CANVAS') {
      throw error; // Re-throw CORS errors to be handled by the calling function
    }
    throw new Error(`Failed to process images: ${error.message}`);
  }
}

interface Region {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  size: number;
}

/**
 * Scans a binary difference map and uses a flood-fill algorithm to group
 * connected pixels into regions.
 */
function findConnectedComponents(diffMap: Uint8Array, width: number, height: number): Region[] {
  const visited = new Uint8Array(width * height);
  const regions: Region[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (diffMap[index] === 1 && visited[index] === 0) {
        const region = floodFill(diffMap, visited, width, height, x, y);
        regions.push(region);
      }
    }
  }
  return regions;
}

/**
 * Flood-fill algorithm to find a single connected region of 'different' pixels.
 */
function floodFill(
  diffMap: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number
): Region {
  const stack: [number, number][] = [[startX, startY]];
  const region: Region = {
    minX: startX, maxX: startX,
    minY: startY, maxY: startY,
    size: 0,
  };

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const index = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height || visited[index] === 1 || diffMap[index] === 0) {
      continue;
    }

    visited[index] = 1;
    region.size++;
    region.minX = Math.min(region.minX, x);
    region.maxX = Math.max(region.maxX, x);
    region.minY = Math.min(region.minY, y);
    region.maxY = Math.max(region.maxY, y);

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
    stack.push([x + 1, y + 1]);
    stack.push([x - 1, y - 1]);
    stack.push([x + 1, y - 1]);
    stack.push([x - 1, y + 1]);
  }
  return region;
}

// --- Region Merging Utilities ---

/**
 * Combines two regions into a single bounding region.
 */
function mergeTwoRegions(r1: Region, r2: Region): Region {
    return {
        minX: Math.min(r1.minX, r2.minX),
        maxX: Math.max(r1.maxX, r2.maxX),
        minY: Math.min(r1.minY, r2.minY),
        maxY: Math.max(r1.maxY, r2.maxY),
        size: r1.size + r2.size,
    };
}

/**
 * Checks if two regions are close enough to be merged.
 */
function shouldMerge(region1: Region, region2: Region, maxDistance: number): boolean {
  const dx = Math.max(0, Math.max(region1.minX, region2.minX) - Math.min(region1.maxX, region2.maxX));
  const dy = Math.max(0, Math.max(region1.minY, region2.minY) - Math.min(region1.maxY, region2.maxY));
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < maxDistance;
}

/**
 * Iteratively merges regions in a list that are closer than the specified distance.
 */
function mergeNearbyRegions(regions: Region[], mergeDistance: number): Region[] {
    if (regions.length < 2) {
        return regions;
    }
    
    let wasMergedInPass = true;
    while (wasMergedInPass) {
        wasMergedInPass = false;
        for (let i = 0; i < regions.length; i++) {
            for (let j = i + 1; j < regions.length; j++) {
                if (shouldMerge(regions[i], regions[j], mergeDistance)) {
                    regions[i] = mergeTwoRegions(regions[i], regions[j]);
                    regions.splice(j, 1);
                    j--; 
                    wasMergedInPass = true;
                }
            }
        }
    }
    return regions;
}

/**
 * Utility function to convert external image URL to data URL to avoid CORS issues
 */
export async function convertImageToDataURL(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) {
    return imageUrl; // Already a data URL
  }
  
  try {
    const img = await loadImageSafely(imageUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to convert image to data URL:', error);
    throw new Error(`Could not convert image to data URL: ${error.message}`);
  }
}

/**
 * Safe wrapper function that automatically converts external URLs to data URLs
 */
export async function analyzeDifferencesSafe(
  originalSrc: string,
  modifiedSrc: string,
  params: AnalysisParams
): Promise<Difference[]> {
  try {
    
    // Convert external URLs to data URLs to avoid CORS issues
    const safeOriginalSrc = await convertImageToDataURL(originalSrc);
    const safeModifiedSrc = await convertImageToDataURL(modifiedSrc);
        
    return await analyzeDifferences(safeOriginalSrc, safeModifiedSrc, params);
    
  } catch (error: any) {
    console.error('Safe difference analysis failed:', error);
    throw new Error(`Could not analyze image differences: ${error.message}`);
  }
}