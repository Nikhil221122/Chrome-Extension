let recognition = null;
let isListening = false;
let restartTimer = null;
let clearingOldDraft = false;
let draftClearTimer = null;
let committedText = "";
let interimText = "";

let sessionId = 0;

const BUTTON_ID = "speech-transcriber-button";


/* =========================================================
   BUTTON
========================================================= */

function createButton() {
    if (!document.body) return;

    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement("button");

    button.id = BUTTON_ID;
    button.textContent = "Start Listening";

    Object.assign(button.style, {
        position: "fixed",
        bottom: "90px",
        right: "20px",
        zIndex: "2147483647",
        padding: "11px 16px",
        backgroundColor: "#212121",
        color: "#ffffff",
        border: "1px solid #666666",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        boxShadow: "0 4px 15px rgba(0,0,0,0.35)"
    });

    button.addEventListener("click", () => {

        if (isListening) {
            stopListening();
        } else {
            startListening();
        }

    });

    document.body.appendChild(button);
}


function updateButton() {

    const button = document.getElementById(BUTTON_ID);

    if (!button) return;

    if (isListening) {

        button.textContent = "Stop Listening";
        button.style.backgroundColor = "#b91c1c";

    } else {

        button.textContent = "Start Listening";
        button.style.backgroundColor = "#212121";

    }
}


/* =========================================================
   FIND CHATGPT COMPOSER
========================================================= */

function findChatGPTInput() {

    return document.querySelector(
        '#prompt-textarea.ProseMirror[contenteditable="true"]'
    );
}


/* =========================================================
   CLEAR PROSEMIRROR EDITOR
========================================================= */

function clearChatGPTInput() {

    const input = document.querySelector(
        '#prompt-textarea.ProseMirror[contenteditable="true"]'
    );

    if (!input) {
        console.log("ProseMirror composer not found.");
        return false;
    }

    input.focus();

    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(input);

    selection.removeAllRanges();
    selection.addRange(range);

    // Use real browser editing behavior
    document.execCommand("delete", false, null);

    // Put cursor back inside the editor
    input.focus();

    const newRange = document.createRange();
    newRange.selectNodeContents(input);
    newRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(newRange);

    // Notify ProseMirror
    input.dispatchEvent(
        new InputEvent("input", {
            bubbles: true,
            inputType: "deleteContentBackward",
            data: null
        })
    );

    console.log("Composer cleared:", input.innerText);

    return true;
}


/* =========================================================
   WRITE TEXT INTO CHATGPT
========================================================= */

function setChatGPTInput(text) {

    const input = findChatGPTInput();

    if (!input) {

        console.log(
            "ChatGPT ProseMirror input not found."
        );

        return false;
    }

    input.focus();


    /*
     * Select existing content.
     */

    const selection = window.getSelection();

    const range = document.createRange();

    range.selectNodeContents(input);

    selection.removeAllRanges();

    selection.addRange(range);


    /*
     * Replace selected content.
     */

    let success = false;

    try {

        success = document.execCommand(
            "insertText",
            false,
            text
        );

    } catch (error) {

        console.log(
            "insertText failed:",
            error
        );

    }


    /*
     * Fallback.
     */

    if (!success) {

        input.innerHTML = "";

        const paragraph =
            document.createElement("p");

        paragraph.dir = "auto";

        paragraph.textContent = text;

        input.appendChild(paragraph);

    }


    /*
     * Notify ProseMirror/React.
     */

    input.dispatchEvent(
        new InputEvent(
            "input",
            {
                bubbles: true,
                inputType: "insertText",
                data: text
            }
        )
    );


    return true;
}


/* =========================================================
   FORCE CLEAR
========================================================= */

function forceClearComposerUntilSpeech() {

    clearingOldDraft = true;

    clearTimeout(draftClearTimer);

    const clearRepeatedly = () => {

        if (!isListening || !clearingOldDraft) {
            return;
        }

        clearChatGPTInput();

        draftClearTimer = setTimeout(
            clearRepeatedly,
            100
        );
    };

    clearRepeatedly();
}


