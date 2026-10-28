import React from 'react';
import { Cartridge } from '../types/wherigo';
import { MapPin, Navigation } from 'lucide-react';

interface CartridgeSettingsProps {
  cartridge: Cartridge;
  onChange: (updated: Partial<Cartridge>) => void;
}

export const CartridgeSettings: React.FC<CartridgeSettingsProps> = ({ cartridge, onChange }) => {
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange({
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6)),
            altitude: pos.coords.altitude ? parseFloat(pos.coords.altitude.toFixed(1)) : 0,
          });
        },
        (err) => {
          console.warn('Could not retrieve current location:', err.message);
        }
      );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Cartridge Template Settings</h2>
          <p className="text-xs text-slate-500">Configure global metadata and starting GPS coordinates</p>
        </div>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
          title="Use current browser GPS location"
        >
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          <span>Use My GPS</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: General Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cartridge Name</label>
            <input
              type="text"
              value={cartridge.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g. Ancient Ruins Adventure"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Author</label>
              <input
                type="text"
                value={cartridge.author}
                onChange={(e) => onChange({ author: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Author Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
              <input
                type="text"
                value={cartridge.version}
                onChange={(e) => onChange({ version: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="1.0"
              />
            </div>
          </div>
        </div>

        {/* Right Column: GPS Coordinates */}
        <div className="space-y-3">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Starting Location Coordinates</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={cartridge.latitude}
                onChange={(e) => onChange({ latitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={cartridge.longitude}
                onChange={(e) => onChange({ longitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Altitude (m)</label>
              <input
                type="number"
                step="0.1"
                value={cartridge.altitude}
                onChange={(e) => onChange({ altitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
        <textarea
          rows={2}
          value={cartridge.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          placeholder="Brief description of the cartridge, story, or geocaching instructions..."
        />
      </div>
    </div>
  );
};
