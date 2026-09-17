import localsRaw from '../data/locals.txt?raw';

let cachedData = null;

/**
 * Loads and caches clean Nepal location hierarchy from locals.txt.
 * Hierarchy: Province -> District -> Municipality/Local Level -> Wards[]
 */
const getLocationData = () => {
  if (cachedData) return cachedData;

  try {
    const raw = typeof localsRaw === 'string' ? localsRaw : '';
    const parsed = JSON.parse(raw);
    const cleaned = {};

    for (const [provKey, dists] of Object.entries(parsed)) {
      const p = provKey.trim();
      if (!p) continue;
      cleaned[p] = {};

      for (const [distKey, munis] of Object.entries(dists || {})) {
        const d = distKey.trim();
        if (!d) continue;
        cleaned[p][d] = {};

        for (const [muniKey, wards] of Object.entries(munis || {})) {
          const m = muniKey.trim();
          if (!m) continue;

          const wardList = Array.isArray(wards)
            ? Array.from(new Set(wards.map((w) => String(w).trim()).filter(Boolean))).sort(
                (a, b) => Number(a) - Number(b)
              )
            : [];

          cleaned[p][d][m] = wardList;
        }
      }
    }

    cachedData = cleaned;
  } catch (err) {
    console.error('Failed to load locals.txt:', err);
    cachedData = {};
  }

  return cachedData;
};

/**
 * Get all available provinces
 */
const getProvinces = () => {
  const data = getLocationData();
  return Object.keys(data);
};

/**
 * Get sorted districts under a given province
 */
const getDistricts = (province) => {
  if (!province) return [];
  const data = getLocationData();
  const distObj = data[province.trim()] || {};
  return Object.keys(distObj).sort((a, b) => a.localeCompare(b));
};

/**
 * Get sorted municipalities under a given province & district
 */
const getMunicipalities = (province, district) => {
  if (!province || !district) return [];
  const data = getLocationData();
  const muniObj = data[province.trim()]?.[district.trim()] || {};
  return Object.keys(muniObj).sort((a, b) => a.localeCompare(b));
};

/**
 * Get sorted wards under a given province, district, and municipality
 */
const getWards = (province, district, municipality) => {
  if (!province || !district || !municipality) return [];
  const data = getLocationData();
  const wards = data[province.trim()]?.[district.trim()]?.[municipality.trim()] || [];
  return wards;
};

/**
 * Formats structured location into a clean, human-readable address string.
 * Example: "New Road, Ward 22, Kathmandu Metropolitan City, Kathmandu, Bagmati Province"
 */
const formatLocationAddress = ({ province = '', district = '', municipality = '', ward = '', street = '' }) => {
  const parts = [];

  const cleanStreet = street ? street.trim() : '';
  const cleanWard = ward ? String(ward).trim() : '';
  const cleanMuni = municipality ? municipality.trim() : '';
  const cleanDistrict = district ? district.trim() : '';
  const cleanProvince = province ? province.trim() : '';

  if (cleanStreet) {
    parts.push(cleanStreet);
  }

  if (cleanWard) {
    const wardLabel = cleanWard.toLowerCase().startsWith('ward') ? cleanWard : `Ward ${cleanWard}`;
    parts.push(wardLabel);
  }

  if (cleanMuni) {
    parts.push(cleanMuni);
  }

  if (cleanDistrict) {
    parts.push(cleanDistrict);
  }

  if (cleanProvince) {
    parts.push(cleanProvince);
  }

  return parts.join(', ');
};

/**
 * Parses an existing address string into components { province, district, municipality, ward, street }
 */
const parseLocationAddress = (addressStr) => {
  const result = {
    province: '',
    district: '',
    municipality: '',
    ward: '',
    street: '',
  };

  if (!addressStr || typeof addressStr !== 'string') {
    return result;
  }

  const data = getLocationData();
  const provinces = Object.keys(data);
  const rawParts = addressStr.split(',').map((s) => s.trim()).filter(Boolean);

  if (rawParts.length === 0) {
    return result;
  }

  const parts = [...rawParts];

  // 1. Identify Province (searching from the end backwards)
  for (let i = parts.length - 1; i >= 0; i--) {
    const partLower = parts[i].toLowerCase();
    const matchedProv = provinces.find((p) => p.toLowerCase() === partLower);
    if (matchedProv) {
      result.province = matchedProv;
      parts.splice(i, 1);
      break;
    }
  }

  // 2. Identify District
  if (result.province && data[result.province]) {
    const distList = Object.keys(data[result.province]);
    for (let i = parts.length - 1; i >= 0; i--) {
      const partLower = parts[i].toLowerCase();
      const matchedDist = distList.find((d) => d.toLowerCase() === partLower);
      if (matchedDist) {
        result.district = matchedDist;
        parts.splice(i, 1);
        break;
      }
    }
  } else {
    // Search across all districts if province wasn't explicitly matched
    outerLoop: for (const [p, dists] of Object.entries(data)) {
      for (const d of Object.keys(dists)) {
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i].toLowerCase() === d.toLowerCase()) {
            result.province = p;
            result.district = d;
            parts.splice(i, 1);
            break outerLoop;
          }
        }
      }
    }
  }

  // 3. Identify Municipality
  if (result.province && result.district && data[result.province]?.[result.district]) {
    const muniList = Object.keys(data[result.province][result.district]);
    for (let i = parts.length - 1; i >= 0; i--) {
      const partLower = parts[i].toLowerCase();
      const matchedMuni = muniList.find((m) => m.toLowerCase() === partLower);
      if (matchedMuni) {
        result.municipality = matchedMuni;
        parts.splice(i, 1);
        break;
      }
    }
  }

  // 4. Identify Ward
  for (let i = parts.length - 1; i >= 0; i--) {
    const wardMatch = parts[i].match(/(?:ward\s*[-:#]?\s*)?(\d+)/i);
    if (wardMatch && parts[i].toLowerCase().includes('ward')) {
      result.ward = wardMatch[1];
      parts.splice(i, 1);
      break;
    }
  }

  // 5. Remaining parts are the street / area
  result.street = parts.join(', ');

  return result;
};

export {
  getLocationData,
  getProvinces,
  getDistricts,
  getMunicipalities,
  getWards,
  formatLocationAddress,
  parseLocationAddress,
};
