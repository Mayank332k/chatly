# 🤖 Pulse AI - Implementation & Features Documentation

This document describes the high-fidelity AI-powered features integrated into the Pulse chat application.

---

## 1. AI Assistant (Pulse AI) Identity
The AI Assistant acts as a persistent system user within the application database.

- **Role**: A "System User" that exists in the global `User` collection.
- **Account Identification**:
  - **Username**: `ai_assistant`
  - **Display Name**: Pulse AI Assistant
  - **Avatar URL**: `https://cdn-icons-png.flaticon.com/512/4712/4712035.png`
- **Lifecycle Management**: 
  - The `getOrCreateAiAgent()` method in the backend ensures this user always exists.
  - If deleted or missing, the backend automatically re-instantiates the AI agent upon the first interaction.

---

## 2. Context-Aware Conversations (`/api/chatbot/talk`)
All user-to-AI interactions are stored and treated exactly like peer-to-peer messages, providing continuity.

### Process Logic
1. **User Request**: The user sends a prompt to the AI.
2. **Context Retrieval**: The backend fetches the **last 20 messages** between the user and the Pulse AI agent to maintain conversation state.
3. **Model Invocation**:
   - **Model**: `stepfun/step-3.5-flash:free` (via OpenRouter).
   - **System Instruction**: Injects high-quality behavioral guidelines (objective, helpful, technical precision).
   - **History injection**: The 20-message context is passed as a conversation thread to the LLM.
4. **Response Persistence**:
   - The AI's reply is saved as a new `Message` object (Sender: AI, Receiver: User).
5. **Real-time Synchronization**:
   - The system triggers a `newMessage` event via **Socket.io**, ensuring the reply appears instantly across all authorized user sessions/tabs.

---

## 3. Advanced Chat Summarization (`/api/chatbot/summarize/:id`)
Enables users to get concise, objective summaries of their conversation history.

- **Scope**: Processes the **last 20 messages** of any specified conversation.
- **Architecture**: Decoupled from the primary chat logic to ensure high performance.
- **Rules of Generation**:
  - **Objectivity**: Highlights facts and discussion points without speculative bias.
  - **Attribution**: Clearly identifies participants by name within the summary.
  - **Length**: Balanced for readability (typically 3-5 key points).
  - **Resilience**: Bypasses typical content filtering for "safety" when the content is purely historical summary, ensuring users get data even in sensitive contexts.

---

## 4. Technical Implementation Details

### Alias Resolution (ID Abstraction)
The frontend doesn't need to know the specific MongoDB ObjectId of the AI assistant for core interactions.
- Routes like `getMessages`, `sendMessage`, and `markAsRead` support the virtual ID literal `"ai_assistant"`.
- The backend automatically resolves these aliases to the real AI `_id` before database querying.

### Key Backend Components
- **`routers/chatbotRoutes.js`**: Defines the summarization and talk endpoints.
- **`controllers/chatbotController.js`**: Core logic for model calling, context aggregation, and system prompts.
- **`models/messageSchema.js`**: Unified schema for storing human-to-human and human-to-AI messages.

### Frontend Integration
- **`ChatWindow.jsx`**: Dynamically renders AI responses with specialized styling.
- **`AiSidebar.jsx`**: Dedicated component for AI-specific interactions and summary triggers.

---

## 5. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chatbot/talk` | Send a prompt to the context-aware AI. Returns the AI response. |
| `GET` | `/api/chatbot/summarize/:id` | Fetch an objective summary for the chat history with the user (ID). |
| `GET` | `/messages/:id` | Retrieve persistent conversation history (including AI chats). |

---
© Pulse Chat Application - Intelligent Communication Infrastructure
