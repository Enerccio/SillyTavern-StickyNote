import {event_types, eventSource} from "/scripts/events.js";
import {getChatMetadata, getData, setChatMetadata, setData, getMessageDiv} from "./utils.js";

class StickyNote {

    constructor({ note }) {
        this.note = note || "";
        this._messageId = null;
    }

    setMessageId(messageId) {
        this._messageId = messageId;
    }

    toJson() {
        return { note: this.note };
    }

    static fromJson(json) {
        return new StickyNote(json);
    }

    save() {
        if (this._messageId !== null && this._messageId !== undefined) {
            const ctx = SillyTavern.getContext();
            const message = ctx.chat[this._messageId];
            if (message) {
                setData(message, "stickyNote", this.toJson());
            }
        } else {
            setChatMetadata("initialPrompt", this.toJson(), false);
        }
    }

}

function getStickyNote() {
    const ctx = SillyTavern.getContext();
    if (!ctx.chat || ctx.chat.length === 0) {
        return getChatMetadata("initialPrompt", false)?.note || "";
    }
    const stickyNote = getStickyNoteRaw(ctx.chat.length - 1);
    return stickyNote?.note;
}

function getStickyNoteRaw(depth) {
    const ctx = SillyTavern.getContext();

    // Iterate backward down to 0 inclusively
    for (let i = depth; i >= 0; i--) {
        const message = ctx.chat[i];
        const stickyNote = getData(message, "stickyNote");
        if (stickyNote) {
            const sn = StickyNote.fromJson(stickyNote);
            sn.setMessageId(i);
            return sn;
        }
    }

    const initial = getChatMetadata("initialPrompt", false);
    if (initial) {
        const sn = StickyNote.fromJson(initial);
        sn.setMessageId(null);
        return sn;
    }

    const totallyNew = new StickyNote({ note: "" });
    totallyNew.setMessageId(null);
    setChatMetadata("initialPrompt", totallyNew.toJson(), false);
    return totallyNew;
}


function imprintStickyNote(textData, chatMessage, context = {}) {
    if (context?.imprint) {
        const msgIndex = context.messageId;
        const ctx = SillyTavern.getContext();
        if (!ctx.chat || ctx.chat.length === 0) {
            return [textData, true];
        }
        const stickyNote = getStickyNoteRaw(msgIndex);
        const note = stickyNote?.note;
        const noteText = context.postprocess ? context.postprocess(note) : note;
        return [textData + "\n\n" + noteText, true];
    }
    return [textData, true];
}

async function processPrompt(data) {
    let stickyNote = getStickyNote();

    if (stickyNote) {
        for (let i = data.chat.length - 1; i >= 0; i--) {
            if (data.chat[i].role === 'user') {
                data.chat[i].content += `\n\n${stickyNote}`;
                return;
            }
        }
    }
}

async function copyStickyNote(messageId) {
    const ctx = SillyTavern.getContext();
    const stickyNote = getStickyNoteRaw(ctx.chat.length - 1);

    const newStickyNote = StickyNote.fromJson(stickyNote.toJson());
    newStickyNote.setMessageId(messageId);
    newStickyNote.save();

    renderMessageIcons();
}

function openStickyNotePopup(targetElement, currentSnObj, isEditable) {
    // Clear any dangling/existing popups first
    $(".enerccio_stickynote-popup").remove();

    const popupHtml = `
        <div class="enerccio_stickynote-popup">
            <div class="enerccio_stickynote-popup-header">
                <span>Sticky Note</span>
                <span class="enerccio_stickynote-popup-close fa-solid fa-xmark"></span>
            </div>
            <textarea class="enerccio_stickynote-textarea" ${!isEditable ? 'readonly' : ''}></textarea>
        </div>
    `;

    const $popup = $(popupHtml);
    $popup.find(".enerccio_stickynote-textarea").val(currentSnObj.note);

    // Append directly to body to clear parent flex/overflow limitations safely
    $("body").append($popup);

    // --- VIEWPORT PIXEL CALCULATIONS ---
    const $button = $(targetElement);
    const offset = $button.offset();
    const buttonWidth = $button.outerWidth();
    const popupWidth = $popup.outerWidth();
    const popupHeight = $popup.outerHeight();

    // Calculate vertical alignment (float right above the icon)
    let topPosition = offset.top - popupHeight - 8;
    // Calculate horizontal alignment (right-aligned to the icon button edge)
    let leftPosition = offset.left + buttonWidth - popupWidth;

    // Apply the fixed window screen positioning styles
    $popup.css({
        position: 'absolute',
        top: `${topPosition}px`,
        left: `${leftPosition}px`
    });

    // Prevent events inside the popup from bubbling up
    $popup.on("click mousedown mouseup", function(e) {
        e.stopPropagation();
    });

    $popup.find(".enerccio_stickynote-popup-close").on("click", function(e) {
        e.stopPropagation();
        $popup.remove();
    });

    if (isEditable) {
        const $textarea = $popup.find(".enerccio_stickynote-textarea");

        $textarea.on("input", function() {
            currentSnObj.note = $(this).val();
            currentSnObj.save();
        });

        $textarea.on("focus", function(e) {
            e.stopPropagation();
        });
    }
}

