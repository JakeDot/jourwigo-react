import { ObjectTemplate, LuaProperty } from '../types/wherigo';

export interface TemplateDefinition {
  varName: string;
  constructor: string;
  icon: string;
  props: LuaProperty[];
  description: string;
}

export const TEMPLATES: Record<ObjectTemplate, TemplateDefinition> = {
  Zone: {
    varName: 'zoneStart',
    constructor: 'Wherigo.Zone(Cartridge)',
    icon: '📦',
    description: 'A geographic zone with polygon or center coordinates, triggers enter/exit events.',
    props: [
      { k: 'Name', v: 'Start Zone', t: 'STRING' },
      { k: 'Description', v: 'A starting zone.', t: 'STRING' },
      { k: 'Visible', v: 'true', t: 'BOOLEAN' },
      { k: 'Active', v: 'true', t: 'BOOLEAN' },
      { k: 'DistanceRange', v: '100', t: 'NUMBER' },
      { k: 'ProximityRange', v: '25', t: 'NUMBER' },
      { k: 'Points', v: '{\n    Wherigo.ZonePoint(0.0, 0.0, 0.0)\n}', t: 'EXPRESSION' },
    ],
  },
  Character: {
    varName: 'characterGuide',
    constructor: 'Wherigo.ZCharacter(Cartridge)',
    icon: '👤',
    description: 'An NPC or person who can talk, give items, and offer dialogues.',
    props: [
      { k: 'Name', v: 'Guide NPC', t: 'STRING' },
      { k: 'Description', v: 'A friendly guide character.', t: 'STRING' },
      { k: 'Gender', v: 'Male', t: 'STRING' },
      { k: 'Visible', v: 'true', t: 'BOOLEAN' },
    ],
  },
  Item: {
    varName: 'itemKey',
    constructor: 'Wherigo.ZItem(Cartridge)',
    icon: '🗝️',
    description: 'An item that can be placed in zones, characters, or picked up into player inventory.',
    props: [
      { k: 'Name', v: 'Golden Key', t: 'STRING' },
      { k: 'Description', v: 'A shiny antique key.', t: 'STRING' },
      { k: 'Visible', v: 'true', t: 'BOOLEAN' },
    ],
  },
  Cartridge: {
    varName: 'cartridge',
    constructor: 'Wherigo.ZCartridge()',
    icon: '🎮',
    description: 'Top-level cartridge descriptor containing game metadata.',
    props: [
      { k: 'Name', v: 'New Cartridge', t: 'STRING' },
      { k: 'Description', v: 'Cartridge description', t: 'STRING' },
      { k: 'Author', v: 'Author', t: 'STRING' },
      { k: 'Version', v: '1.0', t: 'STRING' },
      { k: 'Activity', v: 'TourGuide', t: 'STRING' },
    ],
  },
  Task: {
    varName: 'taskQuest',
    constructor: 'Wherigo.ZTask(Cartridge)',
    icon: '🎯',
    description: 'A quest, objective, or task shown in the player Task list.',
    props: [
      { k: 'Name', v: 'Task Quest', t: 'STRING' },
      { k: 'Description', v: 'Task description and objectives', t: 'STRING' },
      { k: 'Active', v: 'true', t: 'BOOLEAN' },
      { k: 'Complete', v: 'false', t: 'BOOLEAN' },
    ],
  },
  Timer: {
    varName: 'timerCountdown',
    constructor: 'Wherigo.ZTimer(Cartridge)',
    icon: '⏱️',
    description: 'Countdown or interval timer triggering on-tick or on-elapse events.',
    props: [
      { k: 'Name', v: 'Test Timer', t: 'STRING' },
      { k: 'Type', v: 'Countdown', t: 'STRING' },
      { k: 'Duration', v: '10', t: 'NUMBER' },
    ],
  },
  Media: {
    varName: 'mediaInfo',
    constructor: 'Wherigo.ZMedia(Cartridge)',
    icon: '🖼️',
    description: 'Generic media resource for sounds, images, or texts.',
    props: [
      { k: 'Name', v: 'Sample Media', t: 'STRING' },
      { k: 'Filename', v: 'sample.mp3', t: 'STRING' },
      { k: 'Type', v: 'mp3', t: 'STRING' },
      { k: 'AltText', v: 'Audio description', t: 'STRING' },
    ],
  },
  'Media (Image)': {
    varName: 'mediaImage',
    constructor: 'Wherigo.ZMedia(Cartridge)',
    icon: '🖼️',
    description: 'Image asset shown in dialogs, zones, or item inspection.',
    props: [
      { k: 'Name', v: 'Image Media', t: 'STRING' },
      { k: 'Filename', v: 'sample.png', t: 'STRING' },
      { k: 'Type', v: 'png', t: 'STRING' },
      { k: 'AltText', v: 'Image description', t: 'STRING' },
      { k: 'Category', v: 'Image', t: 'STRING' },
    ],
  },
  'Media (Audio)': {
    varName: 'mediaAudio',
    constructor: 'Wherigo.ZMedia(Cartridge)',
    icon: '🎵',
    description: 'Audio sound effect or voice narration.',
    props: [
      { k: 'Name', v: 'Audio Media', t: 'STRING' },
      { k: 'Filename', v: 'sample.mp3', t: 'STRING' },
      { k: 'Type', v: 'mp3', t: 'STRING' },
      { k: 'AltText', v: 'Audio description', t: 'STRING' },
      { k: 'Category', v: 'Audio', t: 'STRING' },
    ],
  },
  'Media (Video)': {
    varName: 'mediaVideo',
    constructor: 'Wherigo.ZMedia(Cartridge)',
    icon: '🎥',
    description: 'Video clip resource for rich cutscenes.',
    props: [
      { k: 'Name', v: 'Video Media', t: 'STRING' },
      { k: 'Filename', v: 'sample.mp4', t: 'STRING' },
      { k: 'Type', v: 'mp4', t: 'STRING' },
      { k: 'AltText', v: 'Video description', t: 'STRING' },
      { k: 'Category', v: 'Video', t: 'STRING' },
    ],
  },
  'Media (Text)': {
    varName: 'mediaText',
    constructor: 'Wherigo.ZMedia(Cartridge)',
    icon: '📝',
    description: 'Rich text content media loaded from files or text strings.',
    props: [
      { k: 'Name', v: 'Text Media', t: 'STRING' },
      { k: 'Filename', v: 'sample.txt', t: 'STRING' },
      { k: 'Type', v: 'txt', t: 'STRING' },
      { k: 'AltText', v: 'Text description', t: 'STRING' },
      { k: 'Text', v: 'Sample text content', t: 'STRING' },
      { k: 'Category', v: 'Text', t: 'STRING' },
    ],
  },
  Input: {
    varName: 'inputPrompt',
    constructor: 'Wherigo.ZInput(Cartridge)',
    icon: '💬',
    description: 'Player input question dialog (text or multiple choices).',
    props: [
      { k: 'Name', v: 'Passcode Prompt', t: 'STRING' },
      { k: 'Question', v: 'Enter passcode:', t: 'STRING' },
      { k: 'InputType', v: 'Text', t: 'STRING' },
    ],
  },
  Command: {
    varName: 'cmdExamine',
    constructor: 'Wherigo.ZCommand(Cartridge)',
    icon: '⚡',
    description: 'Custom command or verb attached to items or characters (e.g. Examine, Open, Talk).',
    props: [
      { k: 'Name', v: 'Examine', t: 'STRING' },
      { k: 'Text', v: 'Examine object', t: 'STRING' },
      { k: 'Enabled', v: 'true', t: 'BOOLEAN' },
    ],
  },
  ZonePoint: {
    varName: 'zonePoint',
    constructor: 'Wherigo.ZonePoint(0.0, 0.0, 0.0)',
    icon: '📍',
    description: 'GPS coordinate point for zones or starting location.',
    props: [],
  },
  'Branching Dialog': {
    varName: 'dialogBranchingDemo',
    constructor: '-- Branching & Merging Dialogue',
    icon: '💬',
    description: 'Urwigo-style multi-frame dialogue with branching choices and merging paths.',
    props: [
      {
        k: 'Code',
        v: `dialogBranchingDemo = function()
    local step_1, step_2, step_3, step_4, step_5, step_6, step_7

    step_1 = function()
        Wherigo.MessageBox({ Text = "Welcome traveler! You have arrived at the mystical ancient ruins.", Media = mediaIntro, Callback = function() step_2() end })
    end
    step_2 = function()
        Wherigo.MessageBox({ Text = "Legend speaks of a hidden treasure buried beneath these stones.", Media = mediaRuins, Callback = function() step_3() end })
    end
    step_3 = function()
        Wherigo.MessageBox({ Text = "Beware, for ancient guardians still watch over this sanctuary.", Media = mediaGuardian, Callback = function() step_4() end })
    end
    step_4 = function()
        Wherigo.MessageBox({ Text = "Do you wish to enter the ruins and search for the treasure?", Media = mediaQuestion, Buttons = {"Yes", "No"}, Callback = function(action)
            if action == "Button1" then varRuinsAccepted = "Yes"; step_5()
            else varRuinsAccepted = "No"; step_6()
            end
        end })
    end
    step_5 = function()
        Wherigo.MessageBox({ Text = "You step bravely into the shadows of the ruin...", Media = mediaEnter, Callback = function() step_7() end })
    end
    step_6 = function()
        Wherigo.MessageBox({ Text = "You decide to stay safe and turn back.", Media = mediaTurnBack, Callback = function() step_7() end })
    end
    step_7 = function()
        Wherigo.MessageBox({ Text = "Regardless of choice, your journey continues to the town square.", Media = mediaTown })
    end

    step_1()
end`,
        t: 'EXPRESSION',
      },
    ],
  },
  Variable: {
    varName: 'varState',
    constructor: '""',
    icon: '🔢',
    description: 'Global cartridge state variable for saving player progress or choice results.',
    props: [{ k: 'Value', v: 'default_value', t: 'STRING' }],
  },
  'Custom Object': {
    varName: 'customObj',
    constructor: '{}',
    icon: '⚙️',
    description: 'Arbitrary custom Lua table or object instance.',
    props: [],
  },
};
