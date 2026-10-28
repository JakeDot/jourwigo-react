import React, { useRef } from 'react';
import { Cartridge } from '../types/wherigo';
import { Play, Download, Code, Plus, X, Upload } from 'lucide-react';
import { parseCartridgeFile } from '../services/compiler';

interface HeaderProps {
  cartridges: Cartridge[];
  activeCartridgeId: string;
  onSelectCartridge: (id: string) => void;
  onAddCartridge: () => void;
  onCloseCartridge: (id: string) => void;
  activeView: 'EDITOR' | 'PLAYER' | 'DIALOG_BUILDER';
  setActiveView: (view: 'EDITOR' | 'PLAYER' | 'DIALOG_BUILDER') => void;
  onCompileGwc: () => void;
  onExportLua: () => void;
  onImportCartridge: (cart: Partial<Cartridge>) => void;
  cheerpjStatus?: string;
  cheerpjMessage?: string;
}

export const Header: React.FC<HeaderProps> = ({
  cartridges,
  activeCartridgeId,
  onSelectCartridge,
  onAddCartridge,
  onCloseCartridge,
  activeView,
  setActiveView,
  onCompileGwc,
  onExportLua,
  onImportCartridge,
  cheerpjStatus = 'READY',
  cheerpjMessage = 'CheerpJ JVM Ready (Serverless)',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const parsed = await parseCartridgeFile(file);
        onImportCartridge(parsed);
      } catch (err) {
        console.warn('Failed to parse cartridge file:', err);
      }
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-xs">
            JW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 leading-tight">jourwigo</h1>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full border transition-all ${
                  cheerpjStatus === 'READY'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : cheerpjStatus === 'INITIALIZING'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}
                title={cheerpjMessage}
              >
                ☕ {cheerpjMessage}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              WebAssembly Wherigo Editor (CheerpJ JVM + React) &bull; Urwigo-style Cartridge Compiler
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveView('EDITOR')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === 'EDITOR'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cartridge Editor
            </button>
            <button
              onClick={() => setActiveView('DIALOG_BUILDER')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === 'DIALOG_BUILDER'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dialogue Tree
            </button>
            <button
              onClick={() => setActiveView('PLAYER')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                activeView === 'PLAYER'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Cartridge (GPS)
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import .lua or .gwc cartridge"
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".lua,.gwc"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={onExportLua}
            title="Download cartridge Lua template"
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1.5 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            Export Lua
          </button>

          <button
            onClick={onCompileGwc}
            title="Compile into binary Wherigo cartridge file"
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Compile .gwc
          </button>
        </div>
      </div>

      {/* Cartridge Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1">
        {cartridges.map((cart) => {
          const isActive = cart.id === activeCartridgeId;
          return (
            <div
              key={cart.id}
              onClick={() => onSelectCartridge(cart.id)}
              className={`group flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg cursor-pointer border-t border-x transition-all select-none ${
                isActive
                  ? 'bg-white border-slate-200 text-blue-600 border-b-2 border-b-white font-semibold -mb-px'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🎮</span>
              <span className="truncate max-w-[140px]">{cart.name || 'Untitled'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseCartridge(cart.id);
                }}
                title="Close cartridge"
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-300 hover:text-slate-800 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          onClick={onAddCartridge}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-t-lg border border-dashed border-slate-300 transition-colors ml-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Cartridge</span>
        </button>
      </div>
    </header>
  );
};
