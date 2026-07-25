const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const copyButton = document.getElementById("copyButton");
const clearButton = document.getElementById("clearButton");

const transcriptBox = document.getElementById("transcript");
const interimText = document.getElementById("interimText");
const statusText = document.getElementById("status");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let shouldContinue = false;

if (!SpeechRecognition) {
  statusText.textContent =
    "Speech recognition is not supported in this browser.";

  startButton.disabled = true;
} else {
  recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-IN";

  recognition.onstart = () => {
    statusText.textContent = "Status: Listening";
    statusText.className = "listening";
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let temporaryText = "";

    for (
      let index = event.resultIndex;
      index < event.results.length;
      index++
    ) {
      const text = event.results[index][0].transcript;

      if (event.results[index].isFinal) {
        finalText += text;
      } else {
        temporaryText += text;
      }
    }

    if (finalText) {
      transcriptBox.value += finalText.trim() + " ";
      transcriptBox.scrollTop = transcriptBox.scrollHeight;
    }

    interimText.textContent = temporaryText;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);

    if (event.error === "not-allowed") {
      shouldContinue = false;

      statusText.textContent =
        "Microphone permission was denied.";
    }
  };

  recognition.onend = () => {
    interimText.textContent = "";

    if (shouldContinue) {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (error) {
          console.error(error);
        }
      }, 300);
    } else {
      statusText.textContent = "Status: Stopped";
      statusText.className = "stopped";
    }
  };
}

startButton.addEventListener("click", () => {
  if (!recognition) {
    return;
  }

  shouldContinue = true;

  try {
    recognition.start();
  } catch (error) {
    console.log("Recognition is already running.");
  }
});

stopButton.addEventListener("click", () => {
  shouldContinue = false;

  if (recognition) {
    recognition.stop();
  }
});

copyButton.addEventListener("click", async () => {
  const text = transcriptBox.value.trim();

  if (!text) {
    alert("There is no text to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied";

    setTimeout(() => {
      copyButton.textContent = "Copy All";
    }, 1500);
  } catch (error) {
    transcriptBox.select();
    document.execCommand("copy");
  }
});

clearButton.addEventListener("click", () => {
  transcriptBox.value = "";
  interimText.textContent = "";
});