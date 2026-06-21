# SillyTavern-StickyNote

A SillyTavern extension that introduces context-preserving "Sticky Notes" to track variables, world state modifications, active effects, or narrative details over time. The notes are injected directly into your prompts on user generation cycles and track context shifts visually across your chat timeline history.

## Features

- **Live Prompt Editor & Dashboard:** Adds an interactable sticky note button directly into your chat entry row panel next to your default system controls. Clicking it toggles a clean, non-modal overlay panel with compact, space-efficient controls aligned inline with your settings.
- **Dual-State Storage (Active & Unused):** Provides two separate text persistence domains. The **Active** note is actively prepared for context operations, while the **Unused** tab acts as an isolated scratchpad buffer area to store backup definitions, historical items, or upcoming system states without executing them.
- **Instant Content Swapping:** Includes a dedicated **Swap** action control to instantly swap text data between your Active prompt and your Unused scratchpad without needing manual copy-pasting.
- **Togglable Side-by-Side Single View:** Dynamically toggles your control mode via the **Single View** button. Turning it on stretches the dashboard horizontally, hides individual navigation tabs, and displays both textareas side-by-side for seamless multi-task editing. Clicking it again collapses the dashboard back into its default streamlined tabbed view.
- **Context Injection:** Seamlessly appends or prepends the active sticky note string to user messages during the chat completion prompt generation phase based on your configuration preferences.
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
