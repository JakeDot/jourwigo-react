import React, { useState, useEffect } from 'react';
import { Cartridge, WherigoObject, RelationType, PropertyType, LuaProperty } from './types/wherigo';
import { Header } from './components/Header';
import { CartridgeSettings } from './components/CartridgeSettings';
import { ObjectTree } from './components/ObjectTree';
import { ObjectEditor } from './components/ObjectEditor';
import { DialogBuilderView } from './components/DialogBuilderView';
import { LuaCodePreview } from './components/LuaCodePreview';
import { CartridgePlayer } from './components/CartridgePlayer';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import {
  generateCartridgeLuaScript,
  downloadFile,
} from './services/compiler';
import {
  initCheerpJ,
  subscribeCheerpJStatus,
  compileGwcCartridge,
  CheerpJStatus,
} from './services/cheerpj';

// Initial sample cartridge with rich objects demonstrating general graph relations
const initialSampleCartridge: Cartridge = {
  id: 'cart_1',
  name: 'Ancient Ruins Quest',
  author: 'Jourwigo Team',
  version: '1.0',
  description: 'An interactive geocaching adventure exploring ancient ruins with non-linear dialogue, inventory items, and simulated GPS zones.',
  latitude: 50.0875,
  longitude: 14.4211,
  altitude: 215,
  objects: [
    {
      id: 'obj_1',
      template: 'Zone',
      varName: 'zoneRuins',
      constructor: 'Wherigo.Zone(Cartridge)',
      parentId: null,
      props: [
        { k: 'Name', v: 'Ancient Ruins', t: 'STRING' as PropertyType },
        { k: 'Description', v: 'Crumbling stone pillars and overgrown ivy.', t: 'STRING' as PropertyType },
        { k: 'Visible', v: 'true', t: 'BOOLEAN' as PropertyType },
        { k: 'Active', v: 'true', t: 'BOOLEAN' as PropertyType },
        { k: 'Media', v: 'mediaIntro', t: 'EXPRESSION' as PropertyType },
        { k: 'Points', v: '{\n    Wherigo.ZonePoint(50.0875, 14.4211, 0)\n}', t: 'EXPRESSION' as PropertyType },
      ],
    },
    {
      id: 'obj_2',
      template: 'Character',
      varName: 'characterGuide',
      constructor: 'Wherigo.ZCharacter(Cartridge)',
      parentId: 'obj_1', // Inside zoneRuins
      props: [
        { k: 'Name', v: 'Eldrin the Guide', t: 'STRING' as PropertyType },
        { k: 'Description', v: 'A weathered explorer holding an ancient map.', t: 'STRING' as PropertyType },
        { k: 'Gender', v: 'Male', t: 'STRING' as PropertyType },
        { k: 'Visible', v: 'true', t: 'BOOLEAN' as PropertyType },
        { k: 'Container', v: 'zoneRuins', t: 'EXPRESSION' as PropertyType },
        { k: 'Media', v: 'mediaIntro', t: 'EXPRESSION' as PropertyType }, // Shares mediaIntro with zoneRuins!
      ],
    },
    {
      id: 'obj_3',
      template: 'Item',
      varName: 'itemKey',
      constructor: 'Wherigo.ZItem(Cartridge)',
      parentId: 'obj_1', // Inside zoneRuins
      props: [
        { k: 'Name', v: 'Ancient Brass Key', t: 'STRING' as PropertyType },
        { k: 'Description', v: 'An ornate brass key with engraved runes.', t: 'STRING' as PropertyType },
        { k: 'Visible', v: 'true', t: 'BOOLEAN' as PropertyType },
        { k: 'Container', v: 'zoneRuins', t: 'EXPRESSION' as PropertyType },
        { k: 'Icon', v: 'mediaKeyIcon', t: 'EXPRESSION' as PropertyType },
      ],
    },
    {
      id: 'obj_4',
      template: 'Media (Image)',
      varName: 'mediaIntro',
      constructor: 'Wherigo.ZMedia(Cartridge)',
      parentId: null,
      props: [
        { k: 'Name', v: 'Ruins Illustration', t: 'STRING' as PropertyType },
        { k: 'Filename', v: 'ruins.png', t: 'STRING' as PropertyType },
        { k: 'Type', v: 'png', t: 'STRING' as PropertyType },
        { k: 'Category', v: 'Image', t: 'STRING' as PropertyType },
      ],
    },
    {
      id: 'obj_5',
      template: 'Media (Image)',
      varName: 'mediaKeyIcon',
      constructor: 'Wherigo.ZMedia(Cartridge)',
      parentId: null,
      props: [
        { k: 'Name', v: 'Key Icon', t: 'STRING' as PropertyType },
        { k: 'Filename', v: 'key_icon.png', t: 'STRING' as PropertyType },
        { k: 'Type', v: 'png', t: 'STRING' as PropertyType },
        { k: 'Category', v: 'Image', t: 'STRING' as PropertyType },
      ],
    },
    {
      id: 'obj_6',
      template: 'Task',
      varName: 'taskExplore',
      constructor: 'Wherigo.ZTask(Cartridge)',
      parentId: null,
      props: [
        { k: 'Name', v: 'Explore the Ancient Ruins', t: 'STRING' as PropertyType },
        { k: 'Description', v: 'Find Eldrin the Guide and recover the Ancient Brass Key.', t: 'STRING' as PropertyType },
        { k: 'Active', v: 'true', t: 'BOOLEAN' as PropertyType },
        { k: 'Complete', v: 'false', t: 'BOOLEAN' as PropertyType },
      ],
    },
  ],
};

