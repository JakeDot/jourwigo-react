export type PropertyType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'EXPRESSION';

export interface LuaProperty {
  k: string;
  v: string;
  t: PropertyType;
}

export type ObjectTemplate =
  | 'Zone'
  | 'Character'
  | 'Item'
  | 'Cartridge'
  | 'Task'
  | 'Timer'
  | 'Media'
  | 'Media (Image)'
  | 'Media (Audio)'
  | 'Media (Video)'
  | 'Media (Text)'
  | 'Input'
  | 'Command'
  | 'ZonePoint'
  | 'Branching Dialog'
  | 'Variable'
  | 'Custom Object';

export type RelationType =
  | 'CONTAINS'
  | 'USES_MEDIA'
  | 'USES_ICON'
  | 'ATTACHED_COMMAND'
  | 'TARGETS'
  | 'REFERENCES';

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  label?: string;
}

export interface WherigoObject {
  id: string;
  template: ObjectTemplate;
  varName: string;
  constructor: string;
  parentId: string | null;
  props: LuaProperty[];
  // Explicit graph connections in addition to inferred property references
  relations?: {
    targetId: string;
    relationType: RelationType;
    label?: string;
  }[];
  mediaData?: {
    filename?: string;
    category?: 'Image' | 'Audio' | 'Video' | 'Text' | 'Other';
    url?: string;
    text?: string;
    size?: number;
  };
}

export interface Cartridge {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  latitude: number;
  longitude: number;
  altitude: number;
  objects: WherigoObject[];
}

export type QuestionType = 'YES_NO' | 'MULTIPLE_CHOICE' | 'FREE_TEXT';

export interface DialogFrame {
  id: string;
  text: string;
  mediaVar?: string;
}

export interface DialogBranch {
  choice: string;
  followUpText: string;
  mediaVar?: string;
}

export interface BranchingDialogConfig {
  sequenceName: string;
  initialFrames: DialogFrame[];
  question: {
    text: string;
    mediaVar: string;
    type: QuestionType;
    choices: string[];
    resultVariable: string;
  };
  branches: DialogBranch[];
  recording?: {
    enabled: boolean;
    type: 'SNAP_PHOTO' | 'PICK_FILE' | 'RECORD_VIDEO' | 'SCAN_BARCODE';
    text: string;
    resultMediaVar: string;
  };
  mergedTarget: {
    text: string;
    mediaVar: string;
  };
}

export interface PlayerLocation {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
}

export interface ZoneRuntimeState {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  bearingDeg: number;
  state: 'INSIDE' | 'PROXIMITY' | 'DISTANT';
  active: boolean;
  visible: boolean;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG' | 'WHERIGO';
  text: string;
}
