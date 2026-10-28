import React, { useState, useEffect } from 'react';
import { WherigoObject, ObjectTemplate, LuaProperty, PropertyType } from '../types/wherigo';
import { TEMPLATES } from '../services/templates';
import { Plus, Trash2, Upload, FileText, Check, X } from 'lucide-react';

interface ObjectEditorProps {
  editingObject: WherigoObject | null;
  allObjects: WherigoObject[];
  onSaveObject: (objData: Omit<WherigoObject, 'id'>, existingId?: string) => void;
  onCancelEdit: () => void;
}

export const ObjectEditor: React.FC<ObjectEditorProps> = ({
  editingObject,
  allObjects,
  onSaveObject,
  onCancelEdit,
}) => {
  const [template, setTemplate] = useState<ObjectTemplate>('Zone');
  const [varName, setVarName] = useState('zoneStart');
  const [constructorExpr, setConstructorExpr] = useState('Wherigo.Zone(Cartridge)');
  const [parentId, setParentId] = useState<string>('');
  const [props, setProps] = useState<LuaProperty[]>(TEMPLATES.Zone.props);
  const [mediaCategory, setMediaCategory] = useState<string>('');
  const [mediaInfoMsg, setMediaInfoMsg] = useState<string>('');

  // When editingObject changes, load its data or reset
  useEffect(() => {
    if (editingObject) {
      setTemplate(editingObject.template);
      setVarName(editingObject.varName);
      setConstructorExpr(editingObject.constructor);
      setParentId(editingObject.parentId || '');
      setProps(editingObject.props ? [...editingObject.props] : []);

      const catProp = editingObject.props.find((p) => p.k === 'Category');
      setMediaCategory(catProp ? catProp.v : '');
      setMediaInfoMsg('');
    } else {
      resetForm('Zone');
    }
  }, [editingObject]);

  const resetForm = (newTemplate: ObjectTemplate = 'Zone') => {
    const tmpl = TEMPLATES[newTemplate] || TEMPLATES['Custom Object'];
    setTemplate(newTemplate);
    setVarName(tmpl.varName);
    setConstructorExpr(tmpl.constructor);
    setParentId('');
    setProps([...tmpl.props]);
    setMediaCategory(newTemplate.includes('Media') ? newTemplate.replace('Media (', '').replace(')', '') : '');
    setMediaInfoMsg('');
  };

  const handleTemplateChange = (newTmpl: ObjectTemplate) => {
    if (!editingObject) {
      resetForm(newTmpl);
    } else {
      setTemplate(newTmpl);
    }
  };

  const handleAddProperty = () => {
    setProps([...props, { k: '', v: '', t: 'STRING' }]);
  };

  const handleUpdateProperty = (index: number, field: keyof LuaProperty, value: string) => {
    const updated = [...props];
    updated[index] = { ...updated[index], [field]: value };
    setProps(updated);
  };

  const handleRemoveProperty = (index: number) => {
    setProps(props.filter((_, i) => i !== index));
  };

  // Helper to upsert a property
  const upsertProp = (key: string, val: string, type: PropertyType = 'STRING') => {
    setProps((prev) => {
      const idx = prev.findIndex((p) => p.k.toLowerCase() === key.toLowerCase());
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { k: key, v: val, t: type };
        return copy;
      }
      return [...prev, { k: key, v: val, t: type }];
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
    const mime = file.type.toLowerCase();

    let detectedCat: string | null = null;
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      detectedCat = 'Image';
    } else if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac'].includes(ext)) {
      detectedCat = 'Audio';
    } else if (mime.startsWith('video/') || ['mp4', 'webm', 'ogv', 'avi'].includes(ext)) {
      detectedCat = 'Video';
    } else if (mime.startsWith('text/') || ['txt', 'json', 'xml', 'md'].includes(ext)) {
      detectedCat = 'Text';
    }

    upsertProp('Filename', file.name, 'STRING');
    if (ext) upsertProp('Type', ext, 'STRING');

    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const existingName = props.find((p) => p.k === 'Name')?.v;
    if (!existingName || existingName.startsWith('Sample') || existingName.includes('Media')) {
      upsertProp('Name', baseName, 'STRING');
    }

    if (detectedCat) {
      setMediaCategory(detectedCat);
      upsertProp('Category', detectedCat, 'STRING');
      setMediaInfoMsg(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB) - Category: ${detectedCat}`);
    } else {
      setMediaCategory('');
      setMediaInfoMsg(`Loaded "${file.name}" - Unknown category. Please select below.`);
    }

    // If text file, read content
    if (detectedCat === 'Text') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        upsertProp('Text', content || '', 'STRING');
      };
      reader.readAsText(file);
    }
  };

  const handleCategorySelect = (cat: string) => {
    setMediaCategory(cat);
    if (cat) {
      upsertProp('Category', cat, 'STRING');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varName.trim()) {
      return;
    }

    const validProps = props.filter((p) => p.k.trim().length > 0);

    onSaveObject(
      {
        template,
        varName: varName.trim(),
        constructor: constructorExpr.trim() || '{}',
        parentId: parentId || null,
        props: validProps,
      },
      editingObject?.id
    );

    if (!editingObject) {
      resetForm('Zone');
    }
  };

  // Exclude current object and descendants from parent options
  const isDescendant = (objId: string, candidateId: string): boolean => {
    let curr = allObjects.find((o) => o.id === candidateId);
    while (curr && curr.parentId) {
      if (curr.parentId === objId) return true;
      const nextId: string = curr.parentId;
      curr = allObjects.find((o) => o.id === nextId);
    }
    return false;
  };

  const parentOptions = allObjects.filter((o) => {
    if (!editingObject) return true;
    if (o.id === editingObject.id) return false;
    return !isDescendant(editingObject.id, o.id);
  });

  const isMediaTemplate = template.toLowerCase().includes('media');

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            {editingObject ? `Edit Object: ${editingObject.varName}` : 'Create New Object'}
          </h2>
          <p className="text-xs text-slate-500">
            Construct a Lua object instance (Zone, Character, Item, Task, Timer, Media, Input, Command)
          </p>
        </div>
        {editingObject && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
          >
            <X className="w-3.5 h-3.5" />
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Template and Parent Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Template / Class Type
            </label>
            <select
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value as ObjectTemplate)}
              className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              {(Object.keys(TEMPLATES) as ObjectTemplate[]).map((t) => (
                <option key={t} value={t}>
                  {TEMPLATES[t].icon} {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Inventory Container / Parent
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">(None - Top Level Cartridge Root)</option>
              {parentOptions.map((po) => {
                const nameP = po.props.find((p) => p.k === 'Name');
                const displayName = nameP ? ` ("${nameP.v}")` : '';
                const icon = TEMPLATES[po.template]?.icon || '📦';
                return (
                  <option key={po.id} value={po.id}>
                    {icon} {po.varName}{displayName} [{po.template}]
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Row 2: Variable Name and Constructor Expression */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Lua Variable Name
            </label>
            <input
              type="text"
              value={varName}
              onChange={(e) => setVarName(e.target.value)}
              required
              className="w-full text-sm font-mono px-3 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g. itemAncientSword"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Constructor / Expression
            </label>
            <input
              type="text"
              value={constructorExpr}
              onChange={(e) => setConstructorExpr(e.target.value)}
              className="w-full text-sm font-mono px-3 py-1.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g. Wherigo.ZItem(Cartridge)"
            />
          </div>
        </div>

        {/* Media Upload & Category Section */}
        {isMediaTemplate && (
          <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-200 space-y-2">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-blue-900">Media File &amp; Category Settings</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Upload Media Resource</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-white hover:file:bg-slate-50 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Media Category</label>
                <select
                  value={mediaCategory}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none"
                >
                  <option value="">-- Select Category --</option>
                  <option value="Image">Image</option>
                  <option value="Audio">Audio</option>
                  <option value="Video">Video</option>
                  <option value="Text">Text</option>
                  <option value="Other">Other / Unknown</option>
                </select>
              </div>
            </div>

            {mediaInfoMsg && (
              <p className="text-[11px] text-blue-700 font-medium">{mediaInfoMsg}</p>
            )}
          </div>
        )}

        {/* Properties Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700">
              Object Properties ({props.length})
            </label>
            <button
              type="button"
              onClick={handleAddProperty}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Property
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {props.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Key"
                  value={p.k}
                  onChange={(e) => handleUpdateProperty(idx, 'k', e.target.value)}
                  className="w-1/3 text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                />
                <select
                  value={p.t}
                  onChange={(e) => handleUpdateProperty(idx, 't', e.target.value as PropertyType)}
                  className="w-28 text-xs px-2 py-1.5 border border-slate-300 rounded bg-white outline-none"
                >
                  <option value="STRING">STRING</option>
                  <option value="NUMBER">NUMBER</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                  <option value="EXPRESSION">EXPRESSION</option>
                </select>
                <input
                  type="text"
                  placeholder="Value"
                  value={p.v}
                  onChange={(e) => handleUpdateProperty(idx, 'v', e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveProperty(idx)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                  title="Remove property"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            {editingObject ? 'Update Object' : 'Save Object to Cartridge'}
          </button>
          {editingObject && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
