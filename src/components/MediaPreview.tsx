import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Volume2, Download } from 'lucide-react';

interface MediaPreviewProps {
  file: File;
  onClose: () => void;
  onSend: (file: File, caption?: string) => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ file, onClose, onSend }) => {
  const [preview, setPreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);

    // Get metadata for video files
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setMetadata({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        });
      };
      video.src = url;
    }

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSend = () => {
    onSend(file, caption);
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPreview = () => {
    if (file.type.startsWith('image/')) {
      return (
        <img
          src={preview}
          alt="Preview"
          className="max-w-full max-h-96 object-contain rounded-lg"
        />
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <div className="relative">
          <video
            src={preview}
            controls
            className="max-w-full max-h-96 rounded-lg"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {metadata && (
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              {metadata.width}x{metadata.height} • {formatDuration(metadata.duration)}
            </div>
          )}
        </div>
      );
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
          <Volume2 className="w-8 h-8 text-blue-400" />
          <div className="flex-1">
            <p className="text-white font-medium">{file.name}</p>
            <audio src={preview} controls className="w-full mt-2" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {file.name.split('.').pop()?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">{file.name}</p>
          <p className="text-gray-400 text-sm">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <Download className="w-5 h-5 text-gray-400" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-white font-medium">Media Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex justify-center mb-4">
            {renderPreview()}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Add a caption (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe this media..."
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};