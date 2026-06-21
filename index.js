import {event_types, eventSource} from "/scripts/events.js";
import {getChatMetadata, getData, getMessageDiv, setChatMetadata, setData} from "./utils.js";
import {renderExtensionTemplateAsync} from "/scripts/extensions.js";
import {
    EXTENSION_NAME,
    EXTENSION_PATH, VERSION
} from "./conf.js";

class StickyNote {

    constructor({ note, prepend, unused }) {
        this.note = note || "";
        this.prepend = prepend ?? false;
        this.unused = unused || "";
        this._messageId = null;
    }

    setMessageId(messageId) {
        this._messageId = messageId;
    }

    toJson() {
        return {
            note: this.note,
            prepend: this.prepend,
            unused: this.unused
        };
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

    const totallyNew = new StickyNote({ note: "", prepend: false, unused: "" });
    totallyNew.setMessageId(null);
    setChatMetadata("initialPrompt", totallyNew.toJson(), false);
    return totallyNew;
}


function imprintStickyNote(textData, chatMessage, context = {}) {
    if (context?.imprint && chatMessage.role === 'user') {
        const msgIndex = context.messageId;
        const ctx = SillyTavern.getContext();
        if (!ctx.chat || ctx.chat.length === 0) {
            return [textData, true];
        }
        const stickyNote = getStickyNoteRaw(msgIndex);
        const note = stickyNote?.note;
        if (!note) return [textData, true];

        const noteText = context.postprocess ? context.postprocess(note) : note;
        // Handle prepending instead of appending if flag is true
        if (stickyNote.prepend) {
            return [noteText + "\n\n" + textData, true];
        } else {
            return [textData + "\n\n" + noteText, true];
        }
    }
    return [textData, true];
}

async function processPrompt(data) {
    if (!data.chat || data.chat.length === 0) return;

    const stickyNoteObj = getStickyNoteRaw(SillyTavern.getContext().chat.length - 1);
    const stickyNote = stickyNoteObj?.note;

    if (stickyNote) {
        for (let i = data.chat.length - 1; i >= 0; i--) {
            if (data.chat[i].role === 'user') {
                // Prepend or append text block conditionally based on setting field
                if (stickyNoteObj.prepend) {
                    data.chat[i].content = `${stickyNote}\n\n${data.chat[i].content}`;
                } else {
                    data.chat[i].content += `\n\n${stickyNote}`;
                }
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

async function openStickyNotePopup(targetElement, currentSnObj, isEditable) {
    // Clear any dangling/existing popups first
    $(".enerccio_stickynote-popup").remove();
    const popupHtml = await renderExtensionTemplateAsync(
        EXTENSION_PATH,
        'popup',
        { title: EXTENSION_NAME, version: VERSION }
    );
    const $popup = $(popupHtml);
    $popup.find(".enerccio_stickynote-textarea").val(currentSnObj.note);
    $popup.find(".enerccio_stickynote-textarea-unused").val(currentSnObj.unused);
    $popup.find("#enerccio_stickynote-prepend-chk").prop("checked", !!currentSnObj.prepend);

    // Set editable property rules clean via DOM injection
    $popup.find("#enerccio_stickynote-prepend-chk").prop("disabled", !isEditable);
    $popup.find(".enerccio_stickynote-textarea").prop("readonly", !isEditable);
    $popup.find(".enerccio_stickynote-textarea-unused").prop("readonly", !isEditable);

    // --- TAB NAVIGATION SELECTION HANDLING ---
    $popup.find(".enerccio_stickynote-tab").on("click", function() {
        const targetTab = $(this).data("tab");
        $popup.find(".enerccio_stickynote-tab").removeClass("active");
        $(this).addClass("active");

        if (targetTab === "active") {
            $popup.find(".enerccio_stickynote-textarea-container-active").show();
            $popup.find(".enerccio_stickynote-textarea-container-unused").hide();
        } else {
            $popup.find(".enerccio_stickynote-textarea-container-active").hide();
            $popup.find(".enerccio_stickynote-textarea-container-unused").show();
        }
    });

    // --- INTERACTIVE ACTIONS LAYER ---
    $popup.find(".enerccio_stickynote-swap-btn").on("click", function() {
        const tmp = currentSnObj.note;
        currentSnObj.note = currentSnObj.unused;
        currentSnObj.unused = tmp;

        if (isEditable) {
            currentSnObj.save();
        }

        $popup.find(".enerccio_stickynote-textarea").val(currentSnObj.note);
        $popup.find(".enerccio_stickynote-textarea-unused").val(currentSnObj.unused);
    });

    // --- VIEW MODE MODIFIER FUNCTIONS ---
    const applyViewMode = ($p) => {
        if (window.enerccio_stickynote_single) {
            $p.find(".enerccio_stickynote-tabs-header").hide();
            $p.addClass("enerccio_stickynote-single-view-layout");
            $p.find(".enerccio_stickynote-textarea-container-active").show();
            $p.find(".enerccio_stickynote-textarea-container-unused").show();
            // Switch button visualization to allow collapsing back to tab view
            $p.find(".enerccio_stickynote-single-btn").html('<i class="fa-solid fa-window-restore"></i> Tabbed View');
        } else {
            $p.find(".enerccio_stickynote-tabs-header").show();
            $p.removeClass("enerccio_stickynote-single-view-layout");
            // Reactivate whichever tab was last selected
            $p.find(".enerccio_stickynote-tab.active").trigger("click");
            // Reset button visualization back to default
            $p.find(".enerccio_stickynote-single-btn").html('<i class="fa-solid fa-table-columns"></i> Single View');
        }
    };

    $popup.find(".enerccio_stickynote-single-btn").on("click", function() {
        // Toggle the global state cleanly back and forth
        window.enerccio_stickynote_single = !window.enerccio_stickynote_single;
        applyViewMode($popup);
        repositionPopup();
    });

    applyViewMode($popup);

    // Append directly to body to clear parent flex/overflow limitations safely
    $("body").append($popup);

    function repositionPopup() {
        // --- VIEWPORT PIXEL CALCULATIONS ---
        const $button = $(targetElement);
        const offset = $button.offset();
        const buttonWidth = $button.outerWidth();
        const buttonHeight = $button.outerHeight();
        const popupWidth = $popup.outerWidth();
        const popupHeight = $popup.outerHeight();
        // Default to opening upwards (float above the icon)
        let topPosition = offset.top - popupHeight - 8;
        // --- BOUNDS & LOCATION HANDLING ---
        const scrollTop = $(window).scrollTop();
        const isMainChatBtn = $button.attr('id') === 'enerccio_stickynote-prompt-btn';
        // Force downwards position for the main chat button or if opening upwards clips off the top viewport screen
        if (isMainChatBtn || topPosition < scrollTop) {
            topPosition = offset.top + buttonHeight + 8;
            // Safety fallback: If opening downwards clips past the bottom viewport window boundary,
            // flip it back upwards ONLY if there is enough space available above.
            const windowHeight = $(window).height();
            if (topPosition + popupHeight > scrollTop + windowHeight && (offset.top - popupHeight - 8) >= scrollTop) {
                topPosition = offset.top - popupHeight - 8;
            }
        }

        // --- HORIZONTAL DIRECTION TRACKING ---
        let leftPosition;
        if (isMainChatBtn) {
            // Bottom side primary controls: align left edge with button tracking, letting it stretch out towards the right
            leftPosition = offset.left;
        } else {
            // Historical chat log messages: align right edges together, keeping the frame pushed back left
            leftPosition = offset.left + buttonWidth - popupWidth;
        }

        // Apply the fixed window screen positioning styles
        $popup.css({
            position: 'absolute',
            top: `${topPosition}px`,
            left: `${leftPosition}px`
        });
    }

    repositionPopup();

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
        const $textareaUnused = $popup.find(".enerccio_stickynote-textarea-unused");
        const $checkbox = $popup.find("#enerccio_stickynote-prepend-chk");

        $textarea.on("input", function() {
            currentSnObj.note = $(this).val();
            currentSnObj.save();
        });
        $textareaUnused.on("input", function() {
            currentSnObj.unused = $(this).val();
            currentSnObj.save();
        });
        $checkbox.on("change", function() {
            currentSnObj.prepend = $(this).is(":checked");
            currentSnObj.save();
        });
        $textarea.on("focus", function(e) {
            e.stopPropagation();
        });
        $textareaUnused.on("focus", function(e) {
            e.stopPropagation();
        });
    }
}

window.enerccio_stickynote_triggerView = async function(element, messageIndex, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (messageIndex === undefined || messageIndex === null) return;

    const sn = getStickyNoteRaw(messageIndex);
    // Mount the non-modal lookup view popup directly onto the target element icon node frame
    await openStickyNotePopup(element, sn, false);
};

function renderMessageIcon(ctx, i) {
    const $msgDiv = getMessageDiv(i);
    if (!$msgDiv) return;
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

function renderMessageIcons() {
    const ctx = SillyTavern.getContext();
    if (!ctx.chat) return;
    for (let i = 0; i < ctx.chat.length; i++) {
        renderMessageIcon(ctx, i);
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
    $promptBtnContainer.find("#enerccio_stickynote-prompt-btn").on("click", async function(e) {
        e.stopPropagation();
        const ctx = SillyTavern.getContext();
        const currentDepth = ctx.chat ? ctx.chat.length - 1 : -1;
        const sn = getStickyNoteRaw(currentDepth);

        // Opens the editable non-modal popup relative to this button
        await openStickyNotePopup(this, sn, true);
    });
    // Append it cleanly into the left form section right next to the extensionsMenuButton
    $promptBtnContainer.insertAfter('#extensionsMenuButton');
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

    eventSource.on(event_types.APP_INITIALIZED, async () => {
        renderMessageIcons();
        initPromptAreaUI();
    });

    window.enerccio_compat?.messageProcessor.registerHandler(imprintStickyNote);
});
