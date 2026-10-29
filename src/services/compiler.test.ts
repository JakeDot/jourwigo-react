import {
  generateCartridgeLuaScript,
  getSortedObjects,
  processObjectsForLua,
  isMediaObject,
} from './compiler';
import { Cartridge, WherigoObject, PropertyType } from '../types/wherigo';

// Simple assertion helper for standalone test execution
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runCompilerTests() {
  console.log('Running compiler unit tests...\n');

  // Test 1: Media Object Hoisting
  {
    console.log('Test 1: Media Object Hoisting...');
    const mediaObj: WherigoObject = {
      id: 'media_1',
      template: 'Media (Image)',
      varName: 'mediaImage1',
      constructor: 'Wherigo.ZMedia(Cartridge)',
      parentId: null,
      props: [{ k: 'Filename', v: 'pic.png', t: 'STRING' as PropertyType }],
    };

    const zoneObj: WherigoObject = {
      id: 'zone_1',
      template: 'Zone',
      varName: 'zone1',
      constructor: 'Wherigo.Zone(Cartridge)',
      parentId: null,
      props: [
        { k: 'Name', v: 'Test Zone', t: 'STRING' as PropertyType },
        { k: 'Media', v: 'mediaImage1', t: 'EXPRESSION' as PropertyType },
      ],
    };

    // Input: zoneObj before mediaObj
    const objects = [zoneObj, mediaObj];
    const sorted = getSortedObjects(objects);

    const mediaIdx = sorted.findIndex((o) => o.id === 'media_1');
    const zoneIdx = sorted.findIndex((o) => o.id === 'zone_1');

    assert(mediaIdx < zoneIdx, 'Media object must be hoisted before zone referencing it');

    const cart: Cartridge = {
      id: 'c1',
      name: 'Test Cartridge',
      author: 'Author',
      version: '1.0',
      description: 'Desc',
      latitude: 0,
      longitude: 0,
      altitude: 0,
      objects,
    };

    const lua = generateCartridgeLuaScript(cart);
    const mediaInstPos = lua.indexOf('mediaImage1 = Wherigo.ZMedia(Cartridge)');
    const zoneMediaPropPos = lua.indexOf('zone1.Media = mediaImage1');

    assert(mediaInstPos !== -1, 'mediaImage1 instantiation found');
    assert(zoneMediaPropPos !== -1, 'zone1.Media assignment found');
    assert(
      mediaInstPos < zoneMediaPropPos,
      'mediaImage1 must be defined into global environment before zone1.Media uses it'
    );
    console.log('  -> PASSED!');
  }

  // Test 2: Container Hierarchy Sorting
  {
    console.log('\nTest 2: Container Hierarchy Sorting...');
    const parentZone: WherigoObject = {
      id: 'parent_zone',
      template: 'Zone',
      varName: 'zoneCastle',
      constructor: 'Wherigo.Zone(Cartridge)',
      parentId: null,
      props: [{ k: 'Name', v: 'Castle', t: 'STRING' as PropertyType }],
    };

    const childItem: WherigoObject = {
      id: 'child_item',
      template: 'Item',
      varName: 'itemCrown',
      constructor: 'Wherigo.ZItem(Cartridge)',
      parentId: 'parent_zone',
      props: [
        { k: 'Name', v: 'Crown', t: 'STRING' as PropertyType },
        { k: 'Container', v: 'zoneCastle', t: 'EXPRESSION' as PropertyType },
      ],
    };

    // Input: child before parent
    const sorted = getSortedObjects([childItem, parentZone]);
    const parentIdx = sorted.findIndex((o) => o.id === 'parent_zone');
    const childIdx = sorted.findIndex((o) => o.id === 'child_item');

    assert(parentIdx < childIdx, 'Parent zone must be defined before child item');
    console.log('  -> PASSED!');
  }

  // Test 3: Property Expression Dependency Resolution
  {
    console.log('\nTest 3: Property Expression Dependency Resolution...');
    const targetObj: WherigoObject = {
      id: 'obj_b',
      template: 'Custom Object',
      varName: 'varTargetB',
      constructor: '{}',
      parentId: null,
      props: [{ k: 'Value', v: '100', t: 'NUMBER' as PropertyType }],
    };

    const sourceObj: WherigoObject = {
      id: 'obj_a',
      template: 'Custom Object',
      varName: 'varSourceA',
      constructor: '{}',
      parentId: null,
      props: [{ k: 'RefProp', v: 'varTargetB', t: 'EXPRESSION' as PropertyType }],
    };

    const sorted = getSortedObjects([sourceObj, targetObj]);
    const bIdx = sorted.findIndex((o) => o.id === 'obj_b');
    const aIdx = sorted.findIndex((o) => o.id === 'obj_a');

    assert(bIdx < aIdx, 'Target referenced in expression property must be defined before source');
    console.log('  -> PASSED!');
  }

  // Test 4: Circular Dependency Cycle Resolution
  {
    console.log('\nTest 4: Circular Dependency Cycle Resolution...');
    const objA: WherigoObject = {
      id: 'node_a',
      template: 'Item',
      varName: 'itemA',
      constructor: 'Wherigo.ZItem(Cartridge)',
      parentId: null,
      props: [{ k: 'LinkToB', v: 'itemB', t: 'EXPRESSION' as PropertyType }],
    };

    const objB: WherigoObject = {
      id: 'node_b',
      template: 'Item',
      varName: 'itemB',
      constructor: 'Wherigo.ZItem(Cartridge)',
      parentId: null,
      props: [{ k: 'LinkToA', v: 'itemA', t: 'EXPRESSION' as PropertyType }],
    };

    const processed = processObjectsForLua([objA, objB]);
    assert(processed.orderedObjects.length === 2, 'All objects in cycle must be instantiated');

    const cart: Cartridge = {
      id: 'c_cycle',
      name: 'Cycle Cartridge',
      author: 'Author',
      version: '1.0',
      description: 'Desc',
      latitude: 0,
      longitude: 0,
      altitude: 0,
      objects: [objA, objB],
    };

    const lua = generateCartridgeLuaScript(cart);

    assert(
      lua.includes('-- Resolved Circular Dependencies'),
      'Script must contain Resolved Circular Dependencies section'
    );

    const itemAInst = lua.indexOf('itemA = Wherigo.ZItem(Cartridge)');
    const itemBInst = lua.indexOf('itemB = Wherigo.ZItem(Cartridge)');
    const deferredSec = lua.indexOf('-- Resolved Circular Dependencies');

    assert(itemAInst !== -1 && itemBInst !== -1, 'Both objects instantiated');
    assert(
      deferredSec > itemAInst && deferredSec > itemBInst,
      'Deferred circular property assignment must occur AFTER both objects are instantiated'
    );
    console.log('  -> PASSED!');
  }

  console.log('\nAll compiler unit tests passed successfully!');
}

// Execute tests if run directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('compiler.test.ts')) {
  runCompilerTests();
}
