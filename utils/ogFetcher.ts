// In-memory cache for the fastest access within a single session lifecycle.
const imageCache = new Map<string, string | null>();
const PROXY_URL = 'https://api.codetabs.com/v1/proxy?quest=';
const SESSION_STORAGE_KEY_PREFIX = 'ogImage_';
const DEFAULT_IG_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png';


/**
 * A simple utility to decode common HTML entities in the URL.
 */
function decodeHTMLEntities(text: string): string {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}

/**
 * Fetches the Open Graph image URL from a given permalink.
 * Implements a specific 3-step fallback for Instagram URLs.
 * For other URLs, it fetches the page via a CORS proxy and parses the HTML.
 * Implements a two-layer cache (in-memory and sessionStorage) for performance.
 * @param permalink The URL of the post to fetch the OG image from.
 * @param forceRefetch If true, bypasses and clears the cache for this specific permalink.
 * @returns The URL of the OG image, or null if not found or an error occurs.
 */
export const fetchOgImage = async (permalink: string, forceRefetch: boolean = false): Promise<string | null> => {
    if (!permalink || !permalink.startsWith('http')) {
        return null;
    }

    const storageKey = `${SESSION_STORAGE_KEY_PREFIX}${permalink}`;

    if (forceRefetch) {
        imageCache.delete(permalink);
        try {
            sessionStorage.removeItem(storageKey);
        } catch (error) {
            console.warn('Failed to remove from sessionStorage cache', error);
        }
    }

    // 1. Check in-memory cache
    if (imageCache.has(permalink)) {
        return imageCache.get(permalink) || null;
    }

    // 2. Check session storage cache
    try {
        const cachedValue = sessionStorage.getItem(storageKey);
        if (cachedValue) {
            const imageUrl = JSON.parse(cachedValue);
            imageCache.set(permalink, imageUrl); // Populate in-memory cache
            return imageUrl;
        }
    } catch (error) {
        console.warn('Failed to read from sessionStorage cache', error);
    }
    
    let imageUrl: string | null = null;
    
    const isInstagram = permalink.includes('instagram.com/p/') || permalink.includes('instagram.com/reel/');

    if (isInstagram) {
        // --- Instagram 3-Step Logic ---
        
        // STEP 1: Parse og:image from HTML
        try {
            const response = await fetch(`${PROXY_URL}${encodeURIComponent(permalink)}`);
            if (response.ok) {
                const html = await response.text();
                const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
                if (ogImageMatch && ogImageMatch[1]) {
                    imageUrl = decodeHTMLEntities(ogImageMatch[1]);
                }
            }
        } catch (error) {
            console.warn(`[OG Fetcher] Step 1 (HTML parse) failed for ${permalink}:`, error);
        }

        // STEP 2: Try /media link if Step 1 failed
        if (!imageUrl) {
            try {
                const postUrl = permalink.replace('/reel/', '/p/'); // Normalize reel links
                const mediaUrl = postUrl.replace(/\/$/, '') + '/media?size=m';
                const proxiedMediaUrl = `${PROXY_URL}${encodeURIComponent(mediaUrl)}`;
                
                // We fetch just to validate that it's a real image before returning the URL
                const mediaResponse = await fetch(proxiedMediaUrl);
                
                if (mediaResponse.ok) {
                    const contentType = mediaResponse.headers.get('Content-Type');
                    if (contentType && contentType.startsWith('image/')) {
                        // The URL is valid and returns an image.
                        // We return the *proxied* URL for the <img> tag to use, which avoids CORS issues.
                        imageUrl = proxiedMediaUrl;
                    }
                }
            } catch (error) {
                console.warn(`[OG Fetcher] Step 2 (/media link) failed for ${permalink}:`, error);
            }
        }

        // STEP 3: Fallback to default image if Steps 1 & 2 failed
        if (!imageUrl) {
            imageUrl = DEFAULT_IG_IMAGE;
        }
    } else {
        // --- Fallback to generic fetch for other URLs ---
        try {
            const response = await fetch(`${PROXY_URL}${encodeURIComponent(permalink)}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch with status: ${response.status}`);
            }
            const html = await response.text();
            
            // First, try to find a smaller thumbnail from JSON-LD structured data.
            const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]+?)<\/script>/i);
            if (jsonLdMatch && jsonLdMatch[1]) {
                try {
                    const jsonLd = JSON.parse(jsonLdMatch[1]);
                    const dataArray = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
                    for (const item of dataArray) {
                        if (item.thumbnailUrl && typeof item.thumbnailUrl === 'string') {
                            imageUrl = item.thumbnailUrl;
                            break;
                        }
                        if (item.image && typeof item.image === 'string') {
                            imageUrl = item.image;
                            break;
                        }
                        if (item.image && item.image.url && typeof item.image.url === 'string') {
                            imageUrl = item.image.url;
                            break;
                        }
                    }
                } catch (e) {
                    console.warn('Could not parse JSON-LD for thumbnail', e);
                }
            }
            
            // Fallback to meta tags if JSON-LD fails or doesn't provide a valid image URL.
            if (!imageUrl) {
                const ogImageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
                if (ogImageMatch && ogImageMatch[1]) {
                    imageUrl = decodeHTMLEntities(ogImageMatch[1]);
                } else {
                    // Fallback to twitter:image if og:image is not found
                    const twitterImageMatch = html.match(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/i);
                    if (twitterImageMatch && twitterImageMatch[1]) {
                        imageUrl = decodeHTMLEntities(twitterImageMatch[1]);
                    }
                }
            }
            
        } catch (error) {
            console.error(`Error fetching OG image for ${permalink}:`, error);
            imageUrl = null;
        }
    }
    
    // Store result in both caches
    imageCache.set(permalink, imageUrl);
    try {
        sessionStorage.setItem(storageKey, JSON.stringify(imageUrl));
    } catch (error) {
        console.warn('Failed to write to sessionStorage cache', error);
    }

    return imageUrl;
};
