let recognition = null;
let isListening = false;

function createButton() {
  if (!document.body) return;

  if (document.getElementById("speech-transcriber-button")) {
    return;
  }

  const button = document.createElement("button");

  button.id = "speech-transcriber-button";
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
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.35)"
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
  const button = document.getElementById(
    "speech-transcriber-button"
  );

  if (!button) return;

  if (isListening) {
    button.textContent = "Stop Listening";
    button.style.backgroundColor = "#b91c1c";
  } else {
    button.textContent = "Start Listening";
    button.style.backgroundColor = "#212121";
  }
}

function startListening() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }

  recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    isListening = true;
    updateButton();
    console.log("Speech recognition started.");
  };

  recognition.onresult = event => {
    let finalText = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript + " ";
      }
    }

    if (finalText.trim()) {
      insertIntoChatGPT(finalText);
      console.log("Recognized:", finalText);
    }
  };

  recognition.onerror = event => {
    console.error("Speech error:", event.error);

    if (event.error === "not-allowed") {
      alert("Please allow microphone permission.");
    }
  };

  recognition.onend = () => {
    if (isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error("Restart error:", error);
      }
    }
  };

  recognition.start();
}

function stopListening() {
  isListening = false;

  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }

  updateButton();
  console.log("Speech recognition stopped.");
}

function findChatGPTInput() {
  return (
    document.querySelector("#prompt-textarea") ||
    document.querySelector(
      'div[contenteditable="true"][data-lexical-editor="true"]'
    ) ||
    document.querySelector(
      'div[contenteditable="true"][role="textbox"]'
    ) ||
    document.querySelector("textarea")
  );
}

function insertIntoChatGPT(text) {
  const input = findChatGPTInput();

  if (!input) {
    console.error("ChatGPT input box not found.");
    return;
  }

  input.focus();

  if (input.tagName === "TEXTAREA") {
    const currentValue = input.value || "";

    const valueSetter =
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;

    if (valueSetter) {
      valueSetter.call(input, currentValue + text);
    } else {
      input.value = currentValue + text;
    }

    input.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );

    return;
  }

  const selection = window.getSelection();
  const range = document.createRange();

  range.selectNodeContents(input);
  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);

  document.execCommand(
    "insertText",
    false,
    text
  );

  input.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text
    })
  );
}

function maintainButton() {
  if (
    !document.getElementById(
      "speech-transcriber-button"
    )
  ) {
    createButton();
    updateButton();
  }
}

createButton();

const observer = new MutationObserver(() => {
  maintainButton();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

setInterval(maintainButton, 2000);