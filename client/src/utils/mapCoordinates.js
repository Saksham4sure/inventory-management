/**
 * Client utility to parse and filter GPS coordinates from Google Maps URLs or direct inputs
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

  // 1. Direct coordinates format: "27.717245, 85.323958" or "27.717245,85.323958"
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

  // 2. Google Maps URL with @lat,lng e.g. /@27.7172453,85.3239587,17z
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

export const isGoogleMapsShortLink = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url.trim());
};
