import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTelemetry } from '../stores/useTelemetry';

// Civilization color palette
const CIV_COLORS: Record<string, string> = {
  civ_a: '#6C8BC4',
  civ_b: '#8470A5',
};
const CIV_TERRITORY_FILL: Record<string, string> = {
  civ_a: 'rgba(108,139,196,0.12)',
  civ_b: 'rgba(132,112,165,0.12)',
};
const CIV_TERRITORY_STROKE: Record<string, string> = {
  civ_a: 'rgba(108,139,196,0.5)',
  civ_b: 'rgba(132,112,165,0.5)',
};
const STATE_COLORS: Record<string, string> = {
  ATTACK: '#FF4444',
  FARM: '#7DBB5A',
  BUILD: '#C49A53',
  COMMUNICATE: '#5AB8C4',
  GATHER: '#D4A44C',
  TRADE: '#A8D48A',
  INVENT_BELIEF: '#C084FC',
  EAT: '#FB923C',
};

export default function CanvasGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const agents = useTelemetry((state) => state.agents);
  const cpr = useTelemetry((state) => state.cpr);
  const world_map = useTelemetry((state) => state.world_map);
  const focusedAgent = useTelemetry((state) => state.focusedAgent);
  const setFocusedAgent = useTelemetry((state) => state.setFocusedAgent);

  // Interaction State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredAgent, setHoveredAgent] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{
    type: 'agent' | 'tile';
    x: number;
    y: number;
    mapX: number;
    mapY: number;
    agent?: any;
  } | null>(null);

  // God Mode Feedback Toast
  const [toast, setToast] = useState<{ message: string; color: string; x: number; y: number } | null>(null);

  const showToast = (message: string, color: string, x: number, y: number) => {
    setToast({ message, color, x, y });
    setTimeout(() => setToast(null), 2500);
  };

  // Animation & Physics Refs
  const agentsLerpRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const targetScaleRef = useRef<number | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Sync refs for the RAF loop
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      // Set the internal drawing buffer to match the actual display size
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };

    // Initial resize
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle focused agent panning
  useEffect(() => {
    if (!focusedAgent || !canvasRef.current) return;
    const agent = agents.find(a => a.id === focusedAgent);
    if (!agent) {
      setFocusedAgent(null);
      return;
    }

    const canvas = canvasRef.current;
    const cellSize = 20;
    const p = agentsLerpRef.current.get(agent.id) || { x: agent.loc[0], y: agent.loc[1] };

    const targetX = p.x * cellSize + cellSize / 2;
    const targetY = p.y * cellSize + cellSize / 2;

    const newOffsetX = (canvas.width / 2) - targetX * scale;
    const newOffsetY = (canvas.height / 2) - targetY * scale;

    setOffset({ x: newOffsetX, y: newOffsetY });
    setFocusedAgent(null); // Clear so we don't lock the camera
  }, [focusedAgent, agents, scale, setFocusedAgent]);

  const trackedAgentId = useTelemetry((state) => state.trackedAgentId);
  useEffect(() => {
    if (trackedAgentId) {
      targetScaleRef.current = 2.0;
    } else {
      targetScaleRef.current = null;
    }
  }, [trackedAgentId]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Handle Auto Zoom
      if (targetScaleRef.current !== null) {
        setScale(prev => {
          const diff = targetScaleRef.current! - prev;
          if (Math.abs(diff) < 0.005) {
            targetScaleRef.current = null;
            return prev;
          }
          return prev + diff * 0.05;
        });
      }

      // 1. Momentum Physics & Agent Tracking
      const currentTrackedId = useTelemetry.getState().trackedAgentId;
      if (currentTrackedId && !isDraggingRef.current) {
        const p = agentsLerpRef.current.get(currentTrackedId);
        if (p) {
          const cellSize = 20;
          const targetX = p.x * cellSize + cellSize / 2;
          const targetY = p.y * cellSize + cellSize / 2;
          const newOffsetX = (canvas.width / 2) - targetX * scaleRef.current;
          const newOffsetY = (canvas.height / 2) - targetY * scaleRef.current;
          // Smooth pan to target
          setOffset(prev => ({
            x: prev.x + (newOffsetX - prev.x) * 0.1,
            y: prev.y + (newOffsetY - prev.y) * 0.1
          }));
        }
      } else if (!isDraggingRef.current) {
        if (Math.abs(velocityRef.current.x) > 0.05 || Math.abs(velocityRef.current.y) > 0.05) {
          setOffset(prev => ({
            x: prev.x + velocityRef.current.x,
            y: prev.y + velocityRef.current.y
          }));
          velocityRef.current.x *= 0.85; // Friction
          velocityRef.current.y *= 0.85;
        }
      }

      const currScale = scaleRef.current;
      const currOffset = offsetRef.current;

      // 2. Clear & Dynamic Background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
      grad.addColorStop(0, '#1A1A18');
      grad.addColorStop(1, '#0C0C0B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(currOffset.x, currOffset.y);
      ctx.scale(currScale, currScale);

      const cellSize = 20;

      // 3. Viewport Culling calculations
      const viewStartX = (-currOffset.x / currScale) / cellSize;
      const viewStartY = (-currOffset.y / currScale) / cellSize;
      const viewEndX = viewStartX + (canvas.width / currScale) / cellSize;
      const viewEndY = viewStartY + (canvas.height / currScale) / cellSize;

      const minCol = Math.floor(viewStartX);
      const maxCol = Math.ceil(viewEndX);
      const minRow = Math.floor(viewStartY);
      const maxRow = Math.ceil(viewEndY);

      // ── Draw Terrain ───────────────────────────────────────────────────────
      if (world_map && world_map.length > 0) {
        const mapHeight = world_map.length;
        const mapWidth = world_map[0].length;

        const startY = Math.max(0, minRow);
        const endY = Math.min(mapHeight - 1, maxRow);
        const startX = Math.max(0, minCol);
        const endX = Math.min(mapWidth - 1, maxCol);

        // 0: Deep Water, 1: Shallow Water, 2: Sand, 3: Grass, 4: Forest, 5: Mountain
        const TERRAIN_COLORS = [
          '#1C3D5A', // Deep Water
          '#2C5282', // Shallow Water
          '#C2B280', // Sand
          '#38A169', // Grass
          '#22543D', // Forest
          '#4A5568', // Mountain
        ];

        for (let y = startY; y <= endY; y++) {
          if (!world_map[y]) continue;
          for (let x = startX; x <= endX; x++) {
            const tile = world_map[y][x];
            if (tile === undefined) continue;
            ctx.fillStyle = TERRAIN_COLORS[tile] || 'rgba(0,0,0,0)';
            ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5); // +0.5 to prevent sub-pixel gaps
          }
        }
      }

      // ── Territory zones ────────────────────────────────────────────────
      const territory: Record<string, string> = cpr?.territory ?? {};
      const ZONE_SIZE = 10;
      Object.entries(territory).forEach(([zone, civId]) => {
        const parts = zone.split('_'); // zone_zx_zy
        const zx = parseInt(parts[1]);
        const zy = parseInt(parts[2]);

        // Cull off-screen territory
        if (zx * ZONE_SIZE > maxCol || (zx + 1) * ZONE_SIZE < minCol || zy * ZONE_SIZE > maxRow || (zy + 1) * ZONE_SIZE < minRow) return;

        const px = zx * ZONE_SIZE * cellSize;
        const py = zy * ZONE_SIZE * cellSize;
        const size = ZONE_SIZE * cellSize;

        ctx.fillStyle = CIV_TERRITORY_FILL[civId] ?? 'rgba(255,255,255,0.05)';
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = CIV_TERRITORY_STROKE[civId] ?? 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, size, size);
      });

      // ── Grid (Culled) ───────────────────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(43,42,38,0.5)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let i = minCol; i <= maxCol; i++) {
        ctx.moveTo(i * cellSize, minRow * cellSize);
        ctx.lineTo(i * cellSize, maxRow * cellSize);
      }
      for (let j = minRow; j <= maxRow; j++) {
        ctx.moveTo(minCol * cellSize, j * cellSize);
        ctx.lineTo(maxCol * cellSize, j * cellSize);
      }
      ctx.stroke();

      // ── War lines ───────────────────────────────────────────────────────
      const warState: Record<string, string[]> = cpr?.war_state ?? {};
      const warPairsDrawn = new Set<string>();
      Object.entries(warState).forEach(([civId, enemies]) => {
        (enemies as string[]).forEach((enemyId) => {
          const pairKey = [civId, enemyId].sort().join('|');
          if (warPairsDrawn.has(pairKey)) return;
          warPairsDrawn.add(pairKey);

          const civAgents = agents.filter(a => a.civ === civId);
          const enemyAgents = agents.filter(a => a.civ === enemyId);
          if (!civAgents.length || !enemyAgents.length) return;

          // Use lerp refs for smooth line positioning
          const getCentroid = (list: any[]) => {
            let sx = 0, sy = 0;
            list.forEach(a => {
              const p = agentsLerpRef.current.get(a.id) || { x: a.loc[0], y: a.loc[1] };
              sx += p.x; sy += p.y;
            });
            return { x: sx / list.length, y: sy / list.length };
          };

          const cA = getCentroid(civAgents);
          const cB = getCentroid(enemyAgents);

          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#B95D3D';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cA.x * cellSize + cellSize / 2, cA.y * cellSize + cellSize / 2);
          ctx.lineTo(cB.x * cellSize + cellSize / 2, cB.y * cellSize + cellSize / 2);
          ctx.stroke();

          // Draw crossed swords path instead of emoji
          const midX = ((cA.x + cB.x) / 2) * cellSize + cellSize / 2;
          const midY = ((cA.y + cB.y) / 2) * cellSize + cellSize / 2;
          ctx.translate(midX, midY);
          ctx.strokeStyle = '#FF4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(-cellSize, -cellSize); ctx.lineTo(cellSize, cellSize);
          ctx.moveTo(cellSize, -cellSize); ctx.lineTo(-cellSize, cellSize);
          ctx.stroke();
          ctx.restore();
        });
      });

      // ── Resources ────────────────────────────────────────────────────────
      if (cpr?.resources) {
        cpr.resources.forEach((res: any) => {
          if (res.x < minCol - 1 || res.x > maxCol + 1 || res.y < minRow - 1 || res.y > maxRow + 1) return;

          if (res.type === 'Crop') {
            const maturity = Math.min(1, (res.crop_age ?? 0) / 10);
            ctx.shadowColor = `rgba(144, 238, 144, ${maturity * 0.8})`;
            ctx.shadowBlur = 10 * maturity;
            const g = Math.floor(100 + maturity * 100);
            ctx.fillStyle = `rgba(40,${g},40,0.85)`;
            ctx.beginPath();
            ctx.arc(res.x * cellSize + cellSize / 2, res.y * cellSize + cellSize / 2, cellSize * 0.4, 0, 2 * Math.PI);
            ctx.fill();

            // Draw leaf path
            ctx.fillStyle = '#90EE90';
            ctx.beginPath();
            ctx.ellipse(res.x * cellSize + cellSize / 2, res.y * cellSize + cellSize * 0.35, cellSize * 0.15, cellSize * 0.3, Math.PI / 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (res.type === 'Stone') {
            // Stone — grey triangle
            ctx.shadowColor = 'rgba(120, 120, 120, 0.5)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#9CA3AF';
            ctx.beginPath();
            ctx.moveTo(res.x * cellSize + cellSize * 0.5, res.y * cellSize + cellSize * 0.2);
            ctx.lineTo(res.x * cellSize + cellSize * 0.8, res.y * cellSize + cellSize * 0.8);
            ctx.lineTo(res.x * cellSize + cellSize * 0.2, res.y * cellSize + cellSize * 0.8);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (res.type === 'Gold') {
            // Gold — bright yellow glowing circle
            ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(res.x * cellSize + cellSize / 2, res.y * cellSize + cellSize / 2, cellSize * 0.35, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (res.type === 'Food') {
            // Food — orange circle
            ctx.shadowColor = 'rgba(255, 165, 0, 0.5)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.arc(res.x * cellSize + cellSize / 2, res.y * cellSize + cellSize / 2, cellSize * 0.35, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (res.type === 'Water') {
            // Water — blue diamond
            ctx.shadowColor = 'rgba(96, 165, 250, 0.7)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#60A5FA';
            ctx.beginPath();
            const wx = res.x * cellSize + cellSize / 2;
            const wy = res.y * cellSize + cellSize / 2;
            ctx.moveTo(wx, wy - cellSize * 0.4);  // top
            ctx.lineTo(wx + cellSize * 0.4, wy);  // right
            ctx.lineTo(wx, wy + cellSize * 0.4);  // bottom
            ctx.lineTo(wx - cellSize * 0.4, wy);  // left
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            // Wood — brown square
            ctx.shadowColor = 'rgba(185, 93, 61, 0.5)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#B95D3D';
            ctx.fillRect(res.x * cellSize + cellSize * 0.2, res.y * cellSize + cellSize * 0.2, cellSize * 0.6, cellSize * 0.6);
            ctx.shadowBlur = 0;
          }
        });
      }

      // ── Structures ───────────────────────────────────────────────────────
      // BUG FIX: backend sends 'structure' key (not 'type'). Normalise here.
      if (cpr?.structures) {
        cpr.structures.forEach((struct: any) => {
          if (struct.x < minCol - 1 || struct.x > maxCol + 1 || struct.y < minRow - 1 || struct.y > maxRow + 1) return;

          // Backend sends { structure: 'Temple', ... } — frontend was reading .type (always undefined)
          const structName: string = (struct.structure || struct.type || 'Building').toString();
          const structUpper = structName.toUpperCase();

          let color = '#C49A53'; // Default — Granary / generic
          let glow = 'rgba(196, 154, 83, 0.7)';

          if (structUpper.includes('TEMPLE') || structUpper.includes('SHRINE') || structUpper.includes('CHURCH')) {
            color = '#9370DB'; // Purple — Temple
            glow = 'rgba(147, 112, 219, 0.9)';
          } else if (structUpper.includes('BARRACKS') || structUpper.includes('FORT') || structUpper.includes('WATCHTOWER')) {
            color = '#8B0000'; // Dark red — Military
            glow = 'rgba(180, 0, 0, 0.8)';
          } else if (structUpper.includes('GRANARY') || structUpper.includes('FARM') || structUpper.includes('BARN')) {
            color = '#7DBB5A'; // Green — Food
            glow = 'rgba(125, 187, 90, 0.7)';
          }

          ctx.shadowColor = glow;
          ctx.shadowBlur = 15;
          ctx.fillStyle = color;

          if (structUpper.includes('TEMPLE') || structUpper.includes('SHRINE')) {
            // Triangle (pyramid)
            ctx.beginPath();
            ctx.moveTo(struct.x * cellSize + cellSize * 0.5, struct.y * cellSize + cellSize * 0.05);
            ctx.lineTo(struct.x * cellSize + cellSize * 0.95, struct.y * cellSize + cellSize * 0.95);
            ctx.lineTo(struct.x * cellSize + cellSize * 0.05, struct.y * cellSize + cellSize * 0.95);
            ctx.closePath();
            ctx.fill();
          } else if (structUpper.includes('BARRACKS') || structUpper.includes('FORT')) {
            // Pentagon (military)
            const bx = struct.x * cellSize + cellSize / 2;
            const by = struct.y * cellSize + cellSize / 2;
            const br = cellSize * 0.42;
            ctx.beginPath();
            for (let k = 0; k < 5; k++) {
              const angle = (k / 5) * 2 * Math.PI - Math.PI / 2;
              k === 0 ? ctx.moveTo(bx + br * Math.cos(angle), by + br * Math.sin(angle))
                      : ctx.lineTo(bx + br * Math.cos(angle), by + br * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();
          } else {
            // Square — all other structures
            ctx.fillRect(struct.x * cellSize + cellSize * 0.1, struct.y * cellSize + cellSize * 0.1, cellSize * 0.8, cellSize * 0.8);
          }

          // Label the structure (tiny text above)
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(231,225,213,0.8)';
          ctx.font = `bold ${cellSize * 0.6}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(structName.substring(0, 3).toUpperCase(), struct.x * cellSize + cellSize / 2, struct.y * cellSize);
        });
      }

      // ── Agents Lerp ──────────────────────────────────────────────────────
      agents.forEach(agent => {
        let lerpPos = agentsLerpRef.current.get(agent.id);
        if (!lerpPos) {
          lerpPos = { x: agent.loc[0], y: agent.loc[1] };
        } else {
          // Linear interpolation for smooth movement
          lerpPos.x += (agent.loc[0] - lerpPos.x) * 0.15;
          lerpPos.y += (agent.loc[1] - lerpPos.y) * 0.15;
        }
        agentsLerpRef.current.set(agent.id, lerpPos);

        if (lerpPos.x < minCol - 2 || lerpPos.x > maxCol + 2 || lerpPos.y < minRow - 2 || lerpPos.y > maxRow + 2) return;

        const cx = lerpPos.x * cellSize + cellSize / 2;
        const cy = lerpPos.y * cellSize + cellSize / 2;

        const color = CIV_COLORS[agent.civ] ?? '#E7E1D5';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;

        const ringColor = STATE_COLORS[agent.state];
        if (ringColor) {
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 1.1, 0, 2 * Math.PI);
          ctx.stroke();
        }

        ctx.fillStyle = '#E7E1D5';
        ctx.font = `bold ${cellSize * 1.2}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        // BUG FIX: strip both A_ and B_ prefixes for compact label
        const agentLabel = agent.id.replace(/^[A-Z]_/, '');
        ctx.fillText(agentLabel, cx, cy - cellSize * 0.3);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [agents, cpr]); // Scale and offset removed from deps so RAF isn't constantly recreated on pan

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Zoom to mouse
    const zoomSensitivity = 0.005;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = scale * (1 + delta);
    newScale = Math.max(0.1, Math.min(newScale, 10));

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Hover Tooltips
    const mx = ((e.clientX - rect.left) * scaleX - offsetRef.current.x) / scaleRef.current;
    const my = ((e.clientY - rect.top) * scaleY - offsetRef.current.y) / scaleRef.current;
    const cellSize = 20;

    const hovered = agents.find(a => {
      const p = agentsLerpRef.current.get(a.id) || { x: a.loc[0], y: a.loc[1] };
      const ax = p.x * cellSize + cellSize / 2;
      const ay = p.y * cellSize + cellSize / 2;
      return Math.sqrt(Math.pow(mx - ax, 2) + Math.pow(my - ay, 2)) <= cellSize * 2;
    });

    if (hovered) {
      setHoveredAgent(hovered);
      setTooltipPos({ x: e.clientX - rect.left + 20, y: e.clientY - rect.top + 20 });
    } else {
      setHoveredAgent(null);
    }

    // Dragging
    if (!isDraggingRef.current) return;

    const dx = (e.clientX - lastMouseRef.current.x) * scaleX;
    const dy = (e.clientY - lastMouseRef.current.y) * scaleY;

    velocityRef.current = { x: dx, y: dy };
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    setHoveredAgent(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (contextMenu) setContextMenu(null);
    if (Math.abs(velocityRef.current.x) > 2 || Math.abs(velocityRef.current.y) > 2) return; // Was a fast drag
    if (hoveredAgent) {
      router.push(`/agent/${hoveredAgent.id}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mx = ((e.clientX - rect.left) * scaleX - offsetRef.current.x) / scaleRef.current;
    const my = ((e.clientY - rect.top) * scaleY - offsetRef.current.y) / scaleRef.current;
    const cellSize = 20;

    const clickedAgent = agents.find(a => {
      const p = agentsLerpRef.current.get(a.id) || { x: a.loc[0], y: a.loc[1] };
      const ax = p.x * cellSize + cellSize / 2;
      const ay = p.y * cellSize + cellSize / 2;
      return Math.sqrt(Math.pow(mx - ax, 2) + Math.pow(my - ay, 2)) <= cellSize * 2;
    });

    if (clickedAgent) {
      setContextMenu({
        type: 'agent',
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        mapX: Math.floor(mx / cellSize),
        mapY: Math.floor(my / cellSize),
        agent: clickedAgent
      });
    } else {
      setContextMenu({
        type: 'tile',
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        mapX: Math.floor(mx / cellSize),
        mapY: Math.floor(my / cellSize),
      });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mx = ((e.clientX - rect.left) * scaleX - offsetRef.current.x) / scaleRef.current;
    const my = ((e.clientY - rect.top) * scaleY - offsetRef.current.y) / scaleRef.current;
    const cellSize = 20;

    setContextMenu({
      type: 'tile',
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      mapX: Math.floor(mx / cellSize),
      mapY: Math.floor(my / cellSize),
    });
  };

  const executeGodMode = async (action: 'smite' | 'bless' | 'spawn_food' | 'spawn_water') => {
    if (!contextMenu) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      if (action === 'smite' || action === 'bless') {
        await fetch(`${baseUrl}/api/agent/${contextMenu.agent.id}/${action}`, { method: 'POST' });
        showToast(`Agent ${action === 'smite' ? 'Smited' : 'Blessed'}!`, action === 'smite' ? 'text-red-400' : 'text-green-400', contextMenu.x, contextMenu.y);

        // Optimistic Log
        useTelemetry.setState(state => ({
          centralLogs: [...state.centralLogs, {
            agent_id: contextMenu.agent.id,
            action: action === 'smite' ? 'SMITED' : 'BLESSED',
            reasoning: action === 'smite' ? 'The Gods have struck this agent down!' : 'The Gods have blessed this agent with vitality!',
            tick: state.tick
          }].slice(-50)
        }));
      } else if (action === 'spawn_food' || action === 'spawn_water') {
        const type = action === 'spawn_food' ? 'food' : 'water';
        await fetch(`${baseUrl}/api/resource/spawn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x: contextMenu.mapX, y: contextMenu.mapY, type })
        });
        showToast(`Spawned ${type} node`, 'text-blue-400', contextMenu.x, contextMenu.y);

        // Optimistic UI update to bypass backend tick lag
        useTelemetry.setState(state => ({
          cpr: {
            ...state.cpr,
            resources: [
              ...(state.cpr?.resources || []),
              {
                id: Math.random().toString().substring(2, 10),
                type: type === 'food' ? 'Crop' : 'Water',
                x: contextMenu.mapX,
                y: contextMenu.mapY,
                amount: 100,
                crop_age: type === 'food' ? 10 : undefined
              }
            ]
          },
          centralLogs: [...state.centralLogs, {
            agent_id: 'SYSTEM',
            action: 'SPAWN',
            reasoning: `The Gods spawned ${type === 'food' ? 'Crop' : 'Water'} at ${contextMenu.mapX}, ${contextMenu.mapY}`,
            tick: state.tick
          }].slice(-50)
        }));
      }
    } catch (e) {
      console.error('God Mode action failed', e);
    }
    setContextMenu(null);
  };

  return (
    <div className="flex justify-center items-center w-full h-full bg-[#0C0C0B] relative overflow-hidden border border-[#3B3A35]">



      {/* Hover Tooltip (hide if context menu open) */}
      {hoveredAgent && !contextMenu && (
        <div
          className="absolute z-20 bg-[#161614]/95 backdrop-blur border border-[#3B3A35] p-3 shadow-xl rounded pointer-events-none transition-transform duration-75 ease-out"
          style={{ top: tooltipPos.y, left: tooltipPos.x }}
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-[#A8A08F] mb-1">
            Agent {hoveredAgent.id}
          </div>
          <div className="text-[#E7E1D5] font-bold text-sm mb-1">{hoveredAgent.state}</div>
          <div className="flex gap-3 text-[10px] font-mono text-[#A8A08F]">
            <span>Inv: {hoveredAgent.inventory?.food || 0}F {hoveredAgent.inventory?.wood || 0}W {hoveredAgent.inventory?.water || 0}H</span>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute z-30 bg-[#161614]/95 backdrop-blur border border-[#3B3A35] shadow-xl rounded overflow-hidden flex flex-col min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-[#E7E1D5] bg-[#111110] border-b border-[#3B3A35] p-2">
            {contextMenu.type === 'agent' ? `Agent ${contextMenu.agent.id}` : `Tile ${contextMenu.mapX}, ${contextMenu.mapY}`}
          </div>
          {contextMenu.type === 'agent' ? (
            <>
              <button onClick={() => executeGodMode('bless')} className="text-left px-3 py-2 text-xs font-bold text-[#7DBB5A] hover:bg-[#3B3A35] uppercase">Bless (Heal)</button>
              <button onClick={() => executeGodMode('smite')} className="text-left px-3 py-2 text-xs font-bold text-[#FF4444] hover:bg-[#3B3A35] uppercase">Smite (Harm)</button>
            </>
          ) : (
            <>
              <button onClick={() => executeGodMode('spawn_food')} className="text-left px-3 py-2 text-xs font-bold text-[#7DBB5A] hover:bg-[#3B3A35] uppercase">Spawn Crop</button>
              <button onClick={() => executeGodMode('spawn_water')} className="text-left px-3 py-2 text-xs font-bold text-[#6C8BC4] hover:bg-[#3B3A35] uppercase">Spawn Water</button>
            </>
          )}
        </div>
      )}

      {/* Feedback Toast */}
      {toast && (
        <div
          className={`absolute z-40 px-2 py-1 bg-[#161614]/90 border border-[#3B3A35] font-mono text-sm pointer-events-none transition-all duration-500 animate-pulse ${toast.color}`}
          style={{ top: toast.y - 40, left: Math.min(toast.x, typeof window !== 'undefined' ? window.innerWidth - 150 : toast.x) }}
        >
          {toast.message}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full block absolute inset-0"
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'grab' }}
      />
    </div>
  );
}
