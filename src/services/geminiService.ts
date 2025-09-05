import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDzFJ1AqQVXfdNqUquh2WUk6ol9zH-tm4I';

const genAI = new GoogleGenerativeAI(API_KEY);

interface AIMode {
  id: string;
  name: string;
  systemPrompt: string;
}

const AI_MODE_PROMPTS: Record<string, string> = {
  beauty: `You are a professional beauty and style consultant AI. You provide expert advice on:
- Skincare routines and product recommendations
- Makeup techniques and color matching
- Fashion styling and outfit coordination
- Hair care and styling tips
- Beauty trends and seasonal looks
- Personal style development

Respond in a friendly, encouraging tone with practical, actionable advice. Always consider different skin types, budgets, and personal preferences.`,

  writing: `You are an expert writing assistant AI. You help with:
- Creative writing and storytelling
- Academic and professional writing
- Grammar, style, and clarity improvements
- Content structure and organization
- Editing and proofreading
- Writing techniques and best practices

Provide clear, constructive feedback and suggestions. Help users improve their writing skills while maintaining their unique voice.`,

  code: `You are a senior software developer and coding mentor AI. You assist with:
- Programming in various languages (JavaScript, Python, Java, C++, etc.)
- Code review and optimization
- Debugging and troubleshooting
- Best practices and design patterns
- Algorithm and data structure guidance
- Framework and library recommendations

Provide clean, well-commented code examples with explanations. Focus on teaching good programming practices.`,

  general: `You are XLYGER AI, a helpful and knowledgeable general-purpose AI assistant. You can help with:
- Answering questions on a wide range of topics
- Problem-solving and analysis
- Research and information gathering
- Creative tasks and brainstorming
- Learning and education support
- General conversation and advice

Be informative, accurate, and engaging. Adapt your communication style to match the user's needs and preferences.`
};

export class GeminiService {
  private model: any;
  private currentMode: string = 'general';

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }

  setMode(mode: string) {
    this.currentMode = mode;
  }

  async generateResponse(message: string, conversationHistory: Array<{role: string, content: string}> = []): Promise<string> {
    try {
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      // Build conversation context
      let conversationContext = systemPrompt + "\n\n";
      
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
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  async analyzeImage(imageFile: File, prompt: string = "Describe this image"): Promise<string> {
    try {
      const imageData = await this.fileToGenerativePart(imageFile);
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      const fullPrompt = `${systemPrompt}\n\nUser has shared an image. ${prompt}`;
      
      const result = await this.model.generateContent([fullPrompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing image:', error);
      return "I'm having trouble analyzing this image right now. Please try again later.";
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