window.enerccio_stickynote_triggerView = function(element, messageIndex, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (messageIndex === undefined || messageIndex === null) return;

    const sn = getStickyNoteRaw(messageIndex);

    // Mount the non-modal lookup view popup directly onto the target element icon node frame
    openStickyNotePopup(element, sn, false);
};

function renderMessageIcons() {
    const ctx = SillyTavern.getContext();
    if (!ctx.chat) return;

    for (let i = 0; i < ctx.chat.length; i++) {
        const $msgDiv = getMessageDiv(i);
        if (!$msgDiv) continue;

        // Clean old buttons to handle rerenders safely
        $msgDiv.find(".enerccio_stickynote-icon-btn").remove();

        const currentSn = getStickyNoteRaw(i);
        let isChanged = false;

        if (i > 0) {
            const previousSn = getStickyNoteRaw(i - 1);
            if (currentSn.note !== previousSn.note) {
                isChanged = true;
            }
        }

        const baseClasses = "mes_button enerccio_stickynote-icon-btn interactable";
        const iconClass = isChanged
            ? `${baseClasses} fa-solid fa-sticky-note enerccio_stickynote-changed`
            : `${baseClasses} fa-regular fa-sticky-note`;

        // FIX: Added direct global function invocation lookup inside an inline onclick property
        // Added pointer-events: auto !important to guarantee click detection tracking
        const $iconBtn = $(`
            <div title="View Sticky Note"
                 class="${iconClass}"
                 tabindex="0"
                 role="button"
                 onclick="window.enerccio_stickynote_triggerView(this, ${i}, event)"
                 style="position: relative; display: inline-flex; margin-left: 4px; pointer-events: auto !important;"></div>
        `);

        // Insert safely right AFTER the container to bypass flashing cycles
        $msgDiv.find(".mes_buttons").after($iconBtn);
    }
}

function initPromptAreaUI() {
    // Prevent duplicating the button if it's already rendered
    if ($("#enerccio_stickynote-prompt-btn").length > 0) return;

    // Build the new sticky note button inside a relative container for the non-modal popup positioning
    const $promptBtnContainer = $(`
        <div class="enerccio_stickynote-prompt-container">
            <div id="enerccio_stickynote-prompt-btn"
                 class="fa-solid fa-note-sticky interactable"
                 title="Edit Prompt Sticky Note"
                 tabindex="0"></div>
        </div>
    `);

    $promptBtnContainer.find("#enerccio_stickynote-prompt-btn").on("click", function(e) {
        e.stopPropagation();
        const ctx = SillyTavern.getContext();
        const currentDepth = ctx.chat ? ctx.chat.length - 1 : -1;
        const sn = getStickyNoteRaw(currentDepth);

        // Opens the editable non-modal popup relative to this button
        openStickyNotePopup(this, sn, true);
    });

    // Append it cleanly into the left form section right next to the extensionsMenuButton
    $("#leftSendForm").append($promptBtnContainer);
}

$(async function () {
    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, async (data) => {
        await processPrompt(data);
    });

    for (let event of [event_types.CHARACTER_MESSAGE_RENDERED, event_types.MESSAGE_SENT]) {
        eventSource.on(event, async (messageId) => {
            await copyStickyNote(messageId);
        });
    }

    eventSource.on(event_types.CHAT_CHANGED, () => {
        renderMessageIcons();
        initPromptAreaUI();
    });

    // Fallback UI generation buffer
    setTimeout(() => {
        renderMessageIcons();
        initPromptAreaUI();
    }, 800);

    window.enerccio_compat?.messageProcessor.registerHandler(imprintStickyNote);
});
