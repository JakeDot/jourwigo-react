import { WherigoObject, GraphEdge, RelationType } from '../types/wherigo';

/**
 * Extract all directed graph edges from objects, inspecting parentId, property references, and explicit relations
 */
export function extractGraphEdges(objects: WherigoObject[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  function addEdge(sourceId: string, targetId: string, relationType: RelationType, label?: string) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const key = `${sourceId}->${targetId}:${relationType}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        id: `edge_${sourceId}_${targetId}_${relationType}`,
        sourceId,
        targetId,
        relationType,
        label,
      });
    }
  }

  // Map of varName to object
  const varMap = new Map<string, WherigoObject>();
  objects.forEach((o) => {
    varMap.set(o.varName, o);
  });

  objects.forEach((obj) => {
    // 1. Container hierarchy (parent contains child)
    if (obj.parentId) {
      const parentObj = objects.find((p) => p.id === obj.parentId);
      if (parentObj) {
        addEdge(parentObj.id, obj.id, 'CONTAINS', 'Inventory / Sub-object');
      }
    }

    // 2. Property-based references (Media, Icon, Container, or explicit varName reference)
    obj.props.forEach((p) => {
      const kLower = p.k.toLowerCase();
      const valTrimmed = p.v.trim();

      // Check if value matches an existing object's varName
      const targetObj = varMap.get(valTrimmed);
      if (targetObj) {
        if (kLower === 'media' || kLower === 'image') {
          addEdge(obj.id, targetObj.id, 'USES_MEDIA', 'Media Resource');
        } else if (kLower === 'icon') {
          addEdge(obj.id, targetObj.id, 'USES_ICON', 'Icon Resource');
        } else if (kLower === 'container') {
          addEdge(targetObj.id, obj.id, 'CONTAINS', 'Container Inventory');
        } else if (targetObj.template === 'Command') {
          addEdge(obj.id, targetObj.id, 'ATTACHED_COMMAND', 'Command Action');
        } else {
          addEdge(obj.id, targetObj.id, 'REFERENCES', `Property: ${p.k}`);
        }
      }
    });

    // 3. Explicit relations array
    if (obj.relations) {
      obj.relations.forEach((rel) => {
        addEdge(obj.id, rel.targetId, rel.relationType, rel.label);
      });
    }
  });

  return edges;
}

export interface NodeGraphInfo {
  incoming: { source: WherigoObject; edge: GraphEdge }[];
  outgoing: { target: WherigoObject; edge: GraphEdge }[];
  isMultiReferenced: boolean;
}

/**
 * Get comprehensive incoming and outgoing relationship information for a specific node
 */
export function getNodeGraphInfo(objId: string, objects: WherigoObject[], edges: GraphEdge[]): NodeGraphInfo {
  const objMap = new Map<string, WherigoObject>();
  objects.forEach((o) => objMap.set(o.id, o));

  const incomingEdges = edges.filter((e) => e.targetId === objId);
  const outgoingEdges = edges.filter((e) => e.sourceId === objId);

  const incoming = incomingEdges
    .map((e) => {
      const source = objMap.get(e.sourceId);
      return source ? { source, edge: e } : null;
    })
    .filter((item): item is { source: WherigoObject; edge: GraphEdge } => item !== null);

  const outgoing = outgoingEdges
    .map((e) => {
      const target = objMap.get(e.targetId);
      return target ? { target, edge: e } : null;
    })
    .filter((item): item is { target: WherigoObject; edge: GraphEdge } => item !== null);

  return {
    incoming,
    outgoing,
    isMultiReferenced: incoming.length > 1,
  };
}
