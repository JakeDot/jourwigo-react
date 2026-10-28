import React, { useState, useMemo } from 'react';
import { WherigoObject, RelationType, GraphEdge } from '../types/wherigo';
import { TEMPLATES } from '../services/templates';
import { extractGraphEdges, getNodeGraphInfo } from '../services/graphEngine';
import {
  Network,
  FolderTree,
  Link2,
  Unlink,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Search,
  Filter,
} from 'lucide-react';

interface ObjectTreeProps {
  objects: WherigoObject[];
  onEditObject: (obj: WherigoObject) => void;
  onAddChild: (parentObj: WherigoObject) => void;
  onDeleteObject: (objId: string) => void;
  onMoveObject: (draggedId: string, targetParentId: string | null) => void;
  onAssignMedia: (targetObjId: string, mediaObj: WherigoObject, asIcon: boolean) => void;
  onAddGraphLink: (sourceId: string, targetId: string, relationType: RelationType) => void;
  onRemoveGraphLink: (sourceId: string, targetId: string, relationType: RelationType) => void;
}

export const ObjectTree: React.FC<ObjectTreeProps> = ({
  objects,
  onEditObject,
  onAddChild,
  onDeleteObject,
  onMoveObject,
  onAssignMedia,
  onAddGraphLink,
  onRemoveGraphLink,
}) => {
  const [viewMode, setViewMode] = useState<'GRAPH' | 'HIERARCHY' | 'CANVAS'>('GRAPH');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Link Dialog Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState<string>('');
  const [linkTargetId, setLinkTargetId] = useState<string>('');
  const [linkRelationType, setLinkRelationType] = useState<RelationType>('USES_MEDIA');

  // Drag-and-drop state for hierarchy mode
  const [draggedObjId, setDraggedObjId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

  // Extract all directed edges across the object graph
  const allEdges = useMemo(() => extractGraphEdges(objects), [objects]);

  // Count multi-referenced assets (like Media used by 2+ objects)
  const multiReferencedCount = useMemo(() => {
    return objects.filter((o) => {
      const incoming = allEdges.filter((e) => e.targetId === o.id);
      return incoming.length > 1;
    }).length;
  }, [objects, allEdges]);

  // Filtered objects
  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      const matchesSearch =
        obj.varName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.template.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.props.some((p) => p.v.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (typeFilter === 'ALL') return true;
      if (typeFilter === 'MEDIA') return obj.template.toLowerCase().includes('media');
      if (typeFilter === 'ZONE') return obj.template === 'Zone';
      if (typeFilter === 'ENTITIES') return obj.template === 'Character' || obj.template === 'Item';
      if (typeFilter === 'MULTI_REFERENCED') {
        const incoming = allEdges.filter((e) => e.targetId === obj.id);
        return incoming.length > 1;
      }
      return true;
    });
  }, [objects, searchQuery, typeFilter, allEdges]);

  // Open Link Modal with prefilled source
  const handleOpenLinkModal = (srcId?: string) => {
    setLinkSourceId(srcId || (objects[0]?.id ?? ''));
    setLinkTargetId(objects.find((o) => o.id !== srcId)?.id ?? '');
    setLinkRelationType('USES_MEDIA');
    setShowLinkModal(true);
  };

  const handleConfirmLink = () => {
    if (!linkSourceId || !linkTargetId || linkSourceId === linkTargetId) {
      return;
    }
    onAddGraphLink(linkSourceId, linkTargetId, linkRelationType);
    setShowLinkModal(false);
  };

  // Drag and drop for hierarchy
  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    setRootDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain') || draggedObjId;
    if (draggedId) {
      onMoveObject(draggedId, null);
    }
    setDraggedObjId(null);
  };

  const handleDropOnNode = (e: React.DragEvent, targetObj: WherigoObject) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    const draggedId = e.dataTransfer.getData('text/plain') || draggedObjId;
    if (!draggedId || draggedId === targetObj.id) return;

    const draggedObj = objects.find((o) => o.id === draggedId);
    if (!draggedObj) return;

    if (draggedObj.template.toLowerCase().includes('media')) {
      onAssignMedia(targetObj.id, draggedObj, false);
    } else {
      onMoveObject(draggedId, targetObj.id);
    }

    setDraggedObjId(null);
  };

  const selectedNodeInfo = useMemo(() => {
    if (!selectedNodeId) return null;
    const obj = objects.find((o) => o.id === selectedNodeId);
    if (!obj) return null;
    const info = getNodeGraphInfo(selectedNodeId, objects, allEdges);
    return { obj, ...info };
  }, [selectedNodeId, objects, allEdges]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">
                Wherigo Object Relationship Graph
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                General Graph
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Supports complex multi-reference graphs: shared Media, inventory containers, and commands
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Link Button */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center text-xs">
            <button
              onClick={() => setViewMode('GRAPH')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                viewMode === 'GRAPH'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Relations View</span>
            </button>
            <button
              onClick={() => setViewMode('CANVAS')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                viewMode === 'CANVAS'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Graph Diagram</span>
            </button>
            <button
              onClick={() => setViewMode('HIERARCHY')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                viewMode === 'HIERARCHY'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Inventory Tree</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenLinkModal()}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Connect Objects</span>
          </button>
        </div>
      </div>

      {/* Graph Metrics & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-xs">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-1 text-slate-700 font-medium">
            <span className="font-bold text-slate-900">{objects.length}</span> Objects
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1 text-slate-700 font-medium">
            <span className="font-bold text-blue-600">{allEdges.length}</span> Graph Relations
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1 text-emerald-700 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold">{multiReferencedCount}</span> Shared Multi-Reference Assets
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded bg-white outline-none focus:border-blue-500 w-36"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none text-slate-700"
          >
            <option value="ALL">All Types</option>
            <option value="MEDIA">Media Assets</option>
            <option value="ZONE">Zones</option>
            <option value="ENTITIES">Characters &amp; Items</option>
            <option value="MULTI_REFERENCED">Multi-Referenced</option>
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: GRAPH & RELATIONS CARDS */}
      {viewMode === 'GRAPH' && (
        <div className="space-y-3">
          {filteredObjects.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 italic">
              No matching objects found in graph.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredObjects.map((obj) => {
                const tmplInfo = TEMPLATES[obj.template] || TEMPLATES['Custom Object'];
                const nameProp = obj.props.find((p) => p.k === 'Name');
                const displayName = nameProp ? nameProp.v : '';
                const graphInfo = getNodeGraphInfo(obj.id, objects, allEdges);
                const isSelected = selectedNodeId === obj.id;

                return (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedNodeId(obj.id === selectedNodeId ? null : obj.id)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-lg">{tmplInfo.icon}</span>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 font-mono truncate">
                              {obj.varName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              {obj.template}
                            </span>
                          </div>
                          {displayName && (
                            <span className="text-[11px] text-slate-500 italic truncate block">
                              "{displayName}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Node Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenLinkModal(obj.id)}
                          title="Connect / Link this object"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditObject(obj)}
                          title="Edit properties"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteObject(obj.id)}
                          title="Delete object"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Multi-Referenced Highlight Badge */}
                    {graphInfo.isMultiReferenced && (
                      <div className="mb-2 p-1 px-2 rounded bg-emerald-50 border border-emerald-200 flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Shared Multi-Reference ({graphInfo.incoming.length} usages)</span>
                      </div>
                    )}

                    {/* Incoming Graph Edges (Objects that use or contain this) */}
                    {graphInfo.incoming.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[11px]">
                        <span className="font-semibold text-slate-600 block mb-1">
                          Used / Contained By ({graphInfo.incoming.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {graphInfo.incoming.map(({ source, edge }, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 font-mono"
                              title={`${edge.relationType}: ${source.varName}`}
                            >
                              <span>{TEMPLATES[source.template]?.icon || '📦'}</span>
                              <span>{source.varName}</span>
                              <span className="text-[9px] text-blue-500 uppercase">
                                ({edge.relationType.replace('USES_', '')})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outgoing Graph Edges (Objects this references or contains) */}
                    {graphInfo.outgoing.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px]">
                        <span className="font-semibold text-slate-600 block mb-1">
                          References / Contains ({graphInfo.outgoing.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {graphInfo.outgoing.map(({ target, edge }, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1 font-mono group"
                              title={`${edge.relationType}: ${target.varName}`}
                            >
                              <span>{TEMPLATES[target.template]?.icon || '📦'}</span>
                              <span>{target.varName}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveGraphLink(obj.id, target.id, edge.relationType);
                                }}
                                className="text-purple-400 hover:text-red-600 ml-0.5"
                                title="Remove relation"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: INTERACTIVE GRAPH CANVAS / DIAGRAM */}
      {viewMode === 'CANVAS' && (
        <div className="bg-slate-900 rounded-lg p-5 text-slate-100 min-h-[420px] flex flex-col justify-between overflow-x-auto">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-300">Directed Relations Graph Topology</span>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Uses Media
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Contains / Inventory
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Uses Icon
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> References
              </span>
            </div>
          </div>

          {/* Graph Nodes Grid with SVG Connection Lines */}
          <div className="relative py-4 min-w-[600px]">
            <div className="flex flex-wrap gap-4 items-center justify-around">
              {objects.map((obj) => {
                const tmpl = TEMPLATES[obj.template] || TEMPLATES['Custom Object'];
                const graphInfo = getNodeGraphInfo(obj.id, objects, allEdges);
                const isSelected = selectedNodeId === obj.id;
                const isMedia = obj.template.toLowerCase().includes('media');

                return (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedNodeId(obj.id === selectedNodeId ? null : obj.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer max-w-[200px] text-center ${
                      isSelected
                        ? 'border-blue-400 bg-blue-950/80 shadow-md ring-2 ring-blue-500'
                        : isMedia
                        ? 'border-teal-700 bg-teal-950/40 hover:border-teal-400'
                        : 'border-slate-700 bg-slate-800/90 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-xl mb-1">{tmpl.icon}</div>
                    <div className="font-mono text-xs font-bold text-white truncate">{obj.varName}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{obj.template}</div>

                    <div className="mt-2 pt-1 border-t border-slate-700/60 flex items-center justify-around text-[10px]">
                      <span className="text-blue-400" title="Incoming references">
                        ⬇ {graphInfo.incoming.length}
                      </span>
                      <span className="text-purple-400" title="Outgoing relations">
                        ⬆ {graphInfo.outgoing.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Relations Summary Table */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 block mb-2">
                Active Graph Edges &amp; Multi-Reference Paths:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                {allEdges.map((edge) => {
                  const source = objects.find((o) => o.id === edge.sourceId);
                  const target = objects.find((o) => o.id === edge.targetId);
                  if (!source || !target) return null;

                  return (
                    <div
                      key={edge.id}
                      className="p-2 rounded bg-slate-800/60 border border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-blue-300 truncate">{source.varName}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-emerald-300 truncate">{target.varName}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold shrink-0 ml-2">
                        {edge.relationType}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: HIERARCHY TREE WITH MULTI-PARENT BADGES */}
      {viewMode === 'HIERARCHY' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Hierarchical inventory tree representation. Drag and drop onto containers or the root dropzone. Objects with multiple relationships are marked with relation badges.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setRootDragOver(true);
            }}
            onDragLeave={() => setRootDragOver(false)}
            onDrop={handleDropOnRoot}
            className={`border-2 border-dashed rounded-lg p-3 text-center text-xs font-medium transition-all ${
              rootDragOver
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold scale-[1.01]'
                : 'border-slate-300 text-slate-500 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            📦 Cartridge Root Dropzone (Move object to top-level)
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {objects
              .filter((o) => !o.parentId || !objects.some((p) => p.id === o.parentId))
              .map((obj) => {
                const tmpl = TEMPLATES[obj.template] || TEMPLATES['Custom Object'];
                const graphInfo = getNodeGraphInfo(obj.id, objects, allEdges);
                const children = objects.filter((o) => o.parentId === obj.id);

                return (
                  <div key={obj.id} className="space-y-1">
                    <div
                      draggable
                      onDragStart={(e) => {
                        setDraggedObjId(obj.id);
                        e.dataTransfer.setData('text/plain', obj.id);
                      }}
                      onDragEnd={() => setDraggedObjId(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(obj.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => handleDropOnNode(e, obj)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing bg-white ${
                        dragOverId === obj.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                          : 'border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-base shrink-0">{tmpl.icon}</span>
                        <span className="text-xs font-bold text-slate-800 font-mono truncate">
                          {obj.varName}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600 shrink-0">
                          {obj.template}
                        </span>

                        {graphInfo.incoming.length > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold shrink-0">
                            🔗 {graphInfo.incoming.length} incoming
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleOpenLinkModal(obj.id)}
                          title="Connect relation"
                          className="p-1 text-slate-600 hover:text-blue-600 rounded"
                        >
                          <Link2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditObject(obj)}
                          title="Edit"
                          className="p-1 text-slate-600 hover:text-blue-600 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddChild(obj)}
                          title="Add child"
                          className="p-1 text-slate-600 hover:text-emerald-600 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteObject(obj.id)}
                          title="Delete"
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Children items */}
                    {children.length > 0 && (
                      <div className="ml-6 pl-2 border-l-2 border-dashed border-slate-300 space-y-1">
                        {children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between p-2 rounded border border-slate-200 bg-slate-50/70 text-xs"
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span>{TEMPLATES[child.template]?.icon || '📦'}</span>
                              <span className="font-mono font-bold text-slate-800 truncate">
                                {child.varName}
                              </span>
                              <span className="text-[10px] text-slate-500">[{child.template}]</span>
                            </div>
                            <button
                              onClick={() => onEditObject(child)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* RELATIONSHIP LINKER MODAL */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Connect Graph Objects</h3>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Create a directed relationship edge between two objects (e.g. Character uses Media, Item inside Zone, etc.).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Object (Consumer / Container)
                </label>
                <select
                  value={linkSourceId}
                  onChange={(e) => setLinkSourceId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white outline-none focus:border-blue-500"
                >
                  {objects.map((o) => (
                    <option key={o.id} value={o.id}>
                      {TEMPLATES[o.template]?.icon || '📦'} {o.varName} [{o.template}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relationship Type
                </label>
                <select
                  value={linkRelationType}
                  onChange={(e) => setLinkRelationType(e.target.value as RelationType)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="USES_MEDIA">Uses as Media (obj.Media = target)</option>
                  <option value="USES_ICON">Uses as Icon (obj.Icon = target)</option>
                  <option value="CONTAINS">Contains in Inventory (target.Container = source)</option>
                  <option value="ATTACHED_COMMAND">Attaches Command (Command relation)</option>
                  <option value="REFERENCES">Generic Reference Property</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Object (Resource / Child)
                </label>
                <select
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white outline-none focus:border-blue-500"
                >
                  {objects
                    .filter((o) => o.id !== linkSourceId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {TEMPLATES[o.template]?.icon || '📦'} {o.varName} [{o.template}]
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Create Graph Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
