// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
// OctoCode Blender Mastery — extracted from 6 beginner tutorials
// Covers: interface, navigation, keybinds, modeling, materials, lighting, rendering, modifiers, animation

const BLENDER_MASTERY = {
  version: "5.1+",

  // ===== NAVIGATION (THE FIRST THING TO LEARN) =====
  navigation: {
    orbit: "Middle mouse button (MMB) drag",
    pan: "Shift + MMB drag",
    zoom: "Scroll wheel (or Ctrl + MMB drag)",
    frontView: "Numpad 1",
    rightView: "Numpad 3",
    topView: "Numpad 7",
    bottomView: "Ctrl + 7",
    leftView: "Ctrl + 1",
    perspectiveOrtho: "Numpad 5",
    zoomToSelected: "Numpad .",
    isolateObject: "Numpad / (toggle)",
    cameraView: "Numpad 0",
    alignCameraToView: "Ctrl + Alt + Numpad 0",
    maximizeArea: "Ctrl + Space",
    noNumpadAlt: "Alt + MMB drag for ortho views without numpad",
  },

  // ===== THE 7 ESSENTIAL KEYBINDS =====
  essentialKeybinds: {
    "G": "Grab/Move — move selected object or geometry",
    "R": "Rotate — rotate selected (R+X/Y/Z to lock axis)",
    "S": "Scale — scale selected (S+X/Y/Z to lock axis)",
    "E": "Extrude — pull new geometry from selection",
    "I": "Inset — create smaller face inside selected face",
    "Ctrl+R": "Loop Cut — add edge loops for more geometry",
    "Ctrl+B": "Bevel — round off hard edges (scroll for more segments)",
    "A": "Select all / deselect all",
    "Shift+D": "Duplicate selection",
    "X": "Delete selection",
    "F": "Fill — connect vertices into face",
    "J": "Connect vertex path",
    "M": "Merge vertices",
    "P": "Separate by selection",
    "K": "Knife tool — cut custom geometry",
    "Ctrl+A": "Apply all transforms (critical before extruding!)",
    "Tab": "Toggle Object Mode / Edit Mode",
    "Shift+A": "Add menu (Mesh, Curve, Light, Camera, etc.)",
  },

  // ===== MODES =====
  modes: {
    object: {
      name: "Object Mode",
      toggle: "Tab",
      purpose: "Move, rotate, scale entire objects",
      toolbar: ["Box Select", "Cursor", "Move", "Rotate", "Scale", "Transform"],
    },
    edit: {
      name: "Edit Mode",
      toggle: "Tab",
      purpose: "Modify geometry — vertices, edges, faces",
      selectModes: {
        vertex: "Press 1 — select individual points",
        edge: "Press 2 — select lines between points",
        face: "Press 3 — select flat surfaces",
      },
      essentialTools: ["E (extrude)", "I (inset)", "Ctrl+R (loop cut)", "Ctrl+B (bevel)", "K (knife)", "F (fill)", "M (merge)"],
    },
    sculpt: { name: "Sculpt Mode", purpose: "Brush-based organic modeling" },
    texturePaint: { name: "Texture Paint", purpose: "Paint directly on 3D surfaces" },
    weightPaint: { name: "Weight Paint", purpose: "Armature bone weights for animation" },
  },

  // ===== TRANSFORM TIPS =====
  transforms: {
    axisLocking: "Press G/R/S then X, Y, or Z to lock to that axis",
    localAxis: "Press axis key TWICE (e.g. G+Y+Y) for local coordinate axis",
    applyTransform: "Ctrl+A → Apply All Transforms (MUST do before inset/extrude after scaling!)",
    resetLocation: "Alt+G",
    resetRotation: "Alt+R",
    resetScale: "Alt+S",
    snap: "Hold Ctrl while transforming to snap to vertices/faces/grid",
    pivotPoints: [
      "Bounding Box Center (default) — rotates from center of selection",
      "3D Cursor — rotates from cursor position",
      "Individual Origins — each object rotates on its own center",
      "Active Element — rotates from the highlighted object",
    ],
  },

  // ===== OBJECT MANAGEMENT =====
  objectManagement: {
    outliner: "Top-right panel — lists all objects, rename with double-click, hide with eye icon",
    collections: "Like folders for organizing objects",
    activeObject: "Last selected object (yellow border) — used for parenting, material linking",
    shiftSelect: "Hold Shift to add/remove from selection",
    boxSelect: "Press B, drag to select multiple",
    selectAll: "A key (press twice to toggle)",
    duplicate: "Shift+D (press right-click to cancel move, keeps duplicate at same spot)",
    join: "Ctrl+J — combine selected objects into one",
    separate: "P — separate by loose parts or selection",
    origins: "Object menu → Set Origin → Origin to 3D Cursor (for door hinges, pivot points)",
    rename: "Double-click in outliner or F2",
  },

  // ===== ADDING OBJECTS =====
  addObjects: {
    method: "Shift+A → Mesh submenu",
    essentialPrimitives: [
      "Cube — most versatile starting shape",
      "Cylinder — pipes, columns, tree trunks, wheels",
      "UV Sphere — organic shapes, heads, eyes, chocolate chips",
      "Plane — ground, walls, screens",
      "Circle — wheels, rings, tree foliage",
      "Cone — roofs, funnels, lampshades",
      "Torus — donuts, rings",
    ],
    segments: "Adjust vertex count right after adding (pop-up panel in bottom-left)",
    lowPoly: "Reduce segments for mobile/game art (e.g. Cylinder with 8 segments)",
    shading: "Right-click → Shade Smooth or Shade Smooth Auto Smooth (fixes faceted look)",
  },

  // ===== EDIT MODE MODELING =====
  editMode: {
    extrude: {
      key: "E",
      use: "Pull new geometry from selected face/edge",
      tip: "Works best on faces. After scaling non-uniformly, Ctrl+A apply transforms first!",
    },
    inset: {
      key: "I",
      use: "Create smaller face inside selected face",
      tip: "Great for windows, door frames, panel details",
    },
    loopCut: {
      key: "Ctrl+R",
      use: "Add edge loops for more geometry detail",
      tip: "Scroll wheel to add more cuts before clicking",
    },
    bevel: {
      key: "Ctrl+B",
      use: "Round hard edges, add segments for smoothness",
      tip: "Scroll to add segments. Alt+Click edge to select full loop first.",
    },
    knife: {
      key: "K",
      use: "Draw custom cuts through geometry",
    },
    fill: {
      key: "F",
      use: "Connect vertices into a face",
    },
    merge: {
      key: "M",
      use: "Merge selected vertices (at center, at cursor, collapse, etc.)",
    },
    wireframeMode: "Toggle to see through object and select hidden vertices (top-right icons)",
    proportionalEditing: "O key — soft selection that affects nearby geometry (great for organic shapes)",
  },

  // ===== MODIFIERS (the powerful tools) =====
  modifiers: {
    location: "Properties panel → Wrench icon → Add Modifier",
    essential: [
      {
        name: "Subdivision Surface",
        purpose: "Smooth mesh by adding geometry (Catmull-Clark or Simple)",
        shortcut: "Ctrl+1 to Ctrl+5 (add level 1-5)",
        useCase: "Smoothing any model, organic shapes",
      },
      {
        name: "Boolean",
        purpose: "Cut, unite, or intersect two meshes",
        operations: ["Difference (cut out)", "Union (combine)", "Intersect (keep overlap)"],
        workflow: "Create cutter shape → Select target → Add Modifier → Boolean → Pick cutter → Apply",
        useCase: "Wheel wells, windows, holes, complex shapes",
      },
      {
        name: "Array",
        purpose: "Duplicate object in a pattern (linear, circular, etc.)",
        useCase: "Fence posts, chains, repeated elements, wheels on a car",
      },
      {
        name: "Mirror",
        purpose: "Auto-symmetry across X/Y/Z axis",
        useCase: "Character faces, cars, anything symmetrical",
        workflow: "Set Mirror Object to the center object for correct mirroring",
      },
      {
        name: "Solidify",
        purpose: "Add thickness to flat surfaces",
        useCase: "Walls, glass, thin objects",
      },
      {
        name: "Bevel (modifier)",
        purpose: "Round all edges non-destructively",
        useCase: "Softening sharp edges across entire model",
      },
      {
        name: "Decimate",
        purpose: "Reduce polygon count for optimization",
        useCase: "LODs, mobile game assets, performance",
      },
    ],
  },

  // ===== MATERIALS =====
  materials: {
    howTo: "Select object → Properties panel → Material tab (sphere icon) → New",
    principledBSDF: {
      baseColor: "Main color of the surface",
      metallic: "0 = non-metal, 1 = chrome/metallic",
      roughness: "0 = mirror-glossy, 1 = rough-matte",
      emission: "Self-illuminating surface (glow)",
      transmission: "Glass/transparent (1 = fully transparent)",
      alpha: "Opacity (0 = invisible, 1 = opaque)",
      subsurface: "Light passing through thin objects (skin, wax, leaves)",
    },
    multipleMaterials: "Click + button in Material tab to add multiple materials to one object, then select faces in Edit Mode and click Assign",
    linkMaterials: "Select objects → last one active → Ctrl+L → Link Materials (apply same material to all)",
    shadeModes: {
      wireframe: "See edges only (top-right icon)",
      solid: "Default gray (no materials shown)",
      materialPreview: "Shows colors/materials without rendering",
      rendered: "Full render with lighting and shadows",
    },
  },

  // ===== LIGHTING =====
  lighting: {
    pointLight: "Omnidirectional — lamps, candles, screens. Radius controls shadow softness.",
    spotLight: "Cone-shaped — flashlights, stage lights, headlights. Blend controls edge softness.",
    areaLight: "Soft studio light — windows, softboxes. Larger size = softer shadows.",
    sunLight: "Infinite directional — outdoor. Only rotation matters, not position.",
    hdri: "World tab → Surface → Environment Texture → Open HDRI file. Best for realistic reflections.",
    tips: [
      "Area lights give the most realistic soft shadows",
      "Sun light strength 2-5 for daylight scenes",
      "Multiple lights at different angles create depth",
      "Warm light (4000K) for cozy feel, cool light (6500K) for clinical feel",
    ],
  },

  // ===== CAMERA & RENDERING =====
  rendering: {
    cameraSetup: [
      "Numpad 0 for camera view",
      "Ctrl+Alt+0 to snap camera to current viewport",
      "N panel → View → Lock Camera to View (move camera by navigating)",
      "Always UNLOCK after framing the shot",
    ],
    renderEngines: {
      Eevee: "Real-time, fast, good for previews and stylized looks",
      Cycles: "Path-traced, physically accurate, slower but better lighting/shadows",
    },
    device: "Render tab → Device → GPU (if you have a graphics card)",
    output: "Output tab → Resolution (1920x1080 default), format (PNG/JPEG)",
    render: "F12 for still image, Ctrl+F12 for animation",
    save: "Image → Save As after rendering",
  },

  // ===== REAL WORKFLOWS (from tutorials) =====
  workflows: {
    cookieModel: [
      "1. Shift+A > Mesh > Cylinder (base of cookie)",
      "2. S > Z to flatten height (make thin disk)",
      "3. Right-click > Shade Smooth",
      "4. Shift+A > Mesh > UV Sphere (chocolate chip)",
      "5. S to scale small, G to position on cookie",
      "6. Right-click > Shade Smooth",
      "7. Shift+D to duplicate chips, scatter around",
      "8. Add materials: cookie=brown, chips=dark brown",
    ],
    carModel: [
      "1. Start with Cube, Tab to Edit Mode",
      "2. E to extrude roof up, G+Y to tilt windshield",
      "3. I (inset) + E (extrude) for window recess",
      "4. Ctrl+A apply transforms before inset!",
      "5. Add Cylinder for wheels, Tab Edit > I+E for tire detail",
      "6. Boolean modifier to cut wheel wells",
      "7. Array modifier for multiple wheels",
      "8. Mirror modifier to duplicate to other side",
      "9. Add bumpers, mirrors, door handles with Shift+D",
    ],
    buildingScene: [
      "1. Create cubes for building walls, ground, road",
      "2. Use snapping (Ctrl) for precise alignment",
      "3. Duplicate with Shift+D for windows, railings",
      "4. Ctrl+J to join related geometry",
      "5. Assign materials: walls=brown, road=gray, trees=green",
      "6. Add camera, Ctrl+Alt+0 to frame, F12 to render",
    ],
    animation: [
      "1. Go to frame 1, select object",
      "2. Press I → Location (insert keyframe)",
      "3. Move to frame 60, move object, press I again",
      "4. Space to preview animation",
      "5. Adjust easing in Graph Editor",
    ],
  },

  // ===== CLAUDE/MCP INTEGRATION (advanced) =====
  mcpIntegration: {
    setup: [
      "1. Install Blender 5.1+",
      "2. Download Blender MCP from blender.org/lab",
      "3. Drag add-on into Blender → Edit > Preferences > Add-ons > MCP",
      "4. Ensure MCP server is running + auto-start enabled",
      "5. In Claude Desktop: Connectors → Search 'Blender' → Install",
      "6. Restart Claude after installing connector",
    ],
    capabilities: [
      "Clean scene (remove all objects)",
      "Create geometry nodes procedurally",
      "Generate materials with AI texture models",
      "Bake normal/AO maps automatically",
      "Create LODs (Level of Detail) for games",
      "Animation scripting (keyframes, simulations)",
      "Procedural shaders (toon, chameleon, etc.)",
      "Distribute objects across terrain with geometry nodes",
    ],
    tips: [
      "Always keep Blender open while Claude is working",
      "Use 'dangerously skip permissions' for autonomous mode (risky)",
      "Claude self-heals: if a script fails, it tries alternative approaches",
      "Geometry nodes can be generated and parameterized via prompts",
      "Materials can be assigned via Python scripting in background mode",
    ],
  },
}

module.exports = BLENDER_MASTERY
