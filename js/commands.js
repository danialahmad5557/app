(function () {
  const cannedReplies = [
    "Systems are nominal. Jani is listening.",
    "Understood. I can open websites, search the web, and prepare browser-safe actions.",
    "Acknowledged. Keeping everything inside Chrome.",
    "I am here. Say open, search, or prepare a WhatsApp draft.",
  ];

  const wakePattern = /\b(jani|jaani|janii|johnny|jarvis)\b/i;

  const siteAliases = {
    amazon: "https://www.amazon.com",
    chatgpt: "https://chatgpt.com",
    facebook: "https://www.facebook.com",
    github: "https://github.com",
    gmail: "https://mail.google.com",
    google: "https://www.google.com",
    instagram: "https://www.instagram.com",
    linkedin: "https://www.linkedin.com",
    maps: "https://www.google.com/maps",
    netflix: "https://www.netflix.com",
    reddit: "https://www.reddit.com",
    spotify: "https://open.spotify.com",
    tiktok: "https://www.tiktok.com",
    twitter: "https://twitter.com",
    whatsapp: "https://web.whatsapp.com",
    "whatsapp web": "https://web.whatsapp.com",
    wikipedia: "https://www.wikipedia.org",
    x: "https://x.com",
    youtube: "https://www.youtube.com",
  };

  function normalize(text) {
    return text.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ");
  }

  function slug(text) {
    return normalize(text).toLowerCase();
  }

  function stripQuotes(text) {
    return normalize(text).replace(/^["']|["']$/g, "");
  }

  function makeGoogleSearch(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  function makeYouTubeSearch(query) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  }

  function makeWikipediaSearch(query) {
    return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
  }

  function stripWakeWords(input) {
    return input
      .replace(/^(hey\s+|ok\s+)?(jani|jaani|janii|johnny|jarvis|assistant)\b[:,]?\s*/i, "")
      .replace(/\s+\b(jani|jaani|janii|johnny|jarvis|assistant)\b$/i, "")
      .replace(/^(hey|ok)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getWakeIntent(rawText) {
    const text = normalize(rawText);
    const leadingWake = text.match(/^(?:hey\s+|ok\s+)?(jani|jaani|janii|johnny|jarvis)\b[:,]?\s*(.*)$/i);
    if (leadingWake) {
      return {
        hasWakeWord: true,
        commandText: stripWakeWords(leadingWake[2] || ""),
        heardText: text,
      };
    }

    const trailingWake = text.match(/^(.*?)\s+\b(jani|jaani|janii|johnny|jarvis)\b$/i);
    if (trailingWake) {
      return {
        hasWakeWord: true,
        commandText: stripWakeWords(trailingWake[1] || ""),
        heardText: text,
      };
    }

    if (!wakePattern.test(text)) {
      return {
        hasWakeWord: false,
        commandText: "",
        heardText: text,
      };
    }

    return {
      hasWakeWord: false,
      commandText: "",
      heardText: text,
    };
  }

  function ensureUrl(target) {
    const cleanTarget = stripQuotes(target).replace(/\s+/g, "");
    if (/^https?:\/\//i.test(cleanTarget)) return cleanTarget;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(cleanTarget)) return `https://${cleanTarget}`;
    return "";
  }

  function resolveSite(target) {
    const cleanTarget = slug(target)
      .replace(/\b(the|app|website|web|site)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (siteAliases[cleanTarget]) return siteAliases[cleanTarget];

    const directUrl = ensureUrl(target);
    if (directUrl) return directUrl;

    const joined = cleanTarget.replace(/\s+/g, "");
    if (siteAliases[joined]) return siteAliases[joined];

    return `https://www.${joined}.com`;
  }

  function extractSearch(text) {
    const searchMatch =
      text.match(/(?:search\s+google\s+for|google\s+search\s+for|search\s+for)\s+(.+)/i) ||
      text.match(/(?:search|google)\s+(.+?)\s+(?:on|in)\s+google/i) ||
      text.match(/google\s+(?:par\s+)?(?:search\s+)?(?:karo|karna)?\s+(.+)/i) ||
      text.match(/^google\s+(.+)/i);

    if (!searchMatch?.[1]) return null;

    return searchMatch[1]
      .trim()
      .replace(/\s+(on|in)\s+google$/i, "")
      .replace(/\s+search$/i, "");
  }

  function parsePhone(value) {
    const raw = stripQuotes(value);
    const plus = raw.trim().startsWith("+") ? "+" : "";
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length < 8) return "";
    return `${plus}${digits}`;
  }

  function makeWhatsAppTextUrl(phone, message) {
    const normalizedPhone = phone.replace(/[^\d]/g, "");
    return `https://web.whatsapp.com/send?phone=${encodeURIComponent(normalizedPhone)}&text=${encodeURIComponent(message)}`;
  }

  function getWhatsAppCommand(text) {
    const lower = text.toLowerCase();

    const namedSearchDraft =
      text.match(/(?:open\s+)?(?:whatsapp|whats\s*app)(?:\s+web)?\s+and\s+search\s+["'](.+?)["']\s+(?:name\s+)?and\s+(?:message|send)\s+(?:him|her|them)?\s*["'](.+)["']$/i) ||
      text.match(/(?:open\s+)?(?:whatsapp|whats\s*app)(?:\s+web)?\s+and\s+search\s+(.+?)\s+(?:name\s+)?and\s+(?:message|send)\s+(?:him|her|them)?\s+(.+)$/i);

    if (namedSearchDraft) {
      const contactName = stripQuotes(namedSearchDraft[1]);
      const message = stripQuotes(namedSearchDraft[2]);
      return {
        action: "blocked",
        url: siteAliases["whatsapp web"],
        linkLabel: "Open WhatsApp Web",
        response: `I can open WhatsApp Web, but this browser page cannot search private contacts by name or press Send. Contact: ${contactName}. Message: "${message}". Open WhatsApp Web, search the contact yourself, then paste/send it manually. If you give a phone number, I can prepare a draft link for review.`,
      };
    }

    const namedMessageDraft = text.match(/(?:message|send)\s+["'](.+?)["']\s+(?:on|in)\s+(?:whatsapp|whats\s*app)\s+["'](.+)["']$/i);

    if (namedMessageDraft) {
      const message = stripQuotes(namedMessageDraft[1]);
      const contactName = stripQuotes(namedMessageDraft[2]);
      return {
        action: "blocked",
        url: siteAliases["whatsapp web"],
        linkLabel: "Open WhatsApp Web",
        response: `I can open WhatsApp Web, but this browser page cannot search private contacts by name or press Send. Contact: ${contactName}. Message: "${message}". Open WhatsApp Web, search the contact yourself, then paste/send it manually. If you give a phone number, I can prepare a draft link for review.`,
      };
    }

    const phoneDraft =
      text.match(/(?:send|prepare)\s+(?:whatsapp\s+)?(?:message|draft)\s+["'](.+)["']\s+(?:to|for)\s+([+\d][\d\s().-]{7,})$/i) ||
      text.match(/(?:send|prepare)\s+(?:whatsapp\s+)?(?:message|draft)\s+(.+?)\s+(?:to|for)\s+([+\d][\d\s().-]{7,})$/i) ||
      text.match(/(?:message|send|whatsapp)\s+(?:to\s+)?([+\d][\d\s().-]{7,})\s+(?:saying|message|text|that says|bolo|keho|kaho)?\s*["']?(.+)["']?$/i);

    if (phoneDraft) {
      const firstIsMessage = !/^[+\d]/.test(phoneDraft[1].trim());
      const phone = parsePhone(firstIsMessage ? phoneDraft[2] : phoneDraft[1]);
      const message = stripQuotes(firstIsMessage ? phoneDraft[1] : phoneDraft[2]);

      if (phone && message) {
        return {
          action: "review",
          url: makeWhatsAppTextUrl(phone, message),
          linkLabel: "Open WhatsApp Draft",
          response: `I prepared a WhatsApp draft for ${phone}. Review it in WhatsApp Web and press Send yourself.`,
        };
      }
    }

    if (/(^|\b)(open|launch|start)\s+(whatsapp|whats\s*app)(\s+web)?\b|^(whatsapp|whats\s*app)(\s+web)?$/i.test(lower)) {
      return {
        action: "open",
        url: siteAliases["whatsapp web"],
        linkLabel: "Open WhatsApp Web",
        response: "Opening WhatsApp Web.",
      };
    }

    return null;
  }

  function getSearchCommand(text) {
    const lower = text.toLowerCase();

    const youtubeSearch =
      text.match(/(?:search\s+youtube\s+for|youtube\s+search\s+for|search\s+on\s+youtube)\s+(.+)/i) ||
      text.match(/(?:play|find)\s+(.+?)\s+(?:on|in)\s+youtube/i);

    if (youtubeSearch?.[1]) {
      const query = stripQuotes(youtubeSearch[1]);
      return {
        action: "search",
        url: makeYouTubeSearch(query),
        linkLabel: `Search YouTube for ${query}`,
        response: `Searching YouTube for ${query}.`,
      };
    }

    const wikipediaSearch =
      text.match(/(?:search\s+wikipedia\s+for|wikipedia\s+search\s+for|search\s+on\s+wikipedia)\s+(.+)/i) ||
      text.match(/wikipedia\s+(.+)/i);

    if (wikipediaSearch?.[1]) {
      const query = stripQuotes(wikipediaSearch[1]);
      return {
        action: "search",
        url: makeWikipediaSearch(query),
        linkLabel: `Search Wikipedia for ${query}`,
        response: `Searching Wikipedia for ${query}.`,
      };
    }

    const googleQuery = extractSearch(text);
    if (googleQuery) {
      const query = stripQuotes(googleQuery);
      return {
        action: "search",
        url: makeGoogleSearch(query),
        linkLabel: `Search Google for ${query}`,
        response: `Searching Google for ${query}.`,
      };
    }

    if (/^what\s+is\s+|^who\s+is\s+|^where\s+is\s+|^how\s+to\s+|^latest\s+/i.test(lower)) {
      return {
        action: "search",
        url: makeGoogleSearch(text),
        linkLabel: `Search Google for ${text}`,
        response: `Searching Google for ${text}.`,
      };
    }

    return null;
  }

  function getOpenCommand(text) {
    const openMatch =
      text.match(/^(?:open|launch|start|go\s+to|visit)\s+(.+)/i) ||
      text.match(/^(.+?)\s+(?:open|launch|start|kholo|chalao)$/i);

    if (!openMatch?.[1]) return null;

    const target = stripQuotes(openMatch[1]).replace(/\s+(website|web|site|app)$/i, "");
    const url = resolveSite(target);
    const label = target.replace(/\b\w/g, (char) => char.toUpperCase());

    return {
      action: "open",
      url,
      linkLabel: `Open ${label}`,
      response: `Opening ${target}.`,
    };
  }

  function getUtilityCommand(text) {
    const lower = text.toLowerCase();

    if (/(time|waqt)/i.test(lower)) {
      return {
        action: "chat",
        response: `The current time is ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      };
    }

    if (/(who are you|your name|tum kaun)/i.test(lower)) {
      return {
        action: "chat",
        response: "I am Jani, a Chrome-based voice assistant running fully in this browser.",
      };
    }

    if (/(help|commands|what can you do)/i.test(lower)) {
      return {
        action: "chat",
        response: "Try: open WhatsApp Web, open github.com, search YouTube for music, Google JavaScript, or WhatsApp +923001234567 message hello.",
      };
    }

    if (/(salam|assalam|hello|hi|hey)/i.test(lower)) {
      return {
        action: "chat",
        response: "Wa alaikum assalam. Jani online and at your service.",
      };
    }

    if (/(thank|shukriya)/i.test(lower)) {
      return {
        action: "chat",
        response: "Always a pleasure.",
      };
    }

    return null;
  }

  function getConversationalReply() {
    const index = Math.floor(Math.random() * cannedReplies.length);
    return cannedReplies[index];
  }

  function processCommand(rawText) {
    const text = stripWakeWords(normalize(rawText));

    if (!text) {
      return {
        action: "chat",
        response: "Jani is awake. Say a command after the wake word.",
      };
    }

    const command =
      getWhatsAppCommand(text) ||
      getSearchCommand(text) ||
      getOpenCommand(text) ||
      getUtilityCommand(text);

    if (command) return command;

    return {
      action: "chat",
      response: getConversationalReply(text),
    };
  }

  window.JarvisCommands = {
    getWakeIntent,
    processCommand,
  };
})();
