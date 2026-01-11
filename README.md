# 🎵 SHUFFLE RUSH:  Rhythm Battle

<div align="center">

**Dodge the Beat.  Personalize the Party.  Rush the Rhythm.**

[![Play on Itch.io](https://img.shields.io/badge/Play%20on-Itch.io-FA5C5C?style=for-the-badge&logo=itch. io&logoColor=white)](https://maxgarcia642.itch.io/shufflerush)
[![Play on Rosebud. ai](https://img.shields.io/badge/Play%20on-Rosebud.ai-FF69B4?style=for-the-badge)](https://rosebud.ai/p/e4544eb3-6b9b-46a7-a62f-8d4e0b6c78f8)
[![Website](https://img.shields.io/badge/Contact-maxgarcia642.github.io-blue?style=for-the-badge)](https://maxgarcia642.github.io)

*A Y2K-inspired rhythm game celebrating the iconic iPod silhouette commercials of the early 2000s*

</div>

---

## 🕺 About

Step into a high-octane world of neon glows and rhythmic duels in **Shuffle Rush**, a tribute to the iconic Y2K "Frutiger Metro" aesthetic.  Inspired by the legendary iPod silhouette commercials of the early 2000s, Shuffle Rush blends precision rhythm gameplay with deep, user-generated creativity.

This is my **very first game**!  As a debut project, I wanted to create something that wasn't just fun to play, but fun to create in.  This game is a labor of love for the music and art of the early 2000s, built with the goal of giving players the tools to make the experience their own.

Thank you for playing and being part of my first step into game development! 🎉

---

## ✨ Features

### 🕺 YOUR DANCER, YOUR RULES
Why play as someone else when you can be the star? Use the **Dancer Lab** to: 

- **Custom Pixel Art**: Draw your own silhouette dancers directly in-game
- **GIF Integration**: Upload your favorite animated GIFs and watch them come to life on the dance floor (if it works out)
- **Dynamic Glows**: Every move pulses with high-fidelity "Silhouette Glow" effects, upscaled for a crisp, professional look

### 🎵 CHOOSE YOUR VIBE
The beat never stops. Battle through a curated playlist of high-energy rave and electronic tracks, or upload your own MP3s to experience your favorite music in a whole new way! 

### ⚡ CORE GAMEPLAY
- **Skill-Based Combat**: It's not just about hitting notes, but...  Well, actually it sorta is.  You still got this, though!
- **Persistent Universe**: Your custom characters, animations, and music tracks stay with you every time you return to the Lab (likely won't upon refresh, though)
- **Endless High-Score Chasing**: Compete for the top spot on the Hall of Fame leaderboard
- **Y2K Aesthetic**: Experience a visually polished world of vibrant gradients, liquid waves, and Frutiger Metro energy

---

## 🎮 Play Now

- **Itch.io**: [maxgarcia642.itch.io/shufflerush](https://maxgarcia642.itch.io/shufflerush)
- **Rosebud.ai**: [Play on Rosebud.ai](https://rosebud.ai/p/e4544eb3-6b9b-46a7-a62f-8d4e0b6c78f8)

---

## 💻 Technical Overview

**Shuffle Rush** is built with modern web technologies and showcases several impressive technical achievements for a first game:

### Tech Stack
- **Engine**: [Phaser 3](https://phaser.io/) (v3.70.0) - A fast, robust 2D game framework
- **Language**: JavaScript (ES6 Modules)
- **Compression**: LZ-String for efficient localStorage persistence
- **Architecture**: Scene-based modular design

### Key Systems

#### 🎨 **Custom Character System** (`ImageUploadScene.js`)
The crown jewel of the game - a complete in-browser character creation studio featuring:
- Pixel art drawing canvas with multiple brush sizes
- GIF upload and frame extraction
- Real-time silhouette processing with glow effects
- Image upscaling for crisp visuals
- Full character persistence system

#### 🎵 **Audio Analysis** (`BeatDetector.js`)
- Real-time beat detection using Web Audio API
- Frequency analysis for dynamic visual effects
- Support for custom MP3 uploads

#### 🎯 **Rhythm Combat** (`GameScene.js`, `Player.js`, `Enemy.js`)
- Timing-based note hitting system
- Enemy AI synchronized to beat detection
- Score tracking and combo systems
- Dynamic difficulty scaling

#### 💾 **Smart Persistence** (`main.js`)
- Compressed localStorage using LZ-String
- Graceful quota handling (no crashes from storage limits!)
- Automatic compression for large data (>100KB)
- Persistent custom dancers, songs, and high scores

#### 📱 **Responsive Design**
- Automatic scaling and centering with Phaser's Scale Manager
- Mobile-friendly controls and UI
- See [`MOBILE_UPLOAD_GUIDE. md`](MOBILE_UPLOAD_GUIDE.md) for mobile upload instructions

### File Structure
```
shuffle-rush/
├── index.html              # Entry point
├── main.js                 # Game configuration & storage system
├── MenuScene.js           # Main menu with Y2K aesthetics
├── GameScene.js           # Core gameplay loop (107KB of rhythm magic!)
├── ImageUploadScene.js    # Character creator/Dancer Lab (136KB!)
├── CreditsScene. js        # Credits and acknowledgments
├── Player.js              # Player character logic
├── Enemy.js               # Enemy behavior and AI
├── BeatDetector.js        # Audio analysis system
├── RhythmSystem.js        # Rhythm mechanics
├── UIManager.js           # UI components
├── StageManager.js        # Stage/level management
└── AdManager.js           # Ad integration
```

---

## ⚠️ Important Notes

### Missing Assets Folder
**The `assets/` folder is not included in this repository due to large file sizes. ** This includes:
- Background images and UI elements
- Default dancer sprites
- Sound effects
- Music tracks
- Font files

The game is designed to work with asset files hosted separately. If you're interested in **remixing or modifying this game**, please reach out via my website: 

👉 **[maxgarcia642.github.io](https://maxgarcia642.github.io)**

I'd love to help you get started with your own version! 

---

## 🚀 Getting Started

1. Clone the repository: 
```bash
git clone https://github.com/maxgarcia642/shuffle-rush.git
cd shuffle-rush
```

2. Serve the files with a local web server (required for ES6 modules):
```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js http-server
npx http-server
```

3. Open `http://localhost:8000` in your browser

**Note**: You'll need the assets folder to run the full game. Contact me for access if you're interested in development! 

---

## 📚 Documentation

- [`PERSISTENCE_README.md`](PERSISTENCE_README.md) - Details on the persistence system
- [`MOBILE_UPLOAD_GUIDE.md`](MOBILE_UPLOAD_GUIDE.md) - Guide for uploading custom content on mobile devices

---

## 🎨 Design Philosophy

Shuffle Rush embraces the **Frutiger Metro** aesthetic - that glossy, gradient-heavy, bubble-and-chrome look that defined the mid-2000s. Think: 
- iPod commercials with dancing silhouettes
- Translucent UI elements
- Vibrant neon glows
- Smooth gradients and liquid animations
- High-energy electronic music

The goal was to create not just a game, but a time capsule of an era when digital design felt optimistic, playful, and impossibly cool.

---

## 🤝 Contributing & Remixing

Interested in building on Shuffle Rush? I'd love to see what you create! 

For access to assets or collaboration opportunities, please contact me through:
**[maxgarcia642.github.io](https://maxgarcia642.github.io)**

---

## 📄 License

See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Phaser Community** - For the amazing game framework and documentation
- **Y2K Design Movement** - For the aesthetic inspiration
- **Apple's iPod Silhouette Campaign** - For the iconic visual style
- **All the players** - Thank you for trying my first game!

---

<div align="center">

**Made with 💜 and late-night coding sessions**

[Website](https://maxgarcia642.github.io) • [Itch.io](https://maxgarcia642.itch.io/shufflerush) • [Play on Rosebud](https://rosebud.ai/p/e4544eb3-6b9b-46a7-a62f-8d4e0b6c78f8)

</div>