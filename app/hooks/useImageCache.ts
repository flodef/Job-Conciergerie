import { useEffect, useRef, useState } from 'react';

// Global image cache storing blob URLs to prevent refetching
const imageBlobCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string>>();

export function useImageCache(urls: string[]) {
  const preloadedRef = useRef(false);
  const [cachedUrls, setCachedUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (preloadedRef.current || urls.length === 0) return;
    preloadedRef.current = true;

    // Preload all images and create blob URLs
    const loadPromises = urls.map(url => {
      const cached = imageBlobCache.get(url);
      if (cached) return Promise.resolve(cached);

      const loading = loadingPromises.get(url);
      if (loading) return loading;

      const promise = fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          imageBlobCache.set(url, blobUrl);
          loadingPromises.delete(url);
          return blobUrl;
        })
        .catch(() => {
          loadingPromises.delete(url);
          return url; // Fallback to original URL on error
        });

      loadingPromises.set(url, promise);
      return promise;
    });

    Promise.all(loadPromises).then(blobUrls => {
      const newMap = new Map<string, string>();
      urls.forEach((url, index) => {
        newMap.set(url, blobUrls[index]);
      });
      setCachedUrls(newMap);
    });
  }, [urls]);

  return {
    getCachedUrl: (url: string) => cachedUrls.get(url) || imageBlobCache.get(url) || url,
    isCached: (url: string) => imageBlobCache.has(url),
  };
}

// Preload images without using the hook (for provider-level caching)
export function preloadImages(urls: string[]) {
  urls.forEach(url => {
    if (imageBlobCache.has(url) || loadingPromises.has(url)) return;

    const promise = fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        imageBlobCache.set(url, blobUrl);
        loadingPromises.delete(url);
        return blobUrl;
      })
      .catch(() => {
        loadingPromises.delete(url);
        return url;
      });

    loadingPromises.set(url, promise);
  });
}
