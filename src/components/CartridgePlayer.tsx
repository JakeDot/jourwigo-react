import React, { useState, useEffect } from 'react';
import { Cartridge, PlayerLocation, ZoneRuntimeState, LogMessage, WherigoObject } from '../types/wherigo';
import {
  calculateDistanceMeters,
  calculateBearing,
  parseZoneCoordinates,
  extractPropertyValue,
} from '../services/playerEngine';
import {
  Play,
  RotateCcw,
  Navigation,
  Compass,
  MapPin,
  Eye,
  Briefcase,
  CheckSquare,
  Terminal,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

interface CartridgePlayerProps {
  cartridge: Cartridge;
}

export const CartridgePlayer: React.FC<CartridgePlayerProps> = ({ cartridge }) => {
  const [running, setRunning] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'MAIN' | 'LOCATIONS' | 'YOU_SEE' | 'INVENTORY' | 'TASKS' | 'CONSOLE'>('MAIN');

  // GPS Location State
  const [playerLoc, setPlayerLoc] = useState<PlayerLocation>({
    latitude: cartridge.latitude || 0,
    longitude: cartridge.longitude || 0,
    altitude: cartridge.altitude || 0,
    accuracy: 5,
  });

  // Zones State
  const [zones, setZones] = useState<ZoneRuntimeState[]>([]);
  const [currentZoneId, setCurrentZoneId] = useState<string | null>(null);

  // Player Inventory
  const [playerInventory, setPlayerInventory] = useState<WherigoObject[]>([]);

  // Tasks State
  const [tasks, setTasks] = useState<{ id: string; name: string; description: string; complete: boolean; active: boolean }[]>([]);

  // Dialog & Input Modals
  const [activeDialog, setActiveDialog] = useState<{
    title: string;
    text: string;
    mediaName?: string;
    mediaUrl?: string;
    button1?: string;
    button2?: string;
    onButton1?: () => void;
    onButton2?: () => void;
  } | null>(null);

  const [activeInput, setActiveInput] = useState<{
    title: string;
    question: string;
    type: 'TEXT' | 'MULTIPLE_CHOICE';
    choices?: string[];
    onSubmit: (value: string) => void;
  } | null>(null);

  const [inputVal, setInputVal] = useState('');

  // Logs
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const addLog = (text: string, type: LogMessage['type'] = 'INFO') => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        timestamp: timeStr,
        type,
        text,
      },
    ]);
  };

  // Initialize or restart cartridge player
  const startCartridge = () => {
    setRunning(true);
    setPlayerInventory([]);

    // Initialize zones from cartridge objects
    const zoneObjs = cartridge.objects.filter((o) => o.template === 'Zone');
    const initialZones: ZoneRuntimeState[] = zoneObjs.map((zo) => {
      const coords = parseZoneCoordinates(zo, cartridge.latitude, cartridge.longitude);
      const name = extractPropertyValue(zo, 'Name', zo.varName);
      const desc = extractPropertyValue(zo, 'Description', '');
      const active = extractPropertyValue(zo, 'Active', 'true').toLowerCase() === 'true';
      const visible = extractPropertyValue(zo, 'Visible', 'true').toLowerCase() === 'true';

      const dist = calculateDistanceMeters(playerLoc.latitude, playerLoc.longitude, coords.lat, coords.lon);
      const bearing = calculateBearing(playerLoc.latitude, playerLoc.longitude, coords.lat, coords.lon);

      let state: ZoneRuntimeState['state'] = 'DISTANT';
      if (dist <= 25) state = 'INSIDE';
      else if (dist <= 100) state = 'PROXIMITY';

      return {
        id: zo.id,
        name,
        description: desc,
        latitude: coords.lat,
        longitude: coords.lon,
        distanceMeters: Math.round(dist),
        bearingDeg: Math.round(bearing),
        state,
        active,
        visible,
      };
    });

    setZones(initialZones);

    // Initialize tasks
    const taskObjs = cartridge.objects.filter((o) => o.template === 'Task');
    setTasks(
      taskObjs.map((to) => ({
        id: to.id,
        name: extractPropertyValue(to, 'Name', to.varName),
        description: extractPropertyValue(to, 'Description', ''),
        complete: extractPropertyValue(to, 'Complete', 'false') === 'true',
        active: extractPropertyValue(to, 'Active', 'true') === 'true',
      }))
    );

    addLog(`[Wherigo] Cartridge "${cartridge.name}" started.`, 'WHERIGO');
    addLog(`[Player] Initial location: lat=${playerLoc.latitude}, lon=${playerLoc.longitude}, alt=${playerLoc.altitude}m`, 'INFO');

    // Show initial welcome dialog
    setActiveDialog({
      title: cartridge.name,
      text: `Welcome to "${cartridge.name}"!\n\n${cartridge.description || 'Embark on your journey by exploring the simulated GPS zones.'}`,
      button1: 'Begin Quest',
      onButton1: () => {
        setActiveDialog(null);
        addLog('[Game] Quest started. Explore locations or interact with objects.', 'SUCCESS');
      },
    });
  };

  const stopCartridge = () => {
    setRunning(false);
    setActiveDialog(null);
    setActiveInput(null);
    addLog(`[Wherigo] Game stopped.`, 'WHERIGO');
  };

  // Recalculate zone distances and states whenever player location changes
  useEffect(() => {
    if (!running) return;

    setZones((prevZones) =>
      prevZones.map((z) => {
        const dist = calculateDistanceMeters(playerLoc.latitude, playerLoc.longitude, z.latitude, z.longitude);
        const bearing = calculateBearing(playerLoc.latitude, playerLoc.longitude, z.latitude, z.longitude);

        let newState: ZoneRuntimeState['state'] = 'DISTANT';
        if (dist <= 25) newState = 'INSIDE';
        else if (dist <= 100) newState = 'PROXIMITY';

        // Check if just entered a zone
        if (newState === 'INSIDE' && z.state !== 'INSIDE') {
          addLog(`[Zone] Entered zone "${z.name}"! (${Math.round(dist)}m)`, 'SUCCESS');
          setCurrentZoneId(z.id);

          // Trigger zone welcome dialog
          setActiveDialog({
            title: `Entered: ${z.name}`,
            text: `${z.description || `You have arrived at ${z.name}. Look around to see what characters and items are nearby.`}`,
            button1: 'Explore Zone',
            onButton1: () => setActiveDialog(null),
          });
        } else if (newState !== 'INSIDE' && z.state === 'INSIDE') {
          addLog(`[Zone] Exited zone "${z.name}".`, 'INFO');
          if (currentZoneId === z.id) {
            setCurrentZoneId(null);
          }
        }

        return {
          ...z,
          distanceMeters: Math.round(dist),
          bearingDeg: Math.round(bearing),
          state: newState,
        };
      })
    );
  }, [playerLoc.latitude, playerLoc.longitude, running]);

  // Directional step movement in meters
  const movePlayerByMeters = (dNorth: number, dEast: number) => {
    const latDelta = dNorth / 111139; // ~111,139 meters per degree of latitude
    const lonDelta = dEast / (111139 * Math.cos((playerLoc.latitude * Math.PI) / 180));

    const newLat = parseFloat((playerLoc.latitude + latDelta).toFixed(6));
    const newLon = parseFloat((playerLoc.longitude + lonDelta).toFixed(6));

    setPlayerLoc((prev) => ({
      ...prev,
      latitude: newLat,
      longitude: newLon,
    }));

    addLog(`[GPS] Walked to lat=${newLat}, lon=${newLon}`, 'DEBUG');
  };

  // Teleport to Zone
  const teleportToZone = (z: ZoneRuntimeState) => {
    setPlayerLoc((prev) => ({
      ...prev,
      latitude: z.latitude,
      longitude: z.longitude,
    }));
    addLog(`[GPS] Teleported directly to zone "${z.name}"`, 'INFO');
  };

  // Objects visible in current location or current zone
  const visibleObjectsInZone = cartridge.objects.filter((o) => {
    if (o.template === 'Zone' || o.template === 'Cartridge') return false;
    // If inside a zone, objects whose parent is that zone
    if (currentZoneId && o.parentId === currentZoneId) {
      // not in player inventory
      return !playerInventory.some((inv) => inv.id === o.id);
    }
    // If not in a zone, show top-level items that are active and visible
    if (!currentZoneId && !o.parentId) {
      return !playerInventory.some((inv) => inv.id === o.id);
    }
    return false;
  });

  // Action: Take item into inventory
  const handleTakeItem = (item: WherigoObject) => {
    setPlayerInventory((prev) => [...prev, item]);
    const name = extractPropertyValue(item, 'Name', item.varName);
    addLog(`[Inventory] Picked up item: "${name}"`, 'SUCCESS');
  };

  // Action: Drop item from inventory
  const handleDropItem = (item: WherigoObject) => {
    setPlayerInventory((prev) => prev.filter((i) => i.id !== item.id));
    const name = extractPropertyValue(item, 'Name', item.varName);
    addLog(`[Inventory] Dropped item: "${name}" into current area`, 'INFO');
  };

  // Action: Examine item or character
  const handleExamine = (obj: WherigoObject) => {
    const name = extractPropertyValue(obj, 'Name', obj.varName);
    const desc = extractPropertyValue(obj, 'Description', 'You observe nothing unusual.');
    setActiveDialog({
      title: `Examine: ${name}`,
      text: desc,
      button1: 'Close',
      onButton1: () => setActiveDialog(null),
    });
    addLog(`[Command] Examined "${name}"`, 'INFO');
  };

  // Action: Talk to Character
  const handleTalk = (npc: WherigoObject) => {
    const name = extractPropertyValue(npc, 'Name', npc.varName);
    const desc = extractPropertyValue(npc, 'Description', 'Greetings traveler!');
    setActiveDialog({
      title: `Talking to ${name}`,
      text: `"${desc}"\n\n${name} smiles and asks if you are looking for hidden geocache secrets.`,
      button1: 'Ask for Clues',
      button2: 'Say Goodbye',
      onButton1: () => {
        setActiveDialog({
          title: `${name}'s Clue`,
          text: `"Head towards the starting coordinates and examine any key items in your inventory!"`,
          button1: 'Thank you',
          onButton1: () => setActiveDialog(null),
        });
        addLog(`[Dialogue] ${name} shared a valuable clue!`, 'SUCCESS');
      },
      onButton2: () => {
        setActiveDialog(null);
        addLog(`[Dialogue] Concluded conversation with ${name}.`, 'INFO');
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Simulated GPS & Environment Controls */}
      <div className="lg:col-span-5 space-y-4">
        {/* GPS Control Panel */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Simulated GPS Controller</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {!running ? (
                <button
                  onClick={startCartridge}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Run
                </button>
              ) : (
                <button
                  onClick={stopCartridge}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Stop Run
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Simulated Latitude</label>
              <input
                type="number"
                step="0.00001"
                value={playerLoc.latitude}
                onChange={(e) =>
                  setPlayerLoc({ ...playerLoc, latitude: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Simulated Longitude</label>
              <input
                type="number"
                step="0.00001"
                value={playerLoc.longitude}
                onChange={(e) =>
                  setPlayerLoc({ ...playerLoc, longitude: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* D-Pad Walk Simulator */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="block text-[11px] font-bold text-slate-600 mb-2 text-center uppercase tracking-wider">
              Walk Simulation (Step by Meters)
            </span>
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => movePlayerByMeters(20, 0)}
                title="Walk North 20m"
                className="p-2 bg-white hover:bg-slate-100 rounded-md border border-slate-300 text-slate-700 shadow-2xs transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <ArrowUp className="w-4 h-4 text-blue-600" />
                <span>North (+20m)</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => movePlayerByMeters(0, -20)}
                  title="Walk West 20m"
                  className="p-2 bg-white hover:bg-slate-100 rounded-md border border-slate-300 text-slate-700 shadow-2xs transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  <ArrowLeft className="w-4 h-4 text-blue-600" />
                  <span>West (-20m)</span>
                </button>
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 font-bold text-xs">
                  GPS
                </div>
                <button
                  type="button"
                  onClick={() => movePlayerByMeters(0, 20)}
                  title="Walk East 20m"
                  className="p-2 bg-white hover:bg-slate-100 rounded-md border border-slate-300 text-slate-700 shadow-2xs transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  <span>East (+20m)</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => movePlayerByMeters(-20, 0)}
                title="Walk South 20m"
                className="p-2 bg-white hover:bg-slate-100 rounded-md border border-slate-300 text-slate-700 shadow-2xs transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <ArrowDown className="w-4 h-4 text-blue-600" />
                <span>South (-20m)</span>
              </button>
            </div>
          </div>

          {/* Quick Teleport to Zones */}
          {zones.length > 0 && (
            <div className="mt-3">
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                Quick Teleport to Cartridge Zone:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => teleportToZone(z)}
                    className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <MapPin className="w-3 h-3 text-red-500" />
                    <span>{z.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Console / Event Log Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-700">Wherigo Console Output</h3>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
            >
              Clear Log
            </button>
          </div>
          <div className="bg-slate-900 rounded-md p-3 text-xs font-mono max-h-48 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <span className="text-slate-500 italic">No events logged yet. Click 'Start Run'.</span>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="leading-tight">
                  <span className="text-slate-500 mr-1.5">[{l.timestamp}]</span>
                  <span
                    className={
                      l.type === 'SUCCESS'
                        ? 'text-emerald-400'
                        : l.type === 'WHERIGO'
                        ? 'text-blue-400 font-bold'
                        : l.type === 'ERROR'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }
                  >
                    {l.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Virtual Wherigo Device Screen */}
      <div className="lg:col-span-7">
        <div className="bg-slate-800 rounded-2xl p-4 shadow-lg border-4 border-slate-700 text-slate-900">
          {/* Virtual Screen Header */}
          <div className="bg-slate-900 text-white px-3 py-2 rounded-t-lg flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold truncate max-w-[200px]">{cartridge.name}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span>GPS: {playerLoc.accuracy}m</span>
              <span>🔋 95%</span>
            </div>
          </div>

          {/* Screen Content Container */}
          <div className="bg-slate-100 min-h-[460px] p-4 flex flex-col justify-between">
            {/* Screen Navigation Tabs */}
            <div className="grid grid-cols-5 gap-1 bg-slate-200 p-1 rounded-lg text-xs font-semibold mb-4">
              <button
                onClick={() => setCurrentScreen('MAIN')}
                className={`py-1.5 rounded text-center transition-all flex items-center justify-center gap-1 ${
                  currentScreen === 'MAIN' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Main</span>
              </button>
              <button
                onClick={() => setCurrentScreen('LOCATIONS')}
                className={`py-1.5 rounded text-center transition-all flex items-center justify-center gap-1 ${
                  currentScreen === 'LOCATIONS' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Zones ({zones.length})</span>
              </button>
              <button
                onClick={() => setCurrentScreen('YOU_SEE')}
                className={`py-1.5 rounded text-center transition-all flex items-center justify-center gap-1 ${
                  currentScreen === 'YOU_SEE' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>You See ({visibleObjectsInZone.length})</span>
              </button>
              <button
                onClick={() => setCurrentScreen('INVENTORY')}
                className={`py-1.5 rounded text-center transition-all flex items-center justify-center gap-1 ${
                  currentScreen === 'INVENTORY' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Inventory ({playerInventory.length})</span>
              </button>
              <button
                onClick={() => setCurrentScreen('TASKS')}
                className={`py-1.5 rounded text-center transition-all flex items-center justify-center gap-1 ${
                  currentScreen === 'TASKS' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Tasks ({tasks.length})</span>
              </button>
            </div>

            {/* SCREEN VIEW: MAIN */}
            {currentScreen === 'MAIN' && (
              <div className="flex-1 space-y-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs">
                  <h3 className="text-base font-bold text-slate-800 mb-1">{cartridge.name}</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    By {cartridge.author || 'Author'} • Version {cartridge.version || '1.0'}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed mb-4">
                    {cartridge.description || 'Welcome to this Wherigo cartridge adventure. Walk or teleport to the active zones to trigger story events.'}
                  </p>

                  <div className="p-3 bg-blue-50/70 rounded-md border border-blue-200 text-xs text-blue-900">
                    <span className="font-bold">Current Location State: </span>
                    {currentZoneId ? (
                      <span className="text-emerald-700 font-bold">
                        Inside Zone "{zones.find((z) => z.id === currentZoneId)?.name}"
                      </span>
                    ) : (
                      <span className="text-slate-600">In open transit between zones</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCurrentScreen('LOCATIONS')}
                    className="p-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="block text-xs font-bold text-slate-800">Locations Radar</span>
                      <span className="text-[11px] text-slate-500">{zones.length} active zones</span>
                    </div>
                    <Compass className="w-5 h-5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => setCurrentScreen('YOU_SEE')}
                    className="p-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="block text-xs font-bold text-slate-800">You See Nearby</span>
                      <span className="text-[11px] text-slate-500">{visibleObjectsInZone.length} visible targets</span>
                    </div>
                    <Eye className="w-5 h-5 text-emerald-600" />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN VIEW: LOCATIONS */}
            {currentScreen === 'LOCATIONS' && (
              <div className="flex-1 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Active Zones &amp; Proximity Radar
                </h4>
                {zones.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 italic bg-white rounded-lg border border-slate-200">
                    No Zones defined in this cartridge yet. Create one in the Cartridge Editor!
                  </div>
                ) : (
                  zones.map((z) => (
                    <div
                      key={z.id}
                      className={`p-3.5 rounded-lg border transition-all bg-white flex items-center justify-between ${
                        z.state === 'INSIDE'
                          ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-400'
                          : z.state === 'PROXIMITY'
                          ? 'border-amber-400 bg-amber-50/40'
                          : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{z.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              z.state === 'INSIDE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : z.state === 'PROXIMITY'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {z.state}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{z.description || 'Zone description'}</p>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <span className="block text-sm font-bold text-slate-800">
                          {z.distanceMeters} m
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                          <Compass className="w-3 h-3 text-blue-600" />
                          {z.bearingDeg}°
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SCREEN VIEW: YOU SEE */}
            {currentScreen === 'YOU_SEE' && (
              <div className="flex-1 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Things Nearby in this Location
                </h4>
                {visibleObjectsInZone.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 italic bg-white rounded-lg border border-slate-200">
                    {currentZoneId
                      ? 'No items or characters visible in this zone.'
                      : 'Move inside a zone to discover nearby characters and items.'}
                  </div>
                ) : (
                  visibleObjectsInZone.map((obj) => {
                    const name = extractPropertyValue(obj, 'Name', obj.varName);
                    const desc = extractPropertyValue(obj, 'Description', '');
                    const isCharacter = obj.template === 'Character';

                    return (
                      <div
                        key={obj.id}
                        className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{isCharacter ? '👤' : '🗝️'}</span>
                            <span className="text-xs font-bold text-slate-800">{name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                              {obj.template}
                            </span>
                          </div>
                          {desc && <p className="text-xs text-slate-500 mt-1">{desc}</p>}
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                          <button
                            type="button"
                            onClick={() => handleExamine(obj)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                          >
                            Examine
                          </button>
                          {isCharacter ? (
                            <button
                              type="button"
                              onClick={() => handleTalk(obj)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Talk
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTakeItem(obj)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Take
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SCREEN VIEW: INVENTORY */}
            {currentScreen === 'INVENTORY' && (
              <div className="flex-1 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Player Inventory ({playerInventory.length} items)
                </h4>
                {playerInventory.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 italic bg-white rounded-lg border border-slate-200">
                    Your inventory is currently empty. Explore zones to find and collect items!
                  </div>
                ) : (
                  playerInventory.map((item) => {
                    const name = extractPropertyValue(item, 'Name', item.varName);
                    const desc = extractPropertyValue(item, 'Description', '');

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🎒</span>
                            <span className="text-xs font-bold text-slate-800">{name}</span>
                          </div>
                          {desc && <p className="text-xs text-slate-500 mt-1">{desc}</p>}
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                          <button
                            type="button"
                            onClick={() => handleExamine(item)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                          >
                            Examine
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDropItem(item)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 hover:bg-rose-50 text-rose-700"
                          >
                            Drop
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SCREEN VIEW: TASKS */}
            {currentScreen === 'TASKS' && (
              <div className="flex-1 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Quest Tasks &amp; Objectives
                </h4>
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 italic bg-white rounded-lg border border-slate-200">
                    No active tasks registered.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => {
                            setTasks((prev) =>
                              prev.map((t) => (t.id === task.id ? { ...t, complete: !t.complete } : t))
                            );
                            addLog(`[Task] Toggled completion for "${task.name}"`, 'INFO');
                          }}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            task.complete
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {task.complete && <Check className="w-3 h-3" />}
                        </button>
                        <div>
                          <span
                            className={`text-xs font-bold ${
                              task.complete ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {task.name}
                          </span>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wherigo Dialog Box Modal */}
      {activeDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">{activeDialog.title}</h3>
              <button
                onClick={() => setActiveDialog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {activeDialog.text}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {activeDialog.button2 && (
                <button
                  type="button"
                  onClick={activeDialog.onButton2}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                >
                  {activeDialog.button2}
                </button>
              )}
              {activeDialog.button1 && (
                <button
                  type="button"
                  onClick={activeDialog.onButton1}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  {activeDialog.button1}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wherigo Input Prompt Modal */}
      {activeInput && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">{activeInput.title}</h3>
            <p className="text-xs text-slate-700">{activeInput.question}</p>

            {activeInput.type === 'MULTIPLE_CHOICE' && activeInput.choices ? (
              <div className="space-y-1.5">
                {activeInput.choices.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => {
                      activeInput.onSubmit(choice);
                      setActiveInput(null);
                    }}
                    className="w-full text-left p-2.5 text-xs rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                  placeholder="Enter response..."
                />
                <button
                  onClick={() => {
                    activeInput.onSubmit(inputVal);
                    setActiveInput(null);
                    setInputVal('');
                  }}
                  className="w-full py-1.5 bg-blue-600 text-white rounded text-xs font-semibold"
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
