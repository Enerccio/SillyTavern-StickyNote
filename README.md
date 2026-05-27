# SillyTavern-StickyNote

A SillyTavern extension that introduces context-preserving "Sticky Notes" to track variables, world state modifications, active effects, or narrative details over time. The notes are injected directly into your prompts on user generation cycles and track context shifts visually across your chat timeline history.

## Features

- **Live Prompt Editor:** Adds an interactable sticky note button directly into your chat entry row panel (`#leftSendForm`) next to your default system controls. Clicking it toggles an editable, non-modal dashboard overlay popup to tweak notes for upcoming generation cycles.
- **Context Injection:** Seamlessly appends the active sticky note string to the end of user messages during the chat completion prompt generation phase.
- **Historical Timeline Tracking:** Automatically appends static view-only context snapshots right after the message utility controls on every single historic message block in your chat timeline.
- **Discrepancy Visual Alerts:** Automatically tracks structural variance across steps. If a message's sticky note text content changes compared to the step directly preceding it, the timeline icon dynamically switches to a distinct accent highlight color (`var(--SmartThemeQuoteColor)`) to visually alert you of a context shift.
- **True Focus Trapping:** Non-modal overlay tracking captures all inner mouse configurations, event bubbling, and key interaction layers so that writing or selecting text inside the sticky note will never snatch your prompt text focus away.
- **Viewport Coordinate Mapping:** Bypasses aggressive overflow containment and row flex clipping zones by anchoring elements straight to the primary document layout (`body`), calculating coordinates dynamically relative to the trigger node.

## Installation

### Method 1: Using SillyTavern Extensions UI (Recommended)
1. Open the **Extensions Menu** (the magic wand icon) in SillyTavern.
2. Select **Install Extension**.
3. Paste the repository URL into the box:
   [https://github.com/Enerccio/SillyTavern-StickyNote](https://github.com/Enerccio/SillyTavern-StickyNote)

## License

This project is licensed under the terms of the MIT License.