/* =========================================================
   START LISTENING
========================================================= */

function startListening() {

    if (isListening) return;


    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Speech recognition is not supported in this browser."
        );

        return;
    }


    /*
     * Create a completely NEW session.
     */

    sessionId++;

    const mySessionId = sessionId;


    /*
     * Kill previous recognition.
     */

    if (recognition) {

        try {

            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;

            recognition.stop();

        } catch (error) {}

        recognition = null;
    }


    clearTimeout(restartTimer);


    /*
     * RESET EVERYTHING.
     */

    committedText = "";
    interimText = "";


    /*
     * Start state BEFORE clearing.
     */

    isListening = true;

    updateButton();


    /*
     * IMPORTANT:
     * Remove previous ChatGPT text.
     */

    forceClearComposerUntilSpeech();


    /*
     * Create NEW recognition instance.
     */

    recognition = new SpeechRecognition();


    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.lang = "en-IN";


    /* =====================================================
       ON START
    ===================================================== */

    recognition.onstart = () => {

        if (mySessionId !== sessionId) return;

        console.log(
            "NEW SPEECH SESSION:",
            mySessionId
        );

    };


    /* =====================================================
       ON RESULT
    ===================================================== */

    recognition.onresult = (event) => {

    if (mySessionId !== sessionId) {
        return;
    }

    // Previous ChatGPT draft is no longer allowed
    // to interfere once new speech arrives.
    clearingOldDraft = false;

    clearTimeout(draftClearTimer);

    let finalText = "";
    let newInterimText = "";

    for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
    ) {

        const result = event.results[i];

        const text = result[0].transcript;

        if (result.isFinal) {
            finalText += text;
        } else {
            newInterimText += text;
        }
    }

    if (finalText.trim()) {
        committedText += finalText;
    }

    interimText = newInterimText;

    const currentText =
        committedText + interimText;

    setChatGPTInput(currentText);

    console.log(
        "CURRENT SESSION:",
        currentText
    );
};


    /* =====================================================
       ON ERROR
    ===================================================== */

    recognition.onerror = (event) => {

        if (mySessionId !== sessionId) return;


        console.log(
            "Speech recognition error:",
            event.error
        );


        if (
            event.error ===
            "not-allowed"
        ) {

            isListening = false;

            updateButton();

            alert(
                "Please allow microphone permission."
            );

            return;
        }


        if (
            event.error ===
            "service-not-allowed"
        ) {

            isListening = false;

            updateButton();

            return;
        }

    };


    /* =====================================================
       ON END
    ===================================================== */

    recognition.onend = () => {

        if (
            mySessionId !== sessionId
        ) {
            return;
        }


        if (!isListening) {
            return;
        }


        /*
         * Don't commit interim text.
         */

        interimText = "";


        clearTimeout(
            restartTimer
        );


        restartTimer =
            setTimeout(() => {

                if (
                    !isListening ||
                    !recognition ||
                    mySessionId !== sessionId
                ) {

                    return;
                }


                try {

                    recognition.start();

                    console.log(
                        "Recognition restarted."
                    );

                } catch (error) {

                    console.log(
                        "Restart skipped."
                    );

                }

            }, 100);

    };


    /* =====================================================
       START
    ===================================================== */

    try {

        recognition.start();

        console.log(
            "Starting NEW session:",
            mySessionId
        );

    } catch (error) {

        console.error(
            "Recognition start error:",
            error
        );

        isListening = false;

        updateButton();
    }

}


/* =========================================================
   STOP LISTENING
========================================================= */

function stopListening() {

    sessionId++;

    isListening = false;

    clearingOldDraft = false;

    clearTimeout(restartTimer);
    clearTimeout(draftClearTimer);

    if (recognition) {
        try {
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            recognition.stop();
        } catch (error) {}

        recognition = null;
    }

    committedText = "";
    interimText = "";

    updateButton();

    console.log(
        "Speech session stopped and completely reset."
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

createButton();


setInterval(() => {

    if (
        !document.getElementById(
            BUTTON_ID
        )
    ) {

        createButton();

        updateButton();

    }

}, 3000);