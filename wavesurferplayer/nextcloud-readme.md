# Wavesurfer Audio Player for Nextcloud

This Nextcloud app replaces the default audio player with Wavesurfer.js on public share links, providing waveform visualization and enhanced audio controls.

## Features

- Audio waveform visualization on public share links
- Responsive design that works on mobile and desktop
- Play/pause controls with time display
- Compatible with Nextcloud's light and dark themes
- Supports all audio formats that the browser can play

## Installation

1. Download and extract the app to your Nextcloud apps directory:
   ```bash
   cd /path/to/nextcloud/apps/
   git clone https://github.com/yourusername/wavesurferplayer.git
   ```

2. Enable the app through the Nextcloud admin interface:
   - Go to Settings > Apps
   - Select the "Multimedia" category
   - Click "Enable" for "Wavesurfer Audio Player"

## Configuration

Currently, this app doesn't require additional configuration. It automatically activates on public share links that contain audio files.

## Development

### Building the app

```bash
# Install dependencies
npm install

# Build the JavaScript bundle
npm run build
```

### Running tests

```bash
npm run test
```

## Requirements

- Nextcloud 25 or later

## Maintainers

- [Your Name](https://github.com/yourusername)

## License

AGPL-3.0-or-later
