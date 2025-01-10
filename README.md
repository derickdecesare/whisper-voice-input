# Whisper Voice Input

A VS Code/Cursor extension that lets you transcribe speech to text using OpenAI's Whisper model. Just hit Cmd+Shift+I to start recording and Cmd+Shift+U to stop and get your transcription in the clipboard.

## Requirements

You'll need to install:

1. Sox for audio recording: `brew install sox`
2. Whisper for transcription: `pip install -U openai-whisper`

## Features

- Start recording: Cmd+Shift+I (Ctrl+Shift+I on Windows/Linux)
- Stop recording and transcribe: Cmd+Shift+U (Ctrl+Shift+U on Windows/Linux)
- Automatic clipboard copy of transcription
- Status bar indicator while recording

## Known Issues

- First recording may require microphone permission in System Preferences
- Currently Mac-only due to `pbcopy` usage for clipboard

## Release Notes

### 0.0.1

Initial release:

- Basic voice recording and transcription
- Clipboard integration
- Keyboard shortcuts
