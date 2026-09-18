/**
 * Utility to parse and filter GPS coordinates from Google Maps URLs or direct inputs
 */

export const isValidCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const parseMapCoordinates = (input) => {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();
  if (!str) return null;

  // 1. Direct coordinates format: "27.717245, 85.323958" or "27.717245,85.323958" or "27.717245 85.323958"
  const directMatch = str.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        formatted: `${parseFloat(lat.toFixed(6))}, ${parseFloat(lng.toFixed(6))}`,
        googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      };
    }
  }

  // 2. Google Maps URL with @lat,lng format e.g. /@27.7172453,85.3239587,17z
  const atMatch = str.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        formatted: `${parseFloat(lat.toFixed(6))}, ${parseFloat(lng.toFixed(6))}`,
        googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      };
    }
  }

  // 3. Query params: ?q=lat,lng or query=lat,lng or ll=lat,lng or destination=lat,lng or center=lat,lng
  const queryMatch = str.match(
    /(?:[?&](?:q|query|ll|destination|center)=(-?\d{1,2}\.\d+)(?:%2C|,|\+)(-?\d{1,3}\.\d+))/i
  );
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        formatted: `${parseFloat(lat.toFixed(6))}, ${parseFloat(lng.toFixed(6))}`,
        googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      };
    }
  }

  // 4. Data param !3d27.7172453!4d85.3239587
  const dataMatch = str.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        formatted: `${parseFloat(lat.toFixed(6))}, ${parseFloat(lng.toFixed(6))}`,
        googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      };
    }
  }

  // 5. Embedded in URL or text: lat.xxxx, lng.xxxx
  const anyMatch = str.match(/(-?\d{1,2}\.\d{4,})[,\s]+(-?\d{1,3}\.\d{4,})/);
  if (anyMatch) {
    const lat = parseFloat(anyMatch[1]);
    const lng = parseFloat(anyMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        formatted: `${parseFloat(lat.toFixed(6))}, ${parseFloat(lng.toFixed(6))}`,
        googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      };
    }
  }

  return null;
};

/**
 * Resolves short links (e.g. maps.app.goo.gl or goo.gl/maps) by following HTTP redirects
 */
export const resolveGoogleMapsUrl = async (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Try direct parse first
  const immediate = parseMapCoordinates(trimmed);
  if (immediate) return immediate;

  // If it's a URL, follow redirects
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const response = await fetch(trimmed, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const finalUrl = response.url || '';
      const parsedFromFinal = parseMapCoordinates(finalUrl);
      if (parsedFromFinal) {
        return {
          ...parsedFromFinal,
          resolvedUrl: finalUrl,
        };
      }

      // Also check response text/HTML if final URL didn't contain coordinates in path
      const html = await response.text();
      const parsedFromHtml = parseMapCoordinates(html);
      if (parsedFromHtml) {
        return {
          ...parsedFromHtml,
          resolvedUrl: finalUrl,
        };
      }
    } catch {
      // Fallback
    }
  }

  return null;
};
