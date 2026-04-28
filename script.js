(function () {
  let assistant;
  let processingTimer;
  let wakeRestartTimer;
  let wakeStopTimer;
  let installPromptEvent = null;
  let wakeMode = false;
  let awaitingCommand = false;

  function getSelectedLanguage() {
    return document.getElementById("languageSelect").value;
  }

  function isWakeRecoverable(error) {
    return !error || ["no-speech", "silence-timeout", "speech-not-decoded", "no-input"].includes(error);
  }

  function setIdle() {
    clearTimeout(wakeRestartTimer);
    JarvisUI.setMode("idle");
    JarvisUI.setStatus("Idle", "Standby");
    JarvisUI.setWakeStatus("Off");
    JarvisUI.setCoreStatus("Tap mic to arm wake mode", "Wake phrase: Hey Jarvis");
    JarvisUI.updateWaveform(false);
    JarvisUI.setMicActive(false);
  }

  function setWakeUi() {
    if (awaitingCommand) {
      JarvisUI.setMode("awake");
      JarvisUI.setStatus("Awake", "Say command now");
      JarvisUI.setWakeStatus("Jarvis heard");
      JarvisUI.setCoreStatus("Jarvis is awake. Say the command.", "Awaiting command");
      JarvisUI.setTranscript("Jarvis awake. Say a command like open YouTube.");
      return;
    }

    JarvisUI.setMode("armed");
    JarvisUI.setStatus("Armed", "Say Hey Jarvis");
    JarvisUI.setWakeStatus("Waiting");
    JarvisUI.setCoreStatus("Say Hey Jarvis to activate", "Wake phrase: Hey Jarvis");
    JarvisUI.setTranscript('Wake mode armed. Say "Hey Jarvis" first.');
  }

  async function startWakeListening(delay = 0) {
    clearTimeout(wakeRestartTimer);
    if (!wakeMode || assistant.listening) return;

    wakeRestartTimer = setTimeout(async () => {
      if (!wakeMode || assistant.listening) return;
      setWakeUi();
      JarvisUI.setMicActive(true);
      const started = await assistant.start(getSelectedLanguage(), {
        timeoutMs: awaitingCommand ? 10000 : 18000,
      });
      if (!started && wakeMode) {
        wakeMode = false;
        awaitingCommand = false;
        setIdle();
      }
    }, delay);
  }

  function stopJani(options = {}) {
    wakeMode = false;
    awaitingCommand = false;
    clearTimeout(wakeRestartTimer);
    clearTimeout(wakeStopTimer);
    clearTimeout(processingTimer);
    JarvisUI.hideActionLink();
    if (assistant?.listening) {
      assistant.stop();
    }
    assistant?.cancelSpeech();
    setIdle();
    JarvisUI.setMicStatus("Ready");
    JarvisUI.setTranscript(options.message || "Jarvis stopped. Tap mic to arm wake mode.");
    if (options.addMessage) {
      JarvisUI.addMessage("system", options.message || "Jarvis stopped.");
    }
  }

  function tryOpenBrowserAction(result, options = {}) {
    if (!result.url) {
      JarvisUI.hideActionLink();
      return;
    }

    const opened = window.open(result.url, "_blank");
    if (opened) {
      opened.opener = null;
      JarvisUI.hideActionLink();
      return;
    }

    JarvisUI.showActionLink(result.url, result.linkLabel || "Open requested tab");
    if (options.sameTabFallback) {
      JarvisUI.addMessage("system", "Chrome blocked the new tab, so I am opening it in this tab instead.");
      setTimeout(() => {
        window.location.href = result.url;
      }, 700);
      return;
    }

    JarvisUI.addMessage("system", "Chrome blocked the automatic new tab. Use the launch button in the System panel.");
  }

  function runCommand(text, options = {}) {
    const commandText = text.trim();
    if (!commandText) return;

    awaitingCommand = false;
    JarvisUI.addMessage("user", commandText);
    JarvisUI.setTranscript(commandText);
    JarvisUI.setMode("processing");
    JarvisUI.setStatus("Processing", "Command analysis");
    JarvisUI.setWakeStatus(wakeMode ? "Command" : "Off");
    JarvisUI.setCoreStatus("Processing command", "Jarvis active");
    JarvisUI.hideActionLink();

    function finishCommand() {
      const result = JarvisCommands.processCommand(commandText);
      if (result.action === "review") {
        JarvisUI.showActionLink(result.url, result.linkLabel || "Review action");
      } else if (result.action === "blocked") {
        if (result.url) JarvisUI.showActionLink(result.url, result.linkLabel || "Open site");
      } else if (options.allowBrowserAction) {
        tryOpenBrowserAction(result, {
          sameTabFallback: Boolean(options.sameTabFallback),
        });
      } else if (result.url) {
        JarvisUI.showActionLink(result.url, result.linkLabel || "Open requested tab");
      }
      JarvisUI.addMessage("system", result.response);
      JarvisUI.setTranscript(result.response);
      JarvisUI.playSound("response");
      assistant.speak(result.response);
    }

    clearTimeout(processingTimer);
    if (options.fast) {
      finishCommand();
    } else {
      processingTimer = setTimeout(finishCommand, 320);
    }
  }

  function handleWakeTranscript(text, error) {
    JarvisUI.playSound("stop");
    JarvisUI.updateWaveform(false);
    clearTimeout(wakeStopTimer);

    if (!wakeMode) {
      setIdle();
      return;
    }

    if (!text) {
      if (isWakeRecoverable(error)) {
        JarvisUI.setMicStatus(error ? "Still armed" : "Listening");
        startWakeListening(450);
        return;
      }

      wakeMode = false;
      awaitingCommand = false;
      JarvisUI.showSpeechProblem(error);
      setIdle();
      return;
    }

    const wakeIntent = JarvisCommands.getWakeIntent(text);

    if (awaitingCommand) {
      const command = wakeIntent.hasWakeWord && wakeIntent.commandText ? wakeIntent.commandText : text;
      runCommand(command, { allowBrowserAction: true, sameTabFallback: true });
      return;
    }

    if (wakeIntent.hasWakeWord) {
      JarvisUI.playSound("response");
      if (wakeIntent.commandText) {
        runCommand(wakeIntent.commandText, { allowBrowserAction: true, sameTabFallback: true });
        return;
      }

      awaitingCommand = true;
      JarvisUI.addMessage("system", "Hey Jarvis heard. Waiting for your command.");
      setWakeUi();
      startWakeListening(500);
      return;
    }

    JarvisUI.setTranscript(`Heard "${text}". Say "Hey Jarvis" first to activate.`);
    startWakeListening(500);
  }

  function handleFinalTranscript(text, error) {
    if (wakeMode) {
      handleWakeTranscript(text, error);
      return;
    }

    JarvisUI.playSound("stop");
    JarvisUI.updateWaveform(false);
    JarvisUI.setMicActive(false);

    if (error && error !== "aborted" && !text) {
      setIdle();
      if (error === "no-speech") {
        JarvisUI.showSpeechProblem(assistant.voiceDetected || assistant.peakLevel > 0.08 ? "speech-not-decoded" : "no-input");
      }
      return;
    }

    if (error === "aborted" && !text) {
      setIdle();
      return;
    }

    if (!text) {
      setIdle();
      JarvisUI.showSpeechProblem("no-speech");
      return;
    }

    runCommand(text, { allowBrowserAction: true, sameTabFallback: true });
  }

  function boot() {
    JarvisUI.init();

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("service-worker.js").catch(() => {
        JarvisUI.addMessage("system", "Install mode needs HTTPS or localhost. Voice mode still works where Chrome allows it.");
      });
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPromptEvent = event;
      document.getElementById("installButton").hidden = false;
    });

    assistant = new JarvisSpeech({
      onStart() {
        JarvisUI.playSound("start");
        if (wakeMode) {
          setWakeUi();
        } else {
          JarvisUI.setMode("listening");
          JarvisUI.setStatus("Listening", "Voice stream active");
          JarvisUI.setWakeStatus("Direct");
          JarvisUI.setCoreStatus("Listening for command", "Direct command");
          JarvisUI.setTranscript("Listening...");
        }
        JarvisUI.setMicStatus("Listening");
        JarvisUI.setMicActive(true);
        JarvisUI.updateWaveform(true);
      },
      onTranscript(text, isInterim) {
        const wakeIntent = JarvisCommands.getWakeIntent(text);
        if (wakeMode && !awaitingCommand && wakeIntent.hasWakeWord) {
          JarvisUI.setMode("awake");
          JarvisUI.setWakeStatus("Jarvis heard");
          JarvisUI.setCoreStatus("Wake phrase detected", "Jarvis active");
          if (!wakeStopTimer) {
            wakeStopTimer = setTimeout(() => {
              wakeStopTimer = null;
              if (assistant?.listening) assistant.stop();
            }, 850);
          }
        }
        JarvisUI.setTranscript(isInterim ? `${text} ...` : text);
      },
      onAudioLevel(level, details) {
        if (assistant?.listening) {
          JarvisUI.updateWaveform(true, level);
          JarvisUI.setMicStatus(details.voiceDetected ? "Audio detected" : "Listening");
        } else {
          JarvisUI.updateWaveform(false);
        }
      },
      onEnd: handleFinalTranscript,
      onError(error) {
        if (wakeMode && isWakeRecoverable(error)) {
          JarvisUI.setMicStatus("Still armed");
          return;
        }
        if (error === "no-speech") {
          JarvisUI.setMicStatus("No words");
          return;
        }
        JarvisUI.showSpeechProblem(error);
        wakeMode = false;
        awaitingCommand = false;
        setIdle();
      },
      onSpeakStart() {
        JarvisUI.setMode("speaking");
        JarvisUI.setStatus("Speaking", "Voice synthesis");
        JarvisUI.setCoreStatus("Speaking response", "Jarvis active");
      },
      onSpeakEnd() {
        if (wakeMode) {
          startWakeListening(700);
        } else {
          setIdle();
        }
      },
      onPermission(state) {
        const labels = {
          granted: "Allowed",
          prompt: "Needs allow",
          denied: "Denied",
          unknown: "Unknown",
        };
        JarvisUI.setMicStatus(labels[state] || state);
      },
    });

    if (!assistant.supported) {
      JarvisUI.showUnsupported();
    } else {
      JarvisUI.setMicStatus("Ready");
      document.getElementById("languageSelect").addEventListener("change", (event) => {
        assistant.setLanguage(event.target.value);
        JarvisUI.setTranscript(`Voice input language set to ${event.target.options[event.target.selectedIndex].text}.`);
      });

      document.getElementById("micButton").addEventListener("click", () => {
        if (wakeMode || assistant.listening) {
          stopJani();
          return;
        }

        wakeMode = true;
        awaitingCommand = false;
        JarvisUI.setStatus("Preparing", "Mic permission check");
        JarvisUI.setWakeStatus("Arming");
        JarvisUI.setCoreStatus("Checking microphone permission", "Wake phrase: Hey Jarvis");
        JarvisUI.setTranscript("Checking microphone permission...");
        startWakeListening();
      });
    }

    document.getElementById("textCommandForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("textCommandInput");
      const command = input.value.trim();
      if (command) {
        input.value = "";
        runCommand(command, { allowBrowserAction: true, fast: true, sameTabFallback: true });
      }
    });

    document.querySelectorAll("[data-command]").forEach((button) => {
      button.addEventListener("click", () => {
        runCommand(button.dataset.command, { allowBrowserAction: true, fast: true, sameTabFallback: true });
      });
    });

    document.getElementById("installButton").addEventListener("click", async () => {
      if (!installPromptEvent) {
        JarvisUI.setTranscript("Install is available only when this page is served from HTTPS or localhost.");
        return;
      }
      installPromptEvent.prompt();
      await installPromptEvent.userChoice;
      installPromptEvent = null;
      document.getElementById("installButton").hidden = true;
    });

    document.getElementById("stopSpeechButton").addEventListener("click", () => {
      stopJani({
        addMessage: true,
        message: "Jarvis stopped and reset.",
      });
    });
  }

  window.addEventListener("DOMContentLoaded", boot);
})();
