# Shuffle Rush - Mobile Upload Guide

## 📱 Mobile File Upload Behavior

### Upload Images Button
**Opens:** Photo Library / Camera Roll
- **iOS**: Opens native Photos app picker
- **Android**: Opens Gallery/Photos app
- **Allows**: Camera capture option (via `capture="environment"`)
- **Accepts**: All image formats (PNG, JPG, GIF, WebP, etc.)
- **Multiple Selection**: ✅ Yes

**Desktop Behavior:**
- Opens file browser filtered to images only
- Can select from any folder

---

### Add Music Button
**Opens:** File Manager / Document Picker
- **iOS**: Opens Files app (can access iCloud, Downloads, etc.)
- **Android**: Opens file picker (can access Downloads, Music, Documents)
- **Accepts**: Audio files (MP3, WAV, OGG, M4A, etc.) **AND** Images
- **Multiple Selection**: ✅ Yes

**Desktop Behavior:**
- Opens file browser with audio + image filter
- User can switch to "All Files" if needed

**Why Audio + Images?**
Mobile file pickers often work better when they allow multiple content types. Users can:
1. Select music files from their Downloads folder
2. Select images from the same picker if needed
3. Mix and match in one upload session

---

## 🔄 Smart File Processing

The "Add Music" button now intelligently handles mixed uploads:

### Example Scenarios:

**Scenario 1:** User selects 2 MP3 files
- Result: `2 TRACKS ADDED!`

**Scenario 2:** User selects 1 image + 1 audio file
- Result: `1 TRACKS + 1 IMAGES ADDED!`

**Scenario 3:** User selects 3 images (from music picker)
- Result: `3 IMAGES ADDED!`

**Scenario 4:** Mixed batch of 2 audio + 3 images
- Result: `2 TRACKS + 3 IMAGES ADDED!`

---

## 📂 Mobile OS Behaviors

### iOS (iPhone/iPad)
**Upload Images:**
- Opens native Photos app
- Shows all photos and videos
- Allows camera capture
- Multi-select via tap-and-hold

**Add Music:**
- Opens Files app
- Shows iCloud Drive, On My iPhone, Downloads
- Can browse Music folder if synced
- Shows both audio and image files

### Android
**Upload Images:**
- Opens default Gallery/Photos app
- Shows camera option at top
- Grid view of all photos
- Multi-select via long-press

**Add Music:**
- Opens native file picker
- Shows internal storage and SD card
- Can browse Downloads, Music, Documents
- List or grid view depending on device

### Desktop
**Both Buttons:**
- Standard file browser dialog
- Can filter by file type
- Can switch to "All Files" view
- Drag-and-drop still supported

---

## ⚙️ Technical Implementation

### File Input Attributes

**Upload Images:**
```html
<input 
  type="file" 
  accept="image/*" 
  capture="environment" 
  multiple 
/>
```
- `accept="image/*"` → Triggers photo library on mobile
- `capture="environment"` → Suggests rear camera if available
- `multiple` → Allows batch selection

**Add Music:**
```html
<input 
  type="file" 
  accept="audio/*,image/*" 
  multiple 
/>
```
- `accept="audio/*,image/*"` → Opens file manager with both types
- `multiple` → Batch upload support
- No `capture` → File browser only (no camera)

### File Type Detection
```javascript
files.forEach(file => {
  const isAudio = file.type.startsWith('audio/');
  const isImage = file.type.startsWith('image/');
  
  if (isAudio) {
    // Process as music track
    this.addCustomTrack(base64Data, fileName);
  } else if (isImage) {
    // Process as dancer image
    this.addCustomTexture(base64Data);
  }
});
```

---

## 🎯 User Experience Flow

### Mobile User Journey:

1. **Opens Dancer Lab**
2. **Clicks "Add Music"**
   - Mobile file picker opens
   - User browses to Downloads folder
   - Sees their MP3 file + some photos
   - Selects 1 MP3 + 1 photo
   - Clicks "Done"
3. **App processes both:**
   - MP3 → Added to custom tracks (appears in gameplay playlist)
   - Photo → Added to custom dancers (dances in menu + gameplay)
4. **Feedback:** `1 TRACKS + 1 IMAGES ADDED!`
5. **Gallery refreshes automatically**

### Desktop User Journey:

1. **Opens Dancer Lab**
2. **Clicks "Upload Images"**
   - File browser opens (filtered to images)
   - User selects multiple PNGs
   - Clicks "Open"
3. **App processes images:**
   - All added to dancer gallery
4. **Feedback:** `3 IMAGES ADDED!`

---

## 🚨 Error Handling

### File Size Limits:
- **Images**: 1GB per file
- **Audio**: 1GB per file
- **Batch Total**: 5GB max per upload session

### Rejected Files:
If any files exceed limits or are unsupported:
- Valid files are processed
- Rejected files show error message
- Example: `2 files rejected (size limits exceeded)`

### Unsupported Types:
If user selects a PDF, video, or other non-audio/image file:
- File is rejected
- Shows: `filename.pdf: unsupported file type`

---

## 🔒 Browser Support

### Full Support:
- ✅ iOS Safari 13+
- ✅ Android Chrome 80+
- ✅ Desktop Chrome/Firefox/Edge/Safari

### Limitations:
- ⚠️ Very old browsers may not support `multiple` attribute
- ⚠️ `capture` attribute is ignored on desktop (no camera)
- ⚠️ File pickers vary by device manufacturer (Samsung, Pixel, etc.)

---

## 💡 Tips for Users

### Best Practices:

1. **For Music:**
   - Use MP3 format for best compatibility
   - Keep files under 10MB for faster uploads
   - Download music to device first (not streaming links)

2. **For Images:**
   - PNG with transparency works great for dancers
   - JPG also supported
   - Compress large photos before upload (< 5MB recommended)

3. **Batch Uploads:**
   - Select multiple files at once
   - Progress bar shows upload status
   - Wait for "ADDED!" confirmation before closing

4. **Storage:**
   - All uploads persist forever (localStorage)
   - Clear space via "Clear All" if needed
   - Refresh page anytime - files stay

---

## 🐛 Troubleshooting

**"Nothing happens when I click upload"**
- Check if browser permissions are enabled
- Try refreshing the page
- Ensure you're not in a restricted iframe

**"File picker shows wrong files"**
- This is OS-dependent
- Use device's file browser app to move files to correct folder
- On Android: Move to Downloads or Music
- On iOS: Move to iCloud Drive or Files app

**"Upload takes too long"**
- Large files (>50MB) may take time to encode
- Progress bar shows status
- Don't close the app during upload

**"Files disappeared after refresh"** (Should not happen!)
- Check browser console for localStorage errors
- Ensure browser allows localStorage (not disabled)
- Try clearing cache and re-uploading

---

**Shuffle Rush now has intelligent, mobile-optimized file uploads!** 📱🎵✨
