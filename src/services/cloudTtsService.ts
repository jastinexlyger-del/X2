const GOOGLE_CLOUD_TTS_API_KEY = 'AIzaSyDzFJ1AqQVXfdNqUquh2WUk6ol9zH-tm4I';

interface VoiceConfig {
  languageCode: string;
  voiceName: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
}

const LANGUAGE_VOICES: Record<string, VoiceConfig> = {
  'en': {
    languageCode: 'en-US',
    voiceName: 'en-US-Neural2-J',
    gender: 'MALE'
  },
  'sw': {
    languageCode: 'sw-KE',
    voiceName: 'sw-KE-Standard-A',
    gender: 'MALE'
  },
  'es': {
    languageCode: 'es-ES',
    voiceName: 'es-ES-Neural2-B',
    gender: 'MALE'
  },
  'fr': {
    languageCode: 'fr-FR',
    voiceName: 'fr-FR-Neural2-B',
    gender: 'MALE'
  }
};

export class CloudTtsService {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;

  detectLanguage(text: string): string {
    const swahiliWords = ['habari', 'jambo', 'asante', 'karibu', 'nini', 'vipi', 'sana', 'mimi', 'wewe', 'kwa'];
    const textLower = text.toLowerCase();

    const swahiliCount = swahiliWords.filter(word => textLower.includes(word)).length;

    if (swahiliCount >= 2) {
      return 'sw';
    }

    if (/[àâäéèêëïîôùûüÿç]/i.test(text)) {
      return 'fr';
    }

    if (/[áéíóúñ¿¡]/i.test(text)) {
      return 'es';
    }

    return 'en';
  }

  async speak(text: string, onEnd?: () => void): Promise<void> {
    try {
      this.stop();

      const detectedLang = this.detectLanguage(text);
      const voiceConfig = LANGUAGE_VOICES[detectedLang] || LANGUAGE_VOICES['en'];

      const requestBody = {
        input: { text },
        voice: {
          languageCode: voiceConfig.languageCode,
          name: voiceConfig.voiceName,
          ssmlGender: voiceConfig.gender
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0,
          volumeGainDb: 0
        }
      };

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_TTS_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.audioContent) {
        throw new Error('No audio content in response');
      }

      const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);

      this.audioElement = new Audio(audioUrl);
      this.isPlaying = true;

      this.audioElement.onended = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
        if (onEnd) onEnd();
      };

      this.audioElement.onerror = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
        console.error('Error playing audio');
        if (onEnd) onEnd();
      };

      await this.audioElement.play();
    } catch (error) {
      console.error('Cloud TTS error:', error);
      this.isPlaying = false;
      if (onEnd) onEnd();
      throw error;
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    this.isPlaying = false;
  }

  isSpeaking(): boolean {
    return this.isPlaying;
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

export const cloudTtsService = new CloudTtsService();
