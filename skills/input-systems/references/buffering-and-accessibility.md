# Buffer tuning, devices, touch, and accessibility

Contents: buffer windows; device detection and button prompts; touch controls; accessibility
checklist; placement in the loop.

## Buffer windows

A buffer remembers a discrete press that arrived a bit before it became legal (an attack during
recovery, a dodge during a landing, a menu confirmation during a transition) and triggers it the
moment it's allowed.

- Typical window: 100-200 ms. Combo links in fighting games are often tighter and fixed per hit;
  a menu confirmation can be longer.
- Express windows in game-time seconds, not frames, so they survive framerate changes, pause,
  and hit-stop.
- Consume on trigger so one press yields one action, and clear the buffer on death, scene
  change, and cutscenes.
- Too long feels mushy and triggers unwanted actions; too short feels unresponsive. Expose the
  window as a constant so it can be tuned from playtest reports.
- Jump buffering and coyote time are the same idea applied to the jump controller;
  `platformer` owns them and their numbers.

## Device detection and button prompts

- Track the **last device used**: when an event arrives, note whether it came from
  keyboard/mouse, a gamepad (and which family), or touch, and swap glyphs and tutorial text
  accordingly.
- Map buttons to **positions** (South, East, West, North), then pick the icon set by family.
  SDL3 names buttons this way (`SDL_GAMEPAD_BUTTON_SOUTH` and similar, with
  `SDL_GetGamepadButtonLabel` and `SDL_GetGamepadType` for the printed label and the family), and
  so does Godot 4.7, whose desktop and iOS joypad driver is SDL3: `JOY_BUTTON_A` is the bottom
  button, which is Xbox A, PlayStation Cross, and Nintendo B. Read the family from
  `Input.get_joy_name()` and `Input.get_joy_info()` (vendor and product IDs). On Android and Web
  `get_joy_info()` is empty, so fall back to `get_joy_name()` there.
- **Steam Input** can sit between the gamepad and the game. When enabled for a controller, the
  game sees an Xbox-style emulated gamepad, so name and ID checks report Xbox for a PlayStation
  or Switch controller. Ask Steam for the real type
  (`ISteamInput::GetControllerForGamepadIndex` plus `GetInputTypeForHandle`; Godot exposes the
  index as `steam_input_index` in `get_joy_info()`), or fetch Steam's own art
  (`GetGlyphPNGForActionOrigin` / `GetGlyphSVGForActionOrigin`).
- Support **hot-swapping**: a player can start on keyboard and pick up a gamepad mid-session.
  Re-resolve prompts on device change with no restart.

## Touch controls

- On-screen controls sized for thumbs (virtual stick and buttons) or gestures, routed through
  the same actions as physical input.
- A virtual stick uses a floating origin (anchored where the thumb lands) and the same radial
  deadzone as a physical stick.
- Avoid precise multi-touch chords; use large touch areas and forgiving timing. Ask the user to
  test on the smallest and largest target screens and report missed or accidental taps.

## Accessibility checklist

- Full remap of every action for every device, with conflict handling and reset to defaults.
- Toggle vs hold for actions that default to held (aim, crouch, sprint).
- No simultaneous input required for essential actions; offer single-input or sequential
  alternatives.
- Adjustable stick sensitivity and deadzone, plus optional aim assist.
- Adjustable timing windows where possible (longer buffers, slower quick-time events), and a
  hold option rather than button mashing.
- Independent X and Y inversion for camera and movement.
- No artificial input delay; process discrete presses on the frame or tick they arrive.

## Placement in the loop

- Read held and axis state in the physics step so movement stays in sync with the simulation
  (see `physics-tuning`).
- Capture discrete presses as events, or with a "just pressed" check in the step that uses them,
  so a press between two physics ticks isn't lost. Godot's `is_action_just_pressed` still
  returns true for a quickly released press, so a fast tap isn't lost.
- Load saved bindings at startup before the first gameplay frame.
