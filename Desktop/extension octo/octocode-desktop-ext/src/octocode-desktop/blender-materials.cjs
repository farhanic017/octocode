// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
// Blender Materials and Lighting Quick Reference

const BLENDER_MATERIALS = {
  commonMaterials: {
    metal: {
      name: "Polished Metal",
      principledBSDF: { metallic: 1.0, roughness: 0.15, baseColor: "#C0C0C0" },
      tips: "High metallic + low roughness = chrome look. Increase roughness for brushed metal.",
    },
    wood: {
      name: "Wood Surface",
      principledBSDF: { metallic: 0, roughness: 0.65, baseColor: "#8B4513" },
      tips: "Add image texture for wood grain. Roughness 0.6-0.8 for natural wood.",
    },
    glass: {
      name: "Glass",
      principledBSDF: { metallic: 0, roughness: 0, transmission: 1.0, baseColor: "#FFFFFF" },
      tips: "Transmission: 1.0 for clear glass. Add IOR 1.45 for glass. Use Cycles for best results.",
    },
    plastic: {
      name: "Smooth Plastic",
      principledBSDF: { metallic: 0, roughness: 0.3, baseColor: "#FF0000" },
      tips: "Low roughness for shiny plastic. Higher roughness for matte plastic.",
    },
    fabric: {
      name: "Cloth/Fabric",
      principledBSDF: { metallic: 0, roughness: 0.9, baseColor: "#4444FF" },
      tips: "High roughness for matte fabric. Use cloth simulation for draping.",
    },
    rubber: {
      name: "Rubber",
      principledBSDF: { metallic: 0, roughness: 0.85, baseColor: "#222222" },
      tips: "Nearly black, very rough. Slightly glossy for new rubber.",
    },
    ceramic: {
      name: "Ceramic/Tiles",
      principledBSDF: { metallic: 0, roughness: 0.2, baseColor: "#F5F5DC" },
      tips: "Low-medium roughness. Add slight subsurface for realism.",
    },
    skin: {
      name: "Human Skin",
      principledBSDF: { metallic: 0, roughness: 0.5, baseColor: "#E0B090", subsurface: 0.15 },
      tips: "Subsurface scattering makes skin look alive. Subsurface radius: 1.0, 0.3, 0.2",
    },
    ice: {
      name: "Ice",
      principledBSDF: { metallic: 0, roughness: 0.05, transmission: 0.95, baseColor: "#E0F0FF", IOR: 1.31 },
      tips: "Low IOR (1.31) differentiates from glass (1.45). Slight blue tint.",
    },
    neon: {
      name: "Neon/Emissive",
      principledBSDF: { emission: 5.0, emissionColor: "#FF00FF" },
      tips: "High emission strength. Use bloom in Render Properties for glow effect.",
    },
  },

  lighting: {
    pointLight: {
      name: "Point Light",
      useCase: "Omnidirectional light — lamps, candles, screens",
      properties: { power: "1000W default", color: "white default", radius: "0 = sharp shadows" },
      tips: "Increase radius for softer shadows. Good for interior scenes.",
    },
    spotLight: {
      name: "Spot Light",
      useCase: "Directional cone — flashlights, stage lights, headlights",
      properties: { power: "1000W", spotAngle: "45° default", blend: "0 = hard edge, 1 = soft falloff" },
      tips: "Blend value controls shadow softness at cone edges. Great for dramatic lighting.",
    },
    areaLight: {
      name: "Area Light",
      useCase: "Soft studio lighting — windows, softboxes, monitors",
      properties: { power: "100W", size: "1m default, shape: Square/Rectangle/Disk" },
      tips: "Larger size = softer shadows. Best for realistic interior light.",
    },
    sunLight: {
      name: "Sun Light",
      useCase: "Infinite directional — outdoor scenes, landscape lighting",
      properties: { strength: "1.0 default", angle: "rotation = sun direction" },
      tips: "Position doesn't matter, only rotation. Strength 2-5 for daylight.",
    },
    environmentTexture: {
      name: "HDRI Environment",
      useCase: "Realistic reflections and ambient lighting",
      properties: { method: "World tab > Surface > Environment Texture > Open HDRI image" },
      tips: "Download free HDRIs from polyhaven.com. Strength 0.5-1.5.",
    },
  },

  camera: {
    focalLength: "50mm default (perspective). 35mm = wide, 85mm = portrait, 200mm = telephoto",
    depthOfField: "Enable in Camera properties. F-stop: lower = more blur (bokeh)",
    clipping: "Start: 0.1m, End: 1000m. Adjust for large scenes",
  },
}

module.exports = BLENDER_MATERIALS
