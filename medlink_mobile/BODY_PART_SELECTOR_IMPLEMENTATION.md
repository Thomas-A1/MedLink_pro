# 3D Body Part Selector - Implementation Guide

## Overview

The 3D Body Part Selector has been implemented as part of the symptom intake flow. After users record their complaints, they are presented with an interactive 3D human body model to select the exact body part where they feel discomfort.

## Current Implementation Status

### ✅ Completed

1. **Data Models** (`body_part.dart`)

   - `BodyPart` class with 25 predefined body parts
   - `SymptomComplaint` class for API payload
   - Body part index mapping
   - JSON serialization support

2. **3D Body Selector Widget** (`body_part_selector_3d.dart`)

   - Model viewer integration using `model_viewer_plus`
   - Visual feedback (highlight animations)
   - Selection label display
   - 2D fallback selector

3. **Body Part Selection Screen** (`body_part_selection_screen.dart`)

   - Full-screen selection interface
   - Integration with symptom intake flow
   - Clean, medical-style UI
   - Localized (English/Twi)

4. **Integration**
   - Added to main app routes
   - Integrated into symptom intake flow
   - Translation keys added

### ⚠️ Limitations & Next Steps

**Current Limitation:**
`model_viewer_plus` doesn't support precise tap detection on specific parts of a 3D model. The current implementation uses:

- 3D model for visualization (rotate, zoom, pan)
- Overlay buttons for body part selection (temporary solution)

**Production Recommendations:**

1. **Option A: Unity Integration** (Recommended for best UX)

   - Use `flutter_unity_widget` package
   - Implement raycasting for precise touch detection
   - Better performance and control
   - Requires Unity project setup

2. **Option B: Custom WebGL Viewer**

   - Use `flutter_webview` with custom Three.js viewer
   - Implement raycasting in JavaScript
   - More control over interactions
   - Requires web development

3. **Option C: Hybrid Approach** (Current)

   - 3D model for visualization
   - 2D overlay with positioned buttons
   - Simpler but less precise
   - Good for MVP

4. **Option D: Enhanced 2D Diagram**
   - Use the included `BodyPartSelector2D`
   - More precise touch detection
   - Better for low-end devices
   - Faster to implement

## 3D Model Requirements

### Model Specifications

- **Format**: GLB (glTF Binary)
- **Location**: `assets/models/human_body.glb`
- **Style**: Clean, modern, low-poly, gender-neutral
- **Segmentation**: Each body part should be a separate mesh with named identifiers

### Required Body Parts (25 total)

```
head, face, neck
chest, upper_back, lower_back, abdomen
left_arm, right_arm, left_elbow, right_elbow
left_wrist, right_wrist, left_hand, right_hand
left_thigh, right_thigh, left_knee, right_knee
left_leg, right_leg, left_ankle, right_ankle
left_foot, right_foot
```

### Model Generation

See `assets/models/README.md` for detailed instructions on:

- AI generation prompts
- Blender export steps
- Alternative sources
- Troubleshooting

## API Integration

### Request Format

```json
{
  "complaint_text": "I have a severe headache for 3 days",
  "selected_body_part": "head",
  "body_part_index": 1,
  "audio_url": "https://...",
  "created_at": "2025-01-15T10:30:00Z"
}
```

### Body Part Index Mapping

```json
{
  "head": 1,
  "face": 2,
  "neck": 3,
  "chest": 4,
  "upper_back": 5,
  "lower_back": 6,
  "abdomen": 7,
  "left_arm": 8,
  "right_arm": 9,
  "left_elbow": 10,
  "right_elbow": 11,
  "left_wrist": 12,
  "right_wrist": 13,
  "left_hand": 14,
  "right_hand": 15,
  "left_thigh": 16,
  "right_thigh": 17,
  "left_knee": 18,
  "right_knee": 19,
  "left_leg": 20,
  "right_leg": 21,
  "left_ankle": 22,
  "right_ankle": 23,
  "left_foot": 24,
  "right_foot": 25
}
```

## User Flow

1. **User records complaint** (voice or text)
2. **Navigate to body part selection**
   - Screen: `BodyPartSelectionScreen`
   - Shows 3D model with selection overlay
3. **User selects body part**
   - Taps on body part button
   - Visual feedback (highlight, label)
4. **Submit selection**
   - Creates `SymptomComplaint` object
   - Returns to symptom intake screen
   - Continues with doctor matching

## File Structure

```
lib/features/ai/
├── data/
│   └── models/
│       ├── body_part.dart          # Data models
│       └── body_part.g.dart        # Generated JSON serialization
├── presentation/
│   ├── screens/
│   │   └── body_part_selection_screen.dart
│   └── widgets/
│       └── body_part_selector_3d.dart
└── ...

assets/
└── models/
    ├── human_body.glb              # 3D model (to be added)
    └── README.md                   # Model generation guide
```

## Testing Checklist

- [ ] 3D model loads correctly
- [ ] Body part buttons are visible and tappable
- [ ] Selection highlights correctly
- [ ] Label displays selected part name
- [ ] Submit button works
- [ ] Data is correctly formatted for API
- [ ] Works in both English and Twi
- [ ] Performance is acceptable on low-end devices
- [ ] Fallback to 2D works if model fails to load

## Next Steps for Production

1. **Obtain/Generate 3D Model**

   - Follow instructions in `assets/models/README.md`
   - Place GLB file in `assets/models/human_body.glb`

2. **Improve Touch Detection** (Choose one):

   - Implement Unity integration
   - Build custom WebGL viewer
   - Enhance 2D overlay positioning
   - Use hybrid approach

3. **Polish UI/UX**

   - Add smooth transitions
   - Improve button positioning
   - Add haptic feedback
   - Optimize animations

4. **Backend Integration**

   - Create API endpoint for complaint submission
   - Test with real backend
   - Handle errors gracefully

5. **Testing**
   - Test on multiple devices
   - Test with different screen sizes
   - Test offline behavior
   - Test with slow connections

## Troubleshooting

### Model Not Loading

- Check file path: `assets/models/human_body.glb`
- Verify file exists and is valid GLB
- Check console for errors
- Try fallback URL or 2D selector

### Buttons Not Visible

- Check overlay positioning
- Verify body part constants are loaded
- Check for layout issues

### Selection Not Working

- Verify callback is connected
- Check state management
- Verify body part IDs match

### Performance Issues

- Reduce model polygon count
- Simplify textures
- Use 2D fallback on low-end devices
- Optimize animations

## Dependencies

- `model_viewer_plus: ^1.3.0` - 3D model rendering
- `easy_localization: ^3.0.3` - Localization
- `json_annotation: ^4.8.1` - JSON serialization

## Support

For issues or questions:

1. Check `assets/models/README.md` for model generation
2. Review this implementation guide
3. Check TODO.md for overall app progress
4. Test with 2D fallback if 3D has issues
