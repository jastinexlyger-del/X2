import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mode: string;
  isLoading?: boolean;
  mediaFile?: File;
  mediaPreview?: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export class ChatHistoryService {
  async saveConversation(messages: Message[], currentMode: string): Promise<string | null> {
    try {
      const title = this.generateTitle(messages);

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title,
          mode: currentMode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (convError || !conversation) {
        console.error('Error creating conversation:', convError);
        return null;
      }

      const messagesToInsert = messages.map(msg => ({
        conversation_id: conversation.id,
        type: msg.type,
        content: msg.content,
        mode: msg.mode,
        created_at: msg.timestamp.toISOString(),
        media_preview: msg.mediaPreview || null
      }));

      const { error: msgError } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (msgError) {
        console.error('Error saving messages:', msgError);
        return null;
      }

      return conversation.id;
    } catch (error) {
      console.error('Error in saveConversation:', error);
      return null;
    }
  }

  async updateConversation(conversationId: string, messages: Message[]): Promise<boolean> {
    try {
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (deleteError) {
        console.error('Error deleting old messages:', deleteError);
        return false;
      }

      const messagesToInsert = messages.map(msg => ({
        conversation_id: conversationId,
        type: msg.type,
        content: msg.content,
        mode: msg.mode,
        created_at: msg.timestamp.toISOString(),
        media_preview: msg.mediaPreview || null
      }));

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (insertError) {
        console.error('Error inserting messages:', insertError);
        return false;
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
          title: this.generateTitle(messages)
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Error updating conversation:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateConversation:', error);
      return false;
    }
  }

  async loadConversation(conversationId: string): Promise<Message[] | null> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading conversation:', error);
        return null;
      }

      return messages.map(msg => ({
        id: msg.id,
        type: msg.type as 'user' | 'ai',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        mode: msg.mode,
        mediaPreview: msg.media_preview
      }));
    } catch (error) {
      console.error('Error in loadConversation:', error);
      return null;
    }
  }

  async getConversations(limit: number = 50): Promise<Conversation[]> {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      return conversations || [];
    } catch (error) {
      console.error('Error in getConversations:', error);
      return [];
    }
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        console.error('Error deleting conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      return false;
    }
  }

  private generateTitle(messages: Message[]): string {
    const firstUserMessage = messages.find(msg => msg.type === 'user' && !msg.isLoading);
    if (firstUserMessage) {
      const content = firstUserMessage.content.replace(/🎤/g, '').trim();
      return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
    return 'New Conversation';
  }
}

export const chatHistoryService = new ChatHistoryService();
