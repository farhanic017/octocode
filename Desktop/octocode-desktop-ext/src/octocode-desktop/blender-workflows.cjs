// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
// Blender Junior 3D Artist Quickstart
// Step-by-step workflows for common modeling tasks

const BLENDER_WORKFLOWS = {
  // ===== CREATE A SIMPLE HOUSE =====
  house: {
    name: "Low-Poly House",
    difficulty: "Beginner",
    steps: [
      "1. Delete default cube (X > Delete)",
      "2. Shift+A > Mesh > Cube — this is the house body",
      "3. S > Z > 0.8 — flatten to house proportions",
      "4. Tab to Edit Mode",
      "5. Select top face (3 for face select, click top face)",
      "6. I > 0.02 — inset the roof base",
      "7. E > Z > 0.5 — extrude up for roof",
      "8. S > X > 0 — collapse X to make roof peak (creates pyramid shape)",
      "9. Tab to Object Mode",
      "10. Shift+A > Mesh > Cube — this is the door",
      "11. S > to scale door to fit house front",
      "12. G > to position on house front",
      "13. Shift+A > Light > Sun — add lighting",
      "14. Z > Rendered — preview the scene",
      "15. F12 — render final image",
    ],
  },

  // ===== CREATE A CHAIR =====
  chair: {
    name: "Simple Chair",
    difficulty: "Beginner",
    steps: [
      "1. Shift+A > Mesh > Cube",
      "2. Tab to Edit Mode",
      "3. S > Z > 0.1 — flatten to seat thickness",
      "4. Ctrl+R > click, slide to center — loop cut for leg placement",
      "5. Tab to Object Mode",
      "6. Shift+A > Mesh > Cylinder — this is a leg",
      "7. S > Z > 0.08 > S > Shift+Z > 0.05 — thin tall cylinder",
      "8. Position under seat corner",
      "9. Select leg > Shift+D > X > move to other corner",
      "10. Repeat for 4 legs",
      "11. Shift+A > Mesh > Cube — backrest",
      "12. Scale and position behind seat",
      "13. Select all > Ctrl+J — join into one object",
      "14. Add material: Material tab > New > Base Color: brown",
      "15. F12 to render",
    ],
  },

  // ===== CREATE A ROBOT HEAD =====
  robotHead: {
    name: "Simple Robot Head",
    difficulty: "Beginner",
    steps: [
      "1. Shift+A > Mesh > Cube",
      "2. Tab to Edit Mode",
      "3. Ctrl+1 or Ctrl+2 — add subdivision surface (smooth)",
      "4. Tab to Object Mode",
      "5. Shift+A > Mesh > Cylinder — eye socket",
      "6. S > 0.15 — scale small",
      "7. Position on face front",
      "8. Shift+D > X — duplicate for second eye",
      "9. Shift+A > Mesh > Cylinder — antenna",
      "10. S > Z > 2 — make tall and thin",
      "11. Position on top of head",
      "12. Add materials: Head = gray metal (Metallic: 0.8, Roughness: 0.3)",
      "13. Eyes = Emission blue (Emission: 2.0, Color: blue)",
      "14. Antenna = red",
      "15. Shift+A > Light > Point — above head",
    ],
  },

  // ===== CREATE A TABLE =====
  table: {
    name: "Dining Table",
    difficulty: "Beginner",
    steps: [
      "1. Shift+A > Mesh > Cube",
      "2. Tab to Edit Mode",
      "3. S > Z > 0.05 — thin tabletop",
      "4. S > X > 2 > S > Y > 1.2 — make rectangular",
      "5. Tab to Object Mode",
      "6. Shift+A > Mesh > Cylinder — leg",
      "7. S > Z > 0.4 > S > Shift+Z > 0.06 — tall thin leg",
      "8. Position at corner underneath table",
      "9. Shift+D > X — duplicate leg to other corners (x4)",
      "10. Select all > Ctrl+J — join",
      "11. Add wood material: Principled BSDF > Base Color: #8B4513",
      "12. Roughness: 0.7 (wooden look)",
    ],
  },

  // ===== CREATE A LANDSCAPE =====
  landscape: {
    name: "Terrain with Mountains",
    difficulty: "Intermediate",
    steps: [
      "1. Shift+A > Mesh > Plane",
      "2. Tab to Edit Mode",
      "3. Right-click > Subdivide > 20 cuts",
      "4. Select all (A)",
      "5. Sculpt Mode (Ctrl+Tab > Sculpt)",
      "6. G (Grab) brush — pull up mountains",
      "7. S (Smooth) brush — smooth harsh areas",
      "8. F to adjust brush size as needed",
      "9. Back to Object Mode",
      "10. Add Subdivision Surface modifier for smoother terrain",
      "11. Material: Add new > make it green/brown",
      "12. Shift+A > Light > Sun (low angle for dramatic shadows)",
      "13. Add camera: Numpad 0 > Ctrl+Alt+Numpad 0 to snap camera to view",
    ],
  },

  // ===== TEXTURING WORKFLOW =====
  texturing: {
    name: "UV Unwrap + Paint Texture",
    difficulty: "Intermediate",
    steps: [
      "1. Select object > Tab to Edit Mode",
      "2. Select all faces (A)",
      "3. U > Smart UV Project (automatic unwrap)",
      "4. Switch to UV Editing workspace tab",
      "5. Adjust UV islands in UV editor",
      "6. Switch to Texture Paint workspace",
      "7. Select brush, color, strength",
      "8. Paint directly on 3D model",
      "9. Image > Save As to save texture to disk",
      "10. Connect texture in Material tab (Image Texture node)",
    ],
  },

  // ===== ANIMATION BASICS =====
  animation: {
    name: "Simple Keyframe Animation",
    difficulty: "Beginner",
    steps: [
      "1. Select object",
      "2. Go to frame 1 in timeline",
      "3. Press I > Location (insert keyframe)",
      "4. Move to frame 60",
      "5. Move object to new position (G)",
      "6. Press I > Location again",
      "7. Press Space or Play button to preview",
      "8. F12 at any frame to render still",
      "9. Ctrl+F12 to render full animation",
    ],
  },
}

module.exports = BLENDER_WORKFLOWS