export const App: React.FC = () => {
  const [cartridges, setCartridges] = useState<Cartridge[]>([initialSampleCartridge]);
  const [activeCartridgeId, setActiveCartridgeId] = useState<string>('cart_1');
  const [activeView, setActiveView] = useState<'EDITOR' | 'PLAYER' | 'DIALOG_BUILDER'>('EDITOR');
  const [editingObject, setEditingObject] = useState<WherigoObject | null>(null);
  const [cheerpjStatus, setCheerpjStatus] = useState<CheerpJStatus>('INITIALIZING');
  const [cheerpjMessage, setCheerpjMessage] = useState<string>('Starting Runtime...');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: ToastMessage['type'] = 'info') => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const activeCartridge = cartridges.find((c) => c.id === activeCartridgeId) || cartridges[0];

  // Initialize CheerpJ JVM WebAssembly runtime on mount
  useEffect(() => {
    const unsubscribe = subscribeCheerpJStatus((status, msg) => {
      setCheerpjStatus(status);
      setCheerpjMessage(msg);
    });

    initCheerpJ().catch((err) => {
      console.warn('CheerpJ init notice:', err);
    });

    return () => unsubscribe();
  }, []);

  // Cartridge tab handlers
  const handleAddCartridge = () => {
    const num = cartridges.length + 1;
    const newCart: Cartridge = {
      id: `cart_${Date.now()}`,
      name: `Cartridge ${num}`,
      author: 'Author',
      version: '1.0',
      description: `Cartridge ${num} description`,
      latitude: 0,
      longitude: 0,
      altitude: 0,
      objects: [],
    };
    setCartridges([...cartridges, newCart]);
    setActiveCartridgeId(newCart.id);
    setEditingObject(null);
    addToast(`Created Cartridge ${num}`, 'info');
  };

  const handleCloseCartridge = (id: string) => {
    if (cartridges.length <= 1) {
      addToast('At least one cartridge tab must remain open.', 'warning');
      return;
    }
    const remaining = cartridges.filter((c) => c.id !== id);
    setCartridges(remaining);
    if (activeCartridgeId === id) {
      setActiveCartridgeId(remaining[0].id);
      setEditingObject(null);
    }
  };

  const handleUpdateActiveCartridge = (updatedFields: Partial<Cartridge>) => {
    setCartridges((prev) =>
      prev.map((c) => (c.id === activeCartridgeId ? { ...c, ...updatedFields } : c))
    );
  };

  // Object Save / Update
  const handleSaveObject = (objData: Omit<WherigoObject, 'id'>, existingId?: string) => {
    setCartridges((prev) =>
      prev.map((c) => {
        if (c.id !== activeCartridgeId) return c;

        let newObjects = [...c.objects];

        if (existingId) {
          // Update
          newObjects = newObjects.map((o) =>
            o.id === existingId
              ? {
                  ...o,
                  ...objData,
                }
              : o
          );
        } else {
          // Create
          const newObj: WherigoObject = {
            id: `obj_${Date.now()}`,
            ...objData,
          };
          newObjects.push(newObj);
        }

        // Resync container properties for any object whose parent exists
        newObjects = newObjects.map((obj) => {
          if (obj.parentId) {
            const parentObj = newObjects.find((p) => p.id === obj.parentId);
            if (parentObj) {
              const withoutContainer = obj.props.filter(
                (p) => p.k.toLowerCase() !== 'container'
              );
              const containerProp: LuaProperty = { k: 'Container', v: parentObj.varName, t: 'EXPRESSION' };
              return {
                ...obj,
                props: [...withoutContainer, containerProp],
              };
            }
          }
          return obj;
        });

        return { ...c, objects: newObjects };
      })
    );

    addToast(existingId ? 'Object updated' : `Object ${objData.varName} created`, 'success');
    setEditingObject(null);
  };

  const handleDeleteObject = (objId: string) => {
    const obj = activeCartridge.objects.find((o) => o.id === objId);
    if (!obj) return;

    setCartridges((prev) =>
      prev.map((c) => {
        if (c.id !== activeCartridgeId) return c;
        const updated = c.objects
          .filter((o) => o.id !== objId)
          .map((o) => (o.parentId === objId ? { ...o, parentId: null } : o));
        return { ...c, objects: updated };
      })
    );
    if (editingObject?.id === objId) {
      setEditingObject(null);
    }
    addToast(`Deleted object "${obj.varName}"`, 'info');
  };

  // Move object in hierarchy
  const handleMoveObject = (draggedId: string, targetParentId: string | null) => {
    setCartridges((prev) =>
      prev.map((c) => {
        if (c.id !== activeCartridgeId) return c;

        const updated = c.objects.map((o) => {
          if (o.id === draggedId) {
            const parentObj = targetParentId
              ? c.objects.find((p) => p.id === targetParentId)
              : null;
            const withoutContainer = o.props.filter(
              (p) => p.k.toLowerCase() !== 'container'
            );
            const containerProp: LuaProperty = { k: 'Container', v: parentObj ? parentObj.varName : '', t: 'EXPRESSION' };
            return {
              ...o,
              parentId: targetParentId,
              props: parentObj
                ? [...withoutContainer, containerProp]
                : withoutContainer,
            };
          }
          return o;
        });

        return { ...c, objects: updated };
      })
    );
  };

  // Assign Media / Icon to object
  const handleAssignMedia = (targetObjId: string, mediaObj: WherigoObject, asIcon: boolean) => {
    const propKey = asIcon ? 'Icon' : 'Media';

    setCartridges((prev) =>
      prev.map((c) => {
        if (c.id !== activeCartridgeId) return c;

        const updated: WherigoObject[] = c.objects.map((o) => {
          if (o.id === targetObjId) {
            const filtered = o.props.filter((p) => p.k.toLowerCase() !== propKey.toLowerCase());
            const newProp: LuaProperty = { k: propKey, v: mediaObj.varName, t: 'EXPRESSION' };
            return {
              ...o,
              props: [...filtered, newProp],
            };
          }
          return o;
        });

        return { ...c, objects: updated };
      })
    );
    addToast(`Assigned ${mediaObj.varName} as ${propKey}`, 'success');
  };

  // Add Graph Link between two objects (e.g. USES_MEDIA, USES_ICON, CONTAINS, ATTACHED_COMMAND, etc.)
  const handleAddGraphLink = (sourceId: string, targetId: string, relationType: RelationType) => {
    setCartridges((prev) =>
      prev.map((c) => {
        if (c.id !== activeCartridgeId) return c;

        const sourceObj = c.objects.find((o) => o.id === sourceId);
        const targetObj = c.objects.find((o) => o.id === targetId);
        if (!sourceObj || !targetObj) return c;

        const updated: WherigoObject[] = c.objects.map((obj) => {
          if (obj.id === sourceId && relationType === 'USES_MEDIA') {
            const filtered = obj.props.filter((p) => p.k.toLowerCase() !== 'media');
            const newProp: LuaProperty = { k: 'Media', v: targetObj.varName, t: 'EXPRESSION' };
            return { ...obj, props: [...filtered, newProp] };
          }
          if (obj.id === sourceId && relationType === 'USES_ICON') {
            const filtered = obj.props.filter((p) => p.k.toLowerCase() !== 'icon');
            const newProp: LuaProperty = { k: 'Icon', v: targetObj.varName, t: 'EXPRESSION' };
            return { ...obj, props: [...filtered, newProp] };
          }
          if (obj.id === targetId && relationType === 'CONTAINS') {
            const filtered = obj.props.filter((p) => p.k.toLowerCase() !== 'container');
            const newProp: LuaProperty = { k: 'Container', v: sourceObj.varName, t: 'EXPRESSION' };
            return { ...obj, parentId: sourceId, props: [...filtered, newProp] };
          }
          if (obj.id === sourceId && relationType === 'ATTACHED_COMMAND') {
            const filtered = obj.props.filter((p) => p.k.toLowerCase() !== 'command');
            const newProp: LuaProperty = { k: 'Command', v: targetObj.varName, t: 'EXPRESSION' };
            return { ...obj, props: [...filtered, newProp] };
          }
          if (obj.id === sourceId && relationType === 'REFERENCES') {
            const refPropKey = `Ref_${targetObj.varName}`;
            const filtered = obj.props.filter((p) => p.k !== refPropKey);
            const newProp: LuaProperty = { k: refPropKey, v: targetObj.varName, t: 'EXPRESSION' };
            return { ...obj, props: [...filtered, newProp] };
          }
          return obj;
        });

        return { ...c, objects: updated };
      })
    );
    addToast('Graph link created', 'success');
  };

  // Remove Graph Link
  const handleRemoveGraphLink = (sourceId: string, targetId: string, relationType: RelationType) => {
    setCartridges((prev) =>
      prev.map((c) => {
        if (c.id !== activeCartridgeId) return c;

        const targetObj = c.objects.find((o) => o.id === targetId);
        if (!targetObj) return c;

        const updated: WherigoObject[] = c.objects.map((obj) => {
          if (obj.id === sourceId) {
            let filteredProps = obj.props;
            if (relationType === 'USES_MEDIA') {
              filteredProps = obj.props.filter((p) => p.k.toLowerCase() !== 'media' || p.v !== targetObj.varName);
            } else if (relationType === 'USES_ICON') {
              filteredProps = obj.props.filter((p) => p.k.toLowerCase() !== 'icon' || p.v !== targetObj.varName);
            } else if (relationType === 'ATTACHED_COMMAND') {
              filteredProps = obj.props.filter((p) => p.k.toLowerCase() !== 'command' || p.v !== targetObj.varName);
            }
            return { ...obj, props: filteredProps };
          }
          if (obj.id === targetId && relationType === 'CONTAINS') {
            return {
              ...obj,
              parentId: null,
              props: obj.props.filter((p) => p.k.toLowerCase() !== 'container'),
            };
          }
          return obj;
        });

        return { ...c, objects: updated };
      })
    );
    addToast('Graph link removed', 'info');
  };

  // Add Dialog from DialogBuilder into active cartridge
  const handleAddDialogToCartridge = (dialogName: string, luaCode: string) => {
    const dialogObj: WherigoObject = {
      id: `dialog_${Date.now()}`,
      template: 'Branching Dialog',
      varName: dialogName,
      constructor: '-- Branching Dialogue Function',
      parentId: null,
      props: [{ k: 'Code', v: luaCode, t: 'EXPRESSION' as PropertyType }],
    };

    setCartridges((prev) =>
      prev.map((c) =>
        c.id === activeCartridgeId ? { ...c, objects: [...c.objects, dialogObj] } : c
      )
    );

    addToast(`Dialogue '${dialogName}' added to cartridge!`, 'success');
  };

  // Compile and Export Handlers
  const handleCompileGwc = async () => {
    try {
      const { bytes, engineUsed } = await compileGwcCartridge(activeCartridge);
      const filename = `${activeCartridge.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cartridge'}.gwc`;
      downloadFile(bytes, filename, 'application/octet-stream');
      addToast(`Compiled via ${engineUsed === 'JAVA_CHEERPJ' ? 'CheerpJ JVM' : 'Native Engine'} (${(bytes.length / 1024).toFixed(1)} KB)`, 'success');
    } catch (err) {
      addToast('Compilation error: ' + err, 'error');
    }
  };

  const handleExportLua = () => {
    const luaScript = generateCartridgeLuaScript(activeCartridge);
    const filename = `${activeCartridge.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cartridge'}.lua`;
    downloadFile(luaScript, filename, 'text/plain');
    addToast('Downloaded Lua script template', 'info');
  };

  const handleImportCartridge = (parsed: Partial<Cartridge>) => {
    const newCart: Cartridge = {
      id: `cart_${Date.now()}`,
      name: parsed.name || 'Imported Cartridge',
      author: parsed.author || 'Author',
      version: parsed.version || '1.0',
      description: parsed.description || '',
      latitude: parsed.latitude || 0,
      longitude: parsed.longitude || 0,
      altitude: parsed.altitude || 0,
      objects: parsed.objects || [],
    };
    setCartridges([...cartridges, newCart]);
    setActiveCartridgeId(newCart.id);
    addToast(`Imported "${newCart.name}"`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        cartridges={cartridges}
        activeCartridgeId={activeCartridgeId}
        onSelectCartridge={(id) => {
          setActiveCartridgeId(id);
          setEditingObject(null);
        }}
        onAddCartridge={handleAddCartridge}
        onCloseCartridge={handleCloseCartridge}
        activeView={activeView}
        setActiveView={setActiveView}
        onCompileGwc={handleCompileGwc}
        onExportLua={handleExportLua}
        onImportCartridge={handleImportCartridge}
        cheerpjStatus={cheerpjStatus}
        cheerpjMessage={cheerpjMessage}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeView === 'EDITOR' && (
          <div className="space-y-6">
            {/* Global Settings */}
            <CartridgeSettings
              cartridge={activeCartridge}
              onChange={handleUpdateActiveCartridge}
            />

            {/* General Object Graph & Relations */}
            <ObjectTree
              objects={activeCartridge.objects}
              onEditObject={(obj) => setEditingObject(obj)}
              onAddChild={(parentObj) => {
                setEditingObject({
                  id: '',
                  template: 'Item',
                  varName: `itemIn${parentObj.varName}`,
                  constructor: 'Wherigo.ZItem(Cartridge)',
                  parentId: parentObj.id,
                  props: [
                    { k: 'Name', v: 'New Item', t: 'STRING' as PropertyType },
                    { k: 'Description', v: 'Found inside ' + parentObj.varName, t: 'STRING' as PropertyType },
                    { k: 'Visible', v: 'true', t: 'BOOLEAN' as PropertyType },
                    { k: 'Container', v: parentObj.varName, t: 'EXPRESSION' as PropertyType },
                  ],
                });
              }}
              onDeleteObject={handleDeleteObject}
              onMoveObject={handleMoveObject}
              onAssignMedia={handleAssignMedia}
              onAddGraphLink={handleAddGraphLink}
              onRemoveGraphLink={handleRemoveGraphLink}
            />

            {/* Object Editor Form */}
            <ObjectEditor
              editingObject={editingObject}
              allObjects={activeCartridge.objects}
              onSaveObject={handleSaveObject}
              onCancelEdit={() => setEditingObject(null)}
            />

            {/* Live Lua Script & Compilation */}
            <LuaCodePreview
              cartridge={activeCartridge}
              onCompileGwc={handleCompileGwc}
              onExportLua={handleExportLua}
            />
          </div>
        )}

        {activeView === 'DIALOG_BUILDER' && (
          <DialogBuilderView onAddDialogToCartridge={handleAddDialogToCartridge} />
        )}

        {activeView === 'PLAYER' && (
          <CartridgePlayer cartridge={activeCartridge} />
        )}
      </main>

      <NotificationToast toasts={toasts} onDismiss={removeToast} />

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        jourwigo &bull; Client-Side Wherigo Cartridge Creator, Object Relationship Graph &amp; GPS Simulator
      </footer>
    </div>
  );
};
