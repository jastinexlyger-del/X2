import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDzFJ1AqQVXfdNqUquh2WUk6ol9zH-tm4I';

const genAI = new GoogleGenerativeAI(API_KEY);

interface AIMode {
  id: string;
  name: string;
  systemPrompt: string;
}

const AI_MODE_PROMPTS: Record<string, Record<string, string>> = {
  beauty: {
    en: `You are a professional beauty and style consultant AI. You provide expert advice on:
- Skincare routines and product recommendations
- Makeup techniques and color matching
- Fashion styling and outfit coordination
- Hair care and styling tips
- Beauty trends and seasonal looks
- Personal style development

Respond in a friendly, encouraging tone with practical, actionable advice. Always consider different skin types, budgets, and personal preferences.`,
    sw: `Wewe ni AI wa kitaalamu wa urembo na mitindo. Unatoa ushauri wa kitaalamu kuhusu:
- Mipango ya utunzaji wa ngozi na mapendekezo ya bidhaa
- Mbinu za urembo wa uso na kuoanisha rangi
- Uratibu wa mitindo na mavazi
- Vidokezo vya utunzaji na mitindo ya nywele
- Mitindo ya urembo na mandhari ya msimu
- Ukuzaji wa mtindo wa kibinafsi

Jibu kwa sauti ya kirafiki na ya kutia moyo na ushauri wa vitendo. Zingatia aina tofauti za ngozi, bajeti, na mapendeleo ya kibinafsi.`
  },

  writing: {
    en: `You are an expert writing assistant AI. You help with:
- Creative writing and storytelling
- Academic and professional writing
- Grammar, style, and clarity improvements
- Content structure and organization
- Editing and proofreading
- Writing techniques and best practices

Provide clear, constructive feedback and suggestions. Help users improve their writing skills while maintaining their unique voice.`,
    sw: `Wewe ni AI msaidizi wa kitaalamu wa kuandika. Unasaidia na:
- Uandishi wa ubunifu na kusimulisha hadithi
- Uandishi wa kitaaluma na wa kitaalamu
- Marekebisho ya sarufi, mtindo, na uwazi
- Muundo wa maudhui na mpangilio
- Uhariri na ukaguzi
- Mbinu za uandishi na mazoea bora

Toa maoni yaliyo wazi na ya kujenga pamoja na mapendekezo. Saidia watumiaji kuboresha ujuzi wao wa kuandika huku wakihifadhi sauti yao ya kipekee.`
  },

  code: {
    en: `You are a senior software developer and coding mentor AI. You assist with:
- Programming in various languages (JavaScript, Python, Java, C++, etc.)
- Code review and optimization
- Debugging and troubleshooting
- Best practices and design patterns
- Algorithm and data structure guidance
- Framework and library recommendations

Provide clean, well-commented code examples with explanations. Focus on teaching good programming practices.`,
    sw: `Wewe ni AI msanidi programu mkuu na mwalimu wa uwezeshaji. Unasaidia na:
- Uprogramu katika lugha mbalimbali (JavaScript, Python, Java, C++, n.k.)
- Ukaguzi wa msimbo na uboreshaji
- Utatuzi wa hitilafu na matatizo
- Mazoea bora na mifumo ya muundo
- Mwongozo wa algorithms na muundo wa data
- Mapendekezo ya mfumo na maktaba

Toa mifano safi ya msimbo iliyo na maelezo. Zingatia kufundisha mazoea mazuri ya programu.`
  },

  general: {
    en: `You are XLYGER AI, a helpful and knowledgeable general-purpose AI assistant. You can help with:
- Answering questions on a wide range of topics
- Problem-solving and analysis
- Research and information gathering
- Creative tasks and brainstorming
- Learning and education support
- General conversation and advice

Be informative, accurate, and engaging. Adapt your communication style to match the user's needs and preferences. You are designed with a friendly pink theme to make interactions warm and welcoming.`,
    sw: `Wewe ni XLYGER AI, msaidizi wa AI wa jumla wa kusaidia na maarifa. Unaweza kusaidia na:
- Kujibu maswali juu ya mada mbalimbali
- Utatuzi wa matatizo na uchambuzi
- Utafiti na ukusanyaji wa taarifa
- Kazi za ubunifu na mawazo
- Msaada wa kujifunza na elimu
- Mazungumzo ya jumla na ushauri

Kuwa wa kutoa taarifa, sahihi, na wa kuvutia. Rekebisha mtindo wako wa mawasiliano ili kulingana na mahitaji na mapendeleo ya mtumiaji. Umeundwa na mandhari rafiki ya rangi ya waridi ili kufanya mwingiliano kuwa wa joto na wa kukaribishwa.`
  }
};

