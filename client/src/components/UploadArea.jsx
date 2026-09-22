import { useRef, useState } from 'react';

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.bmp,.mp4,.mov,.webm,.mkv,.avi,.mp3,.wav,.m4a,.aac,.flac,.ogg';

export default function UploadArea({ onFile }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    if (files && files[0]) onFile(files[0]);
  };

  return (
    <div
      className={`dropzone ${dragOver ? 'drag-over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
    >
      <div className="dropzone-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 16V4M12 4L7 9M12 4L17 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 16V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3>Drop a photo, video, or audio file to analyze</h3>
      <p>or click to browse your files</p>
      <div className="formats">IMAGES · VIDEOS · AUDIO (MP3 · WAV · M4A · AAC · FLAC · OGG)</div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
