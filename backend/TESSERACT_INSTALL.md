# Tesseract OCR Installation Guide

## What is Tesseract?
Tesseract is a free, open-source OCR (Optical Character Recognition) engine that extracts text from images.

## Installation

### Windows
1. Download the installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Run the installer (tesseract-ocr-w64-setup-5.3.x.exe)
3. During installation, note the installation path (default: `C:\Program Files\Tesseract-OCR`)
4. Add Tesseract to your system PATH:
   - Right-click "This PC" → Properties → Advanced System Settings
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\Program Files\Tesseract-OCR`
   - Click OK on all dialogs

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install poppler-utils  # For PDF to image conversion
```

### macOS
```bash
brew install tesseract
brew install poppler  # For PDF to image conversion
```

## Verify Installation
Open a new terminal/command prompt and run:
```bash
tesseract --version
```

You should see output like:
```
tesseract 5.3.x
```

## Configuration in Code
If Tesseract is not in your PATH, you can set it manually in `document_processor.py`:

```python
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

## Language Support
By default, Tesseract supports English. To add more languages:

### Windows
During installation, select additional language packs (Hindi, Kannada, etc.)

### Linux
```bash
sudo apt-get install tesseract-ocr-hin  # Hindi
sudo apt-get install tesseract-ocr-kan  # Kannada
sudo apt-get install tesseract-ocr-tam  # Tamil
```

### Usage in Code
```python
# Single language
text = pytesseract.image_to_string(image, lang='eng')

# Multiple languages
text = pytesseract.image_to_string(image, lang='eng+hin+kan')
```

## Troubleshooting

### "tesseract is not recognized"
- Tesseract is not in PATH
- Solution: Add to PATH or set `tesseract_cmd` in code

### "Failed to load language data"
- Language pack not installed
- Solution: Install required language pack

### Poor OCR quality
- Low image resolution
- Solution: Use higher DPI (300+) when converting PDFs to images
