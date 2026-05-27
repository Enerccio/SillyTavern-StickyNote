
import {event_types, eventSource} from "/scripts/events.js";
import {getChatMetadata, getData, setChatMetadata, setData} from "./utils.js";

class StickyNote {

    constructor({ note }) {
        this.note = note;
        this._messageId = null;
    }

    setMessageId(messageId) {
        this._messageId = messageId;
    }

    toJson() {
        return Object.assign({}, this);
    }

    static fromJson(json) {
        return new StickyNote(json);
    }

    save() {
        if (this._messageId !== null) {
            const ctx = SillyTavern.getContext();
            const message = ctx.chat[this._messageId];
            setData(message, "stickyNote", this.toJson());
        } else {
            setChatMetadata("initialPrompt", this.toJson(), false);
        }
    }

}

function getStickyNote() {
    const ctx = SillyTavern.getContext();
    const stickyNote = getStickyNoteRaw(ctx.chat.length - 1);
    return stickyNote?.note;
}

function getStickyNoteRaw(depth) {
    const ctx = SillyTavern.getContext();

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
        return StickyNote.fromJson(initial);
    }

    const totallyNew = new StickyNote({ note: "" });
    setChatMetadata("initialPrompt", totallyNew.toJson(), false);
    return totallyNew;
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
});
