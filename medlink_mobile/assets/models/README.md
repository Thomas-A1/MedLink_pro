# 3D Human Body Model for Body Part Selector

## Model Requirements

### Specifications

- **Format**: GLB (preferred) or FBX
- **Style**: Clean, modern, slightly low-poly, gender-neutral, non-explicit
- **Anatomy**: External only (no internal organs or medical realism)
- **Skin Tone**: Neutral
- **Segmentation**: Model must be segmented for individual selection of body parts

### Required Body Parts (25 regions)

1. head
2. face
3. neck
4. chest
5. upper_back
6. lower_back
7. abdomen
8. left_arm
9. right_arm
10. left_elbow
11. right_elbow
12. left_wrist
13. right_wrist
14. left_hand
15. right_hand
16. left_thigh
17. right_thigh
18. left_knee
19. right_knee
20. left_leg
21. right_leg
22. left_ankle
23. right_ankle
24. left_foot
25. right_foot

## Model Generation Prompt

Use this prompt with AI 3D model generators (like ChatGPT, Claude, or specialized 3D tools):

```
Create a clean, modern, low-poly 3D human body model with the following specifications:

- Style: Minimalist, medical/healthcare aesthetic, slightly stylized
- Gender: Neutral/androgynous
- Detail Level: Low-poly (500-2000 triangles recommended for mobile performance)
- Skin Tone: Neutral beige/tan
- Anatomy: External only, no internal organs, no explicit features
- Pose: Standing, arms slightly away from body, palms facing forward (anatomical position)
- Segmentation: Each body part must be a separate mesh/object with named identifiers:
  * head, face, neck
  * chest, upper_back, lower_back, abdomen
  * left_arm, right_arm, left_elbow, right_elbow, left_wrist, right_wrist, left_hand, right_hand
  * left_thigh, right_thigh, left_knee, right_knee, left_leg, right_leg, left_ankle, right_ankle, left_foot, right_foot

- Export Format: GLB (glTF Binary) with embedded textures
- File Size: Optimized for mobile (< 5MB recommended)
- Textures: Simple, flat colors or minimal shading
- Animation: None required (static model)
```

## Model Generation Options

### Option 1: AI Generation Tools

- **ChatGPT/Claude**: Use the prompt above with 3D model generation capabilities
- **Meshy.ai**: AI-powered 3D model generation
- **Rodin**: AI 3D model generator
- **Masterpiece Studio**: AI 3D creation tool

### Option 2: 3D Modeling Software

- **Blender** (Free): Create model, segment body parts, export as GLB
- **Maya/3ds Max**: Professional tools (paid)
- **Sketchfab**: Download free models and modify

### Option 3: Pre-made Models

- **Sketchfab**: Search for "low poly human body" (check license)
- **TurboSquid**: Purchase medical/healthcare models
- **CGTrader**: Search for segmented body models

## Export Instructions

### From Blender:

1. Create/import your model
2. Ensure each body part is a separate object/mesh
3. Name each object exactly as listed above (e.g., "head", "left_arm")
4. Select all objects
5. File → Export → glTF 2.0
6. Choose "glTF Binary (.glb)"
7. Check "Selected Objects Only"
8. Export to `assets/models/human_body.glb`

### From Other Software:

- Ensure GLB format
- Maintain named segments
- Optimize for mobile (reduce polygons if needed)
- Place file in `assets/models/human_body.glb`

## Integration

Once the model is placed in `assets/models/human_body.glb`, the app will automatically use it.

### Fallback Behavior

If the model is not found, the app will:

1. Try to load from a CDN URL (if configured)
2. Fall back to a 2D body diagram selector
3. Show an error message with instructions

## Testing

1. Place your GLB model in `assets/models/human_body.glb`
2. Run `flutter pub get`
3. Test the body part selector screen
4. Verify each body part can be selected
5. Check performance on actual devices

## Troubleshooting

### Model Not Loading

- Verify file path: `assets/models/human_body.glb`
- Check file size (< 10MB recommended)
- Ensure GLB format (not GLTF or FBX)
- Check console for error messages

### Performance Issues

- Reduce polygon count
- Simplify textures
- Use texture compression
- Test on lower-end devices

### Body Parts Not Selectable

- Verify model has named segments
- Check segment names match exactly (case-sensitive)
- Ensure model_viewer_plus supports tap detection (may need custom implementation)

## Alternative: 2D Body Diagram

If 3D model integration proves difficult, the app includes a 2D fallback (`BodyPartSelector2D`) that uses a simplified body diagram with clickable regions.

## Notes

- The current implementation uses `model_viewer_plus` which may have limitations with precise body part selection
- For production, consider:
  - Unity integration for more precise touch detection
  - Custom WebGL viewer with raycasting
  - Hybrid approach: 3D visualization + 2D overlay for selection
