export class MediaService {
  // Check if speech recognition is supported
  static isSpeechRecognitionSupported(): boolean {
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  }

  // Check if speech synthesis is supported
  static isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  // Speech-to-Text using Web Speech API
  static startSpeechRecognition(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) {
          resolve(transcript);
        } else {
          reject(new Error('No speech detected'));
        }
      };

      recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
      };

      recognition.onnomatch = () => {
        reject(new Error('No speech was recognized'));
      };

      recognition.onspeechstart = () => {
        console.log('Speech detected');
      };

      recognition.onspeechend = () => {
        console.log('Speech ended');
      };

      recognition.onaudiostart = () => {
        console.log('Audio capturing started');
      };

      recognition.onaudioend = () => {
        console.log('Audio capturing ended');
      };

      recognition.onsoundstart = () => {
        console.log('Sound detected');
      };

      recognition.onsoundend = () => {
        console.log('Sound ended');
      };

      recognition.onerror = (event) => {
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech was detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error occurred during speech recognition.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was aborted.';
            break;
          case 'bad-grammar':
            errorMessage = 'Grammar error in speech recognition.';
            break;
          case 'language-not-supported':
            errorMessage = 'Language not supported for speech recognition.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        reject(new Error(errorMessage));
      };

      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        recognition.stop();
        reject(new Error('Speech recognition timeout'));
      }, 10000); // 10 seconds timeout

      recognition.onresult = (event) => {
        clearTimeout(timeout);
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) {
          resolve(transcript);
        } else {
          reject(new Error('No speech detected'));
        }
      };

      recognition.start();
    });
  }

  // Text-to-Speech
  static speakText(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}) {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      
      // Set voice to a preferred one if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith(navigator.language.split('-')[0]) && voice.default
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      speechSynthesis.speak(utterance);
    }
  }

  // Stop speech synthesis
  static stopSpeaking() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  // Check microphone permissions
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return permission.state === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return false;
    }
  }

  // Request microphone permission
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  // Enhanced file validation
  static validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain'
    ];

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not supported' };
    }

    return { isValid: true };
  }

  // Generate thumbnail for images
  static generateThumbnail(file: File, maxWidth: number = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL());
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Extract video metadata
  static getVideoMetadata(file: File): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('video/')) {
        reject(new Error('File is not a video'));
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        });
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => reject(new Error('Failed to load video metadata'));
      video.src = URL.createObjectURL(file);
    });
  }

  // Audio visualization
  static createAudioVisualizer(audioElement: HTMLAudioElement, canvas: HTMLCanvasElement) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const ctx = canvas.getContext('2d');
    
    function draw() {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      if (ctx) {
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          
          ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
          ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight);
          
          x += barWidth + 1;
        }
      }
    }
    
    draw();
  }
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}