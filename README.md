# Jarvis Web Voice Assistant

Open `index.html` in Chrome and allow microphone access when the browser asks.

Press the center mic once to arm wake mode. Say `Hey Jarvis`, then say a command
such as `open YouTube`. You can also say both together: `Hey Jarvis open YouTube`.
If Chrome blocks a new tab, Jarvis falls back to opening the requested site in
the current tab.

## Mobile Testing

Browsers do not allow microphone access without permission. Jarvis cannot bypass
that prompt. On mobile, Chrome also expects the app to be served from HTTPS
for microphone and install/PWA features.

Best mobile path:

1. Upload the `jarvis-web` folder to any static HTTPS host, such as GitHub
   Pages, Netlify, Vercel, or Firebase Hosting.
2. Open the HTTPS URL in Chrome on Android.
3. Tap `Install Jarvis` if Chrome shows the install prompt, or use Chrome's menu
   and choose `Add to Home screen`.
4. Open Jarvis from the home screen.
5. Tap the mic and allow microphone permission once.

Local `file:///` testing is fine for UI and typed commands, but it is not a
reliable way to test mobile microphone or PWA install behavior.

Example commands:

- `Hey Jarvis open WhatsApp Web`
- `Hey Jarvis open github.com`
- `Hey Jarvis search YouTube for lofi music`
- `Hey Jarvis search Wikipedia for Web Speech API`
- `Hey Jarvis WhatsApp +923001234567 message hello`
- `Hey Jarvis send WhatsApp message "hello" to +923001234567`

WhatsApp contact-name search is intentionally limited by browser security.
This app cannot control WhatsApp Web's private contact list or press Send
inside WhatsApp. With a phone number, it can prepare a WhatsApp draft link for
you to review, and you press Send yourself in WhatsApp.

If voice input does not start:

- Check the microphone permission icon in Chrome's address bar.
- Use regular Google Chrome instead of an embedded/in-app browser if speech recognition is blocked.
- Select a different voice input language in the System panel.
- Watch the Input Level meter while speaking. If it stays flat, Chrome is not receiving microphone audio. If it moves but no words appear, Chrome's SpeechRecognition service is not decoding the speech.
- Use the typed command box to test commands while mic permission is blocked.

This project is frontend-only. It uses HTML, CSS, JavaScript, SpeechRecognition,
SpeechSynthesis, and browser tabs only.