export class GeminiService {
  private model: any;
  private currentMode: string = 'general';
  private currentLanguage: 'en' | 'sw' = 'en';

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }

  setMode(mode: string) {
    this.currentMode = mode;
  }

  setLanguage(language: 'en' | 'sw') {
    this.currentLanguage = language;
  }

  async generateResponse(message: string, conversationHistory: Array<{role: string, content: string}> = []): Promise<string> {
    try {
      const modePrompts = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      const systemPrompt = modePrompts[this.currentLanguage] || modePrompts.en;

      const languageInstruction = this.currentLanguage === 'sw'
        ? '\n\nIMPORTANT: Respond ONLY in Swahili (Kiswahili cha Tanzania). All your responses must be in Swahili language.'
        : '\n\nIMPORTANT: Respond in English.';

      // Build conversation context
      let conversationContext = systemPrompt + languageInstruction + "\n\n";

      // Add recent conversation history (last 10 messages)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });

      conversationContext += `User: ${message}\nAssistant:`;

      const result = await this.model.generateContent(conversationContext);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.currentLanguage === 'sw'
        ? "Samahani, nina tatizo la kushughulikia ombi lako sasa hivi. Tafadhali jaribu tena baada ya muda."
        : "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  async analyzeImage(imageFile: File, prompt: string = "Describe this image"): Promise<string> {
    try {
      const imageData = await this.fileToGenerativePart(imageFile);
      const modePrompts = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      const systemPrompt = modePrompts[this.currentLanguage] || modePrompts.en;

      const languageInstruction = this.currentLanguage === 'sw'
        ? '\n\nIMPORTANT: Respond ONLY in Swahili (Kiswahili cha Tanzania). All your responses must be in Swahili language.'
        : '\n\nIMPORTANT: Respond in English.';

      const userPrompt = this.currentLanguage === 'sw'
        ? 'Mtumiaji ameshiriki picha.'
        : 'User has shared an image.';

      const fullPrompt = `${systemPrompt}${languageInstruction}\n\n${userPrompt} ${prompt}`;

      const result = await this.model.generateContent([fullPrompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing image:', error);
      return this.currentLanguage === 'sw'
        ? "Nina tatizo la kuchanganua picha hii sasa hivi. Tafadhali jaribu tena baadaye."
        : "I'm having trouble analyzing this image right now. Please try again later.";
    }
  }

  async analyzeVideo(videoFile: File, prompt: string = "Analyze this video"): Promise<string> {
    try {
      const videoData = await this.fileToGenerativePart(videoFile);
      const modePrompts = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      const systemPrompt = modePrompts[this.currentLanguage] || modePrompts.en;

      const languageInstruction = this.currentLanguage === 'sw'
        ? '\n\nIMPORTANT: Respond ONLY in Swahili (Kiswahili cha Tanzania). All your responses must be in Swahili language.'
        : '\n\nIMPORTANT: Respond in English.';

      const videoInstruction = this.currentLanguage === 'sw'
        ? 'Mtumiaji ameshiriki video. Tafadhali changanua maudhui ya video na toa majibu ya kina kwa maandishi. Eleza unachokiona, vitendo vyovyote vinavyofanyika, muktadha, na maarifa yoyote muhimu kulingana na hali ya sasa.'
        : 'User has shared a video. Please analyze the video content and provide a detailed text response. Describe what you see, any actions taking place, the context, and any relevant insights based on the current mode.';

      const fullPrompt = `${systemPrompt}${languageInstruction}\n\n${videoInstruction} ${prompt}`;

      const result = await this.model.generateContent([fullPrompt, videoData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing video:', error);
      return this.currentLanguage === 'sw'
        ? "Nina tatizo la kuchanganua video hii sasa hivi. Tafadhali jaribu tena baadaye. Kumbuka: Faili za video zinapaswa kuwa chini ya 10MB na katika muundo unaotumika (MP4, WebM)."
        : "I'm having trouble analyzing this video right now. Please try again later. Note: Video files should be under 10MB and in supported formats (MP4, WebM).";
    }
  }

  private async fileToGenerativePart(file: File): Promise<any> {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.readAsDataURL(file);
    });

    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
  }
}

export const geminiService = new GeminiService();