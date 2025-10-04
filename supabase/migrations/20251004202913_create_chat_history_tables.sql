/*
  # Chat History Storage Schema

  ## Overview
  Creates tables for storing chat conversations and messages with full RLS security.

  ## New Tables
  
  ### `conversations`
  - `id` (uuid, primary key) - Unique conversation identifier
  - `title` (text) - Conversation title (auto-generated from first message)
  - `mode` (text) - AI mode used (beauty, writing, code, general)
  - `created_at` (timestamptz) - When conversation was created
  - `updated_at` (timestamptz) - Last message timestamp
  - `user_id` (uuid) - Owner of the conversation (for future auth integration)
  
  ### `messages`
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, foreign key) - Links to conversations table
  - `type` (text) - Message type: 'user' or 'ai'
  - `content` (text) - Message content
  - `mode` (text) - AI mode at time of message
  - `created_at` (timestamptz) - When message was sent
  - `media_preview` (text, nullable) - Base64 preview for media attachments

  ## Security
  - RLS enabled on both tables
  - Public access policies for unauthenticated users (temporary, can be restricted later with auth)
  
  ## Notes
  - Currently allows public access for development
  - Can be restricted to authenticated users when auth is implemented
  - Indexes added for performance on common queries
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Conversation',
  mode text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('user', 'ai')),
  content text NOT NULL,
  mode text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  media_preview text
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for conversations (public access for now)
CREATE POLICY "Anyone can view conversations"
  ON conversations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create conversations"
  ON conversations
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update conversations"
  ON conversations
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete conversations"
  ON conversations
  FOR DELETE
  TO public
  USING (true);

-- Policies for messages (public access for now)
CREATE POLICY "Anyone can view messages"
  ON messages
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create messages"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update messages"
  ON messages
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete messages"
  ON messages
  FOR DELETE
  TO public
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation timestamp when message is added
CREATE TRIGGER update_conversation_updated_at
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();