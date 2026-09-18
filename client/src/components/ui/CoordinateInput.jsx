import { useState, useEffect } from 'react';
import {
  MapPin,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
} from 'lucide-react';
import { Input } from './Input';
import {
  parseMapCoordinates,
  isGoogleMapsShortLink,
  isValidCoordinates,
} from '../../utils/mapCoordinates';
import { businessService } from '../../services/businessService';

export const CoordinateInput = ({
  coordinates = { latitude: null, longitude: null },
  googleMapsUrl = '',
  onChange,
  disabled = false,
  label = 'GPS Coordinates / Google Maps Location',
  helperText = 'Optional. Paste any Google Maps share link, place URL, or coordinates to auto-extract GPS coordinates.',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState(googleMapsUrl || '');
  const [lat, setLat] = useState(
    coordinates?.latitude !== null && coordinates?.latitude !== undefined
      ? String(coordinates.latitude)
      : ''
  );
  const [lng, setLng] = useState(
    coordinates?.longitude !== null && coordinates?.longitude !== undefined
      ? String(coordinates.longitude)
      : ''
  );
  const [resolving, setResolving] = useState(false);
  const [filterSuccess, setFilterSuccess] = useState('');
  const [filterError, setFilterError] = useState('');

  // Sync when external coordinates change
  useEffect(() => {
    if (coordinates?.latitude !== null && coordinates?.latitude !== undefined) {
      setLat(String(coordinates.latitude));
    } else {
      setLat('');
    }
    if (coordinates?.longitude !== null && coordinates?.longitude !== undefined) {
      setLng(String(coordinates.longitude));
    } else {
      setLng('');
    }
  }, [coordinates?.latitude, coordinates?.longitude]);

  useEffect(() => {
    if (googleMapsUrl && !inputValue) {
      setInputValue(googleMapsUrl);
    }
  }, [googleMapsUrl]);

  // Main filter function
  const handleInputChange = async (e) => {
    const rawVal = e.target.value;
    setInputValue(rawVal);
    setFilterError('');
    setFilterSuccess('');

    if (!rawVal.trim()) {
      handleClear();
      return;
    }

    // 1. Try immediate client-side parsing of coordinates or standard Google Maps URL
    const immediate = parseMapCoordinates(rawVal);
    if (immediate) {
      const parsedLat = immediate.latitude;
      const parsedLng = immediate.longitude;
      setLat(String(parsedLat));
      setLng(String(parsedLng));
      setFilterSuccess(`Extracted: Lat ${parsedLat}, Lng ${parsedLng}`);

      if (onChange) {
        onChange({
          coordinates: { latitude: parsedLat, longitude: parsedLng },
          googleMapsUrl: immediate.googleMapsUrl || rawVal.trim(),
        });
      }
      return;
    }

    // 2. If it is a short link (e.g. maps.app.goo.gl), resolve via backend
    if (isGoogleMapsShortLink(rawVal)) {
      try {
        setResolving(true);
        const resolved = await businessService.resolveMapLink(rawVal.trim());
        if (resolved && resolved.latitude && resolved.longitude) {
          setLat(String(resolved.latitude));
          setLng(String(resolved.longitude));
          setFilterSuccess(`Extracted from short link: Lat ${resolved.latitude}, Lng ${resolved.longitude}`);

          if (onChange) {
            onChange({
              coordinates: { latitude: resolved.latitude, longitude: resolved.longitude },
              googleMapsUrl: resolved.googleMapsUrl || rawVal.trim(),
            });
          }
        } else {
          setFilterError('Could not extract coordinates from Google Maps short link.');
        }
      } catch (err) {
        setFilterError(err.message || 'Failed to resolve Google Maps link.');
      } finally {
        setResolving(false);
      }
      return;
    }

    // If neither matched, but looks like a link or text that didn't have valid coordinates
    if (rawVal.length > 15) {
      setFilterError('Could not find valid coordinates in the entered text or link.');
    }
  };

  // Direct manual coordinate changes
  const handleManualCoordChange = (newLatStr, newLngStr) => {
    setLat(newLatStr);
    setLng(newLngStr);
    setFilterError('');

    const parsedLat = parseFloat(newLatStr);
    const parsedLng = parseFloat(newLngStr);

    if (isValidCoordinates(parsedLat, parsedLng)) {
      setFilterSuccess(`Valid coordinates: ${parsedLat}, ${parsedLng}`);
      if (onChange) {
        onChange({
          coordinates: { latitude: parsedLat, longitude: parsedLng },
          googleMapsUrl: `https://www.google.com/maps?q=${parsedLat},${parsedLng}`,
        });
      }
    } else {
      setFilterSuccess('');
      if (!newLatStr && !newLngStr) {
        if (onChange) {
          onChange({
            coordinates: { latitude: null, longitude: null },
            googleMapsUrl: '',
          });
        }
      }
    }
  };

  const handleClear = () => {
    setInputValue('');
    setLat('');
    setLng('');
    setFilterError('');
    setFilterSuccess('');
    if (onChange) {
      onChange({
        coordinates: { latitude: null, longitude: null },
        googleMapsUrl: '',
      });
    }
  };

  const parsedLatNum = parseFloat(lat);
  const parsedLngNum = parseFloat(lng);
  const hasValidCoordinates = isValidCoordinates(parsedLatNum, parsedLngNum);
  const mapsPreviewUrl = hasValidCoordinates
    ? `https://www.google.com/maps?q=${parsedLatNum},${parsedLngNum}`
    : '';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            {label}
          </label>
        </div>

        {(inputValue || hasValidCoordinates) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Coordinates</span>
          </button>
        )}
      </div>

      {/* Main Paste & Filter Input */}
      <div className="relative">
        <Input
          id="google-maps-url"
          type="text"
          placeholder="Paste Google Maps link or coordinates (e.g. https://maps.app.goo.gl/... or 27.7172, 85.3240)"
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled || resolving}
          helperText={helperText}
        />

        {resolving && (
          <div className="absolute right-3 top-7 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Filtering link...</span>
          </div>
        )}
      </div>

      {/* Filter Feedback Alerts */}
      {filterSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">{filterSuccess}</span>
        </div>
      )}

      {filterError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{filterError}</span>
        </div>
      )}

      {/* Numerical Coordinate Inputs (Editable & Auto-populated) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <Input
            label="Latitude"
            id="coord-lat"
            type="number"
            step="any"
            placeholder="e.g. 27.717245"
            value={lat}
            onChange={(e) => handleManualCoordChange(e.target.value, lng)}
            disabled={disabled}
            helperText="-90.0 to +90.0"
          />
        </div>

        <div>
          <Input
            label="Longitude"
            id="coord-lng"
            type="number"
            step="any"
            placeholder="e.g. 85.323958"
            value={lng}
            onChange={(e) => handleManualCoordChange(lat, e.target.value)}
            disabled={disabled}
            helperText="-180.0 to +180.0"
          />
        </div>
      </div>

      {/* Filtered Coordinate Preview Card */}
      {hasValidCoordinates && (
        <div className="flex items-center justify-between rounded-xl bg-black/[0.025] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.07] px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Filtered GPS Coordinates
              </div>
              <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                {parsedLatNum.toFixed(6)}, {parsedLngNum.toFixed(6)}
              </div>
            </div>
          </div>

          <a
            href={mapsPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <span>Open in Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
};

export default CoordinateInput;
