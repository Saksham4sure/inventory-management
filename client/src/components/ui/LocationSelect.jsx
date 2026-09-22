import { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, RotateCcw } from 'lucide-react';
import { Select } from './Select';
import { Input } from './Input';
import {
  getProvinces,
  getDistricts,
  getMunicipalities,
  getWards,
  formatLocationAddress,
  parseLocationAddress,
} from '../../utils/nepalLocations';

/**
 * Cascading Dropdown Location Selector for Nepal
 * Province -> District -> Municipality -> Ward -> [Street/Area (Business Setup only)]
 */
export const LocationSelect = ({
  label = 'Location',
  id = 'location',
  name = 'address',
  value = '',
  onChange,
  isBusinessSetup = false,
  showStreetInput,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  hidePreview = false,
}) => {
  // Whether to show the Street / Area input after the ward dropdown
  const shouldShowStreet = showStreetInput !== undefined ? Boolean(showStreetInput) : Boolean(isBusinessSetup);

  // Parse initial or passed value safely
  const parseIncomingValue = (val) => {
    if (!val) {
      return { province: '', district: '', municipality: '', ward: '', street: '' };
    }
    // Handle synthetic event object (e.g. if parent passes event directly: e or { target: ... })
    if (typeof val === 'object' && val.target) {
      const t = val.target;
      if (t.province !== undefined || t.district !== undefined) {
        return {
          province: t.province ? String(t.province).trim() : '',
          district: t.district ? String(t.district).trim() : '',
          municipality: t.municipality ? String(t.municipality).trim() : '',
          ward: t.ward ? String(t.ward).trim() : '',
          street: t.street ? String(t.street).trim() : '',
        };
      }
      if (typeof t.value === 'string') {
        return parseLocationAddress(t.value);
      }
    }
    // Handle structured location object
    if (typeof val === 'object') {
      if (val.province || val.district || val.municipality || val.ward) {
        return {
          province: val.province ? String(val.province).trim() : '',
          district: val.district ? String(val.district).trim() : '',
          municipality: val.municipality ? String(val.municipality).trim() : '',
          ward: val.ward ? String(val.ward).trim() : '',
          street: val.street ? String(val.street).trim() : '',
        };
      }
      if (val.formattedAddress && typeof val.formattedAddress === 'string') {
        return parseLocationAddress(val.formattedAddress);
      }
      return { province: '', district: '', municipality: '', ward: '', street: '' };
    }
    // Handle string
    return parseLocationAddress(String(val));
  };

  const [state, setState] = useState(() => parseIncomingValue(value));
  const lastEmittedValueRef = useRef('');

  // Synchronize internal state when external `value` changes
  useEffect(() => {
    const parsed = parseIncomingValue(value);
    const stringVal = formatLocationAddress(parsed);
    const currentFormatted = formatLocationAddress(state);

    // Only update internal state if external value represents a DIFFERENT location
    // from our current internal state AND is not the value we just emitted
    if (stringVal !== currentFormatted && stringVal !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = stringVal;
      setState(parsed);
    }
  }, [value]);

  // Available options
  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(() => getDistricts(state.province), [state.province]);
  const municipalities = useMemo(
    () => getMunicipalities(state.province, state.district),
    [state.province, state.district]
  );
  const wards = useMemo(
    () => getWards(state.province, state.district, state.municipality),
    [state.province, state.district, state.municipality]
  );

  // Formatted address for display and event emissions
  const formattedAddress = useMemo(() => {
    return formatLocationAddress({
      province: state.province,
      district: state.district,
      municipality: state.municipality,
      ward: state.ward,
      street: shouldShowStreet ? state.street : '',
    });
  }, [state, shouldShowStreet]);

  // Emit change to parent
  const triggerChange = (newState) => {
    const formatted = formatLocationAddress({
      province: newState.province,
      district: newState.district,
      municipality: newState.municipality,
      ward: newState.ward,
      street: shouldShowStreet ? newState.street : '',
    });

    lastEmittedValueRef.current = formatted;

    if (onChange) {
      const syntheticEvent = {
        target: {
          name,
          id,
          value: formatted,
          province: newState.province,
          district: newState.district,
          municipality: newState.municipality,
          ward: newState.ward,
          street: newState.street,
        },
        value: formatted,
        formattedAddress: formatted,
        province: newState.province,
        district: newState.district,
        municipality: newState.municipality,
        ward: newState.ward,
        street: newState.street,
      };
      onChange(syntheticEvent, formatted, newState);
    }
  };

  const extractValue = (eOrVal) => {
    if (eOrVal && typeof eOrVal === 'object' && eOrVal.target) {
      return eOrVal.target.value ?? '';
    }
    if (typeof eOrVal === 'string' || typeof eOrVal === 'number') {
      return String(eOrVal);
    }
    return '';
  };

  // Handlers for cascading dropdown changes
  const handleProvinceChange = (eOrVal) => {
    const newProvince = extractValue(eOrVal).trim();
    const nextState = {
      province: newProvince,
      district: '',
      municipality: '',
      ward: '',
      street: state.street,
    };
    setState(nextState);
    triggerChange(nextState);
  };

  const handleDistrictChange = (eOrVal) => {
    const newDistrict = extractValue(eOrVal).trim();
    const nextState = {
      ...state,
      district: newDistrict,
      municipality: '',
      ward: '',
    };
    setState(nextState);
    triggerChange(nextState);
  };

  const handleMunicipalityChange = (eOrVal) => {
    const newMunicipality = extractValue(eOrVal).trim();
    const nextState = {
      ...state,
      municipality: newMunicipality,
      ward: '',
    };
    setState(nextState);
    triggerChange(nextState);
  };

  const handleWardChange = (eOrVal) => {
    const newWard = extractValue(eOrVal).trim();
    const nextState = {
      ...state,
      ward: newWard,
    };
    setState(nextState);
    triggerChange(nextState);
  };

  const handleStreetChange = (eOrVal) => {
    const newStreet = extractValue(eOrVal);
    const nextState = {
      ...state,
      street: newStreet,
    };
    setState(nextState);
    triggerChange(nextState);
  };

  const handleClear = () => {
    const emptyState = {
      province: '',
      district: '',
      municipality: '',
      ward: '',
      street: '',
    };
    setState(emptyState);
    triggerChange(emptyState);
  };

  const hasAnySelection = Boolean(
    state.province || state.district || state.municipality || state.ward || state.street
  );

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Header with Title and Clear Action */}
      <div className="flex items-center justify-between">
        {label && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
              {label} {required && <span className="text-zinc-400 dark:text-zinc-500">*</span>}
            </label>
          </div>
        )}

        {hasAnySelection && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Cascading Dropdowns: Province & District */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
        <Select
          label="Province"
          id={`${id}-province`}
          name="province"
          value={state.province}
          onChange={handleProvinceChange}
          options={provinces.map((p) => ({ value: p, label: p }))}
          placeholder="Select Province"
          disabled={disabled}
        />

        <Select
          label="District"
          id={`${id}-district`}
          name="district"
          value={state.district}
          onChange={handleDistrictChange}
          options={districts.map((d) => ({ value: d, label: d }))}
          placeholder={state.province ? 'Select District' : 'Select Province first'}
          disabled={disabled || !state.province}
          searchable
        />
      </div>

      {/* Cascading Dropdowns: Municipality & Ward */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
        <Select
          label="Municipality / Local Level"
          id={`${id}-municipality`}
          name="municipality"
          value={state.municipality}
          onChange={handleMunicipalityChange}
          options={municipalities.map((m) => ({ value: m, label: m }))}
          placeholder={state.district ? 'Select Municipality' : 'Select District first'}
          disabled={disabled || !state.district}
          searchable
        />

        <Select
          label="Ward"
          id={`${id}-ward`}
          name="ward"
          value={state.ward}
          onChange={handleWardChange}
          options={wards.map((w) => ({ value: String(w), label: `Ward ${w}` }))}
          placeholder={state.municipality ? 'Select Ward' : 'Select Municipality first'}
          disabled={disabled || !state.municipality}
          searchable={wards.length > 7}
        />
      </div>

      {/* Street or Area Input: Rendered after Ward dropdown for business setup only */}
      {shouldShowStreet && (
        <div className="pt-0.5">
          <Input
            label="Street / Tole / Area"
            id={`${id}-street`}
            name="street"
            type="text"
            placeholder="e.g. New Road, Baluwatar, Main Chowk, Building No."
            value={state.street}
            onChange={(e) => handleStreetChange(e.target.value)}
            disabled={disabled}
            helperText="Specific street, tole, or landmark for your business location"
          />
        </div>
      )}

      {/* Clean Selected Location Summary Card */}
      {!hidePreview && formattedAddress && (
        <div className="flex items-start gap-2.5 rounded-xl bg-black/[0.025] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.07] px-3.5 py-2.5 text-xs text-zinc-700 dark:text-zinc-300">
          <MapPin className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">
              Configured Location
            </div>
            <div className="font-medium text-zinc-800 dark:text-zinc-200 break-words leading-relaxed">
              {formattedAddress}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-0.5">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-0.5">{helperText}</p>
      )}
    </div>
  );
};

export default LocationSelect;
