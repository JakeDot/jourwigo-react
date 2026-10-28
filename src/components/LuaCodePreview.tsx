import React, { useState } from 'react';
import { Cartridge } from '../types/wherigo';
import { generateCartridgeLuaScript } from '../services/compiler';
import { Code, Copy, Download, Check, RefreshCw } from 'lucide-react';

interface LuaCodePreviewProps {
  cartridge: Cartridge;
  onCompileGwc: () => void;
  onExportLua: () => void;
}

export const LuaCodePreview: React.FC<LuaCodePreviewProps> = ({
  cartridge,
  onCompileGwc,
  onExportLua,
}) => {
  const [copied, setCopied] = useState(false);
  const luaCode = generateCartridgeLuaScript(cartridge);

  const handleCopy = () => {
    navigator.clipboard.writeText(luaCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Generate &amp; Compile Cartridge</h2>
          </div>
          <p className="text-xs text-slate-500">
            Topologically sorted Urwigo-compatible Lua script ready for execution or .gwc packaging
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Lua'}
          </button>

          <button
            type="button"
            onClick={onExportLua}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download .lua
          </button>

          <button
            type="button"
            onClick={onCompileGwc}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Compile Cartridge (.gwc)
          </button>
        </div>
      </div>

      <div className="relative">
        <pre className="w-full p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-96 leading-relaxed select-all">
          {luaCode}
        </pre>
      </div>
    </div>
  );
};
