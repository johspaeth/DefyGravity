# Main flows

The first deployed preview was opened in Comet before this regression pass. It loaded the 72-plank Sky tower through the hosted Lean backend and rendered with Three.js WebGL. This checklist is outside the deployed `dist` directory.

## Enter the workshop

- Start: the app, on desktop or a 375px-wide phone.
- Steps: wait for the Lean connection.
- Expect: Sky tower, 72 planks, 28.8 cm, and “Static equilibrium checked”. The canvas and essential controls fit without horizontal scrolling.

## Explore six theorems in 3D

- Open Proof tour in the header or Explore six theorems in 3D in the proof dialog.
- Select all six theorems. Read meaning, So what, What Lean provides, How, and Why it matters for AI. Expand the exact statement, extracted from the unchanged proved source.
- Lower/raise the ghost, try an overlapping lower placement, scrub the insertion route, spend the final plank and try a fourth, scrub a bridge replay, and tamper with/restore a force certificate.
- Check actual Lean responses in a separate session. Distinguish illustrative geometry, live example checks, and build-time proofs.
- Orbit/refit, resize desktop → phone → desktop, exit, Undo and Save. The original record/history must remain unchanged and only one live canvas may exist.
- Interrupt a request and close during a delayed response. No stale green result or delayed scene replacement after exit is allowed.

## Build and edit

- Steps: select Start fresh, Add plank, a pose, Rotate, and Place. Move the placement target with the pointer or arrow keys. Try all six axis-aligned orientations.
- Expect: the preview matches the position accepted by Lean. Count, height, inventory, and certificate update together.
- Steps: Remove a visible plank; Undo with the button and keyboard.
- Expect: the intended plank disappears, and Undo restores the canonical scene.

## Explore and refit

- Steps: Explore, drag to orbit, zoom in/out, and Fit view.
- Expect: the scene moves naturally. Fit frames the actual scene, including moving physics bodies and larger imported scenes. Full-resolution backing pixels match the stage.

## Try the four starter structures

- Steps: select Sky tower, Little bridge, Domino garden, and The tipping point.
- Expect: 72, 27, 24, and 2 planks respectively. The first three are certified; The tipping point says “Not certified”, not “proved to collapse”.

## Inspect static load paths and proof scope

- Steps: toggle See the load paths, open the certificate dialog, and follow the specification and check-log links.
- Expect: load paths appear only for the displayed certified static record. The dialog explains assumptions, exclusions, kernel/Comparator results, and pending human review.
- On phones, use the load-path button inside the proof dialog.

## Replay the construction

- Steps: Replay construction sequence; previous/next; slider; Play/Pause; Check every step; close.
- Expect: exactly the selected prefix appears. Pause cancels even an in-flight delayed step. Closing restores the full build. Every-step results refer to the same canonical revision.

## Play with gravity

- Steps: Test gravity or Play; Nudge; Earthquake; Pause/Resume; Slow mo on/off; Fit view; Rebuild.
- Expect: bodies move in the separate Rapier simulation, explicitly labeled unverified. Pause freezes position, rotation, and time. Rebuild restores the exact original Lean record.
- On a persistently slow hardware GPU, simpler Canvas shading replaces the surface without resetting poses or the camera. After that transition, test pointer picking, orbit, placement, and rebuild again.
- Steps: select Domino garden, Play, then Nudge.
- Expect: a visible domino chain reaction.

## Save and reopen

- Steps: Save build; Start fresh; Open a build and select the downloaded JSON.
- Expect: the exact record, integer certificate strings, and static status round-trip through Lean.
- Steps: import a record with a tampered certificate.
- Expect: visible rejection without changing the current record or showing a false certificate.

## Help and sound

- Steps: open Help, expand Keyboard shortcuts, close with the button or Escape; toggle sound off/on.
- Expect: readable instructions, working focus/close behavior, and user-gesture audio activation. Mute/unmute changes the audio state.

## Failure and recovery

- Steps: interrupt the backend connection during an edit, then reload with the backend available.
- Expect: “Lean disconnected”; editing and saving disabled rather than a stale green status. Reload reconnects to a new workshop.
- Transport checks: wrong visitor/token, reserved or unknown commands, malformed and oversized bodies.
- Expect: rejection without changing another session.

## Responsive and hosted regression checks

- Resize the same page desktop → 375px phone → desktop, plus a short 1280×600 window.
- Inspect build, placement, load paths, dialogs, and physics controls. Short windows may scroll vertically but must not clip controls.
- After deployment, use a fresh hosted context and repeat startup, an edit, a preset, gravity, and JSON export/import through the real backend proxy.
- Check small-label contrast, console errors, sharpness, and real-time frame rate separately from functional assertions.
