
Assessment:
The remaining picking problem is not just “small hit areas.” The current editor still uses broad rectangular hit-testing for every object, which breaks down for layered designs:

- Shapes intercept clicks in invisible areas:
  - circles use their full bounding box, so clicks in empty corners still select the circle
  - lines use a rectangle instead of distance-to-line tolerance
- Text bounds are approximate, so text can be harder to target accurately than it looks
- The topmost matching object always wins on first click, so layered items feel sticky
- Click-through only works after the top layer is already selected, which is not how Canva/Figma-style selection usually feels
- Drag starts immediately on mousedown, so attempts to “just select” often turn into accidental moves
- Text still lacks the same direct-manipulation affordances as shapes/logos

Recommended approach:
1. Replace generic bounding-box picking with object-aware hit testing
   - text: use measured text metrics
   - circle: ellipse math hit test
   - line: point-to-segment distance with tolerance
   - rect/logo: rectangular hit test
   - ignore transparent/outside regions instead of letting them steal clicks

2. Change selection behavior for layered objects
   - first click selects without dragging
   - only begin drag after a small movement threshold
   - when multiple objects overlap, cycle candidates on repeated click at the same point
   - prefer the smallest/topmost valid candidate instead of the first broad bounding box hit

3. Improve Canva-like feedback
   - hover the exact candidate that would be selected
   - show a clearer selected state for text too
   - sync hover/selection with the Layers panel so users can confirm what they are targeting

4. Add a stronger fallback for complex stacks
   - “Select next below” action/shortcut
   - optional temporary lock/isolate from the Layers panel
   - keep manual layer selection as the escape hatch when canvas picking is ambiguous

5. Clean up related editor issues found during assessment
   - fix the dialog accessibility warning by adding a description
   - fix the DropdownMenu ref warning in AssetEditorDialog
   - consolidate canvas interaction helpers so hit-testing and rendering use the same geometry rules

Files to update:
- src/hooks/canvas/useCanvasInteraction.ts
- src/hooks/useCanvasEditor.ts
- src/components/media/AssetEditorDialog.tsx
- src/hooks/canvas/canvasTypes.ts (only if shared geometry types are needed)

Implementation priority:
1. Shape-aware hit testing
2. Click-select vs drag threshold
3. Better overlap candidate selection/cycling
4. Text selection parity and stronger visual feedback
5. Console warning cleanup

Expected result:
Layered text, shapes, and logos should feel much more predictable: clicks should target the visible object under the pointer, first click should select instead of accidentally move, and overlapping items should be easier to cycle through like in modern graphics editors.
