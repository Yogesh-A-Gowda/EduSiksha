# File Upload Guide - Frontend Implementation

## Overview
File upload functionality has been added to the chat interface, allowing students to upload documents for AI-powered Q&A.

## Supported File Types

| Category | Extensions | Processing |
|----------|-----------|------------|
| **Images** | .png, .jpg, .jpeg, .bmp, .tiff | OCR text extraction |
| **Documents** | .pdf | Text extraction + OCR fallback |
| **Word** | .docx | Text and table extraction |
| **Excel** | .xlsx | All sheets parsed |
| **PowerPoint** | .pptx | Slide text extraction |
| **Text** | .txt | Direct text reading |

## How to Use

### 1. Upload a File

**Step 1**: Click the **Paperclip** icon (📎) in the chat input area

**Step 2**: Select a file from your computer
- Maximum file size: **10MB**
- Supported formats listed above

**Step 3**: Review the file preview
- File name and size will be displayed
- Click **Upload** button to proceed
- Or click **X** to cancel

**Step 4**: Wait for processing
- "Uploading..." status will appear
- Processing time varies by file type:
  - Images: 2-5 seconds
  - PDFs: 1-10 seconds (depending on pages)
  - Excel/Word/PowerPoint: <1 second

**Step 5**: Success confirmation
- ✅ "File uploaded successfully!" message
- Shows number of chunks indexed
- File is now searchable via chat

### 2. Ask Questions About the File

Once uploaded, simply ask questions:

**Examples**:
- "What is this document about?"
- "Summarize the main points"
- "What does the table on page 3 show?"
- "Explain the concept of photosynthesis from the uploaded PDF"

The AI will use the uploaded document content to answer your questions!

## Frontend Code Implementation

### Key Components

#### File Input (Hidden)
```tsx
<input
    type="file"
    ref={fileInputRef}
    onChange={handleFileSelect}
    accept="image/*,.pdf,.docx,.xlsx,.pptx,.txt"
    className="hidden"
/>
```

#### Upload Button
```tsx
<button
    onClick={() => fileInputRef.current?.click()}
    className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition"
    title="Upload file (Images, PDF, Word, Excel, PowerPoint)"
>
    <Paperclip className="w-5 h-5" />
</button>
```

#### File Preview Card
```tsx
{selectedFile && (
    <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
        </div>
        <button onClick={uploadFile}>Upload</button>
    </div>
)}
```

### Upload Function

```tsx
const uploadFile = async () => {
    if (!selectedFile || !activeChatId) return;

    setUploading(true);
    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('session_id', activeChatId.toString());

        const response = await api.post('/chat/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        // Success feedback
        setMessages(prev => [...prev, {
            role: 'ai',
            content: `✅ File "${selectedFile.name}" uploaded successfully! ${response.data.chunks_processed} chunks indexed.`
        }]);
        
        setUploadSuccess(true);
        setTimeout(() => {
            setSelectedFile(null);
            setUploadSuccess(false);
        }, 2000);
    } catch (error) {
        alert('Upload failed: ' + error.message);
    } finally {
        setUploading(false);
    }
};
```

### File Validation

```tsx
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type validation
    const allowedTypes = [
        'image/png', 'image/jpeg', 'image/jpg',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        alert('Unsupported file type!');
        return;
    }
    
    // Size validation (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Maximum size is 10MB.');
        return;
    }
    
    setSelectedFile(file);
};
```

## API Endpoint

**POST** `/chat/upload`

**Request**:
- Content-Type: `multipart/form-data`
- Body:
  - `file`: File object
  - `session_id`: Chat session ID (number)

**Response**:
```json
{
    "filename": "document.pdf",
    "chunks_processed": 15,
    "status": "indexed"
}
```

## User Experience Flow

```
1. User clicks Paperclip icon
   ↓
2. File picker opens
   ↓
3. User selects file
   ↓
4. File preview appears with name and size
   ↓
5. User clicks "Upload" button
   ↓
6. "Uploading..." status shown
   ↓
7. Backend processes file:
   - Extracts text (OCR if needed)
   - Chunks content
   - Generates embeddings
   - Stores in database
   ↓
8. Success message appears
   ↓
9. User can now ask questions about the file
```

## Error Handling

- **Unsupported file type**: Alert shown, file rejected
- **File too large**: Alert shown, file rejected
- **No active chat**: Alert shown, upload prevented
- **Upload failure**: Alert with error message
- **Network error**: Axios error caught and displayed

## Visual Feedback

- **File selected**: Preview card with file info
- **Uploading**: "Uploading..." text with blue color
- **Success**: ✓ checkmark with green color
- **Auto-clear**: File preview clears after 2 seconds

## Testing

1. **Test image upload**: Upload a PNG with text
2. **Test PDF**: Upload a text-based PDF
3. **Test scanned PDF**: Upload a scanned document
4. **Test Excel**: Upload a spreadsheet
5. **Test PowerPoint**: Upload a presentation
6. **Test file size limit**: Try uploading >10MB file
7. **Test unsupported type**: Try uploading .exe or .zip
8. **Test query**: Ask questions about uploaded content

## Next Steps

- Add drag-and-drop support
- Show upload progress bar
- Support multiple file uploads
- Add file history/management
- Preview file content before upload
