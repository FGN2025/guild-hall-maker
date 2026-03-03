# Test Plan: AI Coach

Covers conversation creation, message exchange, game context, history, and deletion.

---

## Prerequisites

1. Logged in as any authenticated user.
2. At least one active game in the `games` table.
3. `ai-coach` edge function deployed with `LOVABLE_API_KEY` secret configured.

---

## Phase 1: Conversation Management

### Test 1.1 — Create New Conversation
1. Open the Coach interface (floating button or `/coach`).
2. Start a new chat.
3. **Expected**: `coach_conversations` row created with `user_id = auth.uid()`, default title "New Chat".

### Test 1.2 — Select Game Context
1. Select a game from the game selector.
2. **Expected**: `game_id` updated on the conversation. AI responses should reference the selected game.

### Test 1.3 — View Conversation History
1. Send 3+ messages in a conversation.
2. Navigate away and return.
3. **Expected**: All messages (user + assistant) load in correct order from `coach_messages`.

### Test 1.4 — Delete Conversation
1. Delete a conversation.
2. **Expected**: Conversation and all associated messages removed. RLS ensures only own conversations can be deleted.

---

## Phase 2: Messaging

### Test 2.1 — Send a Message
1. Type a gaming question and send.
2. **Expected**: User message appears immediately. AI response streams/appears after a brief delay. Both stored in `coach_messages` with correct `role` (user/assistant).

### Test 2.2 — AI Response Quality
1. Ask a game-specific strategy question (e.g., "Best landing spots in Fortnite?").
2. **Expected**: AI provides relevant, game-specific advice.

### Test 2.3 — Error Handling
1. Simulate a network error or AI timeout.
2. **Expected**: Error toast displayed. User can retry. No orphaned messages.

---

## Phase 3: RLS & Privacy

### Test 3.1 — Users Can Only See Own Conversations
1. Query `coach_conversations` as User A.
2. **Expected**: Only User A's conversations returned. User B's conversations are invisible.

### Test 3.2 — Users Can Only See Own Messages
1. Query `coach_messages` for a conversation belonging to another user.
2. **Expected**: Empty result (RLS blocks via subquery on `coach_conversations`).

---

## Phase 4: Multiple Conversations

### Test 4.1 — Switch Between Conversations
1. Create 3 conversations with different games.
2. Switch between them.
3. **Expected**: Each loads its own message history. Game context preserved per conversation.

### Test 4.2 — Conversation Title Update
1. After first message exchange, check if title updates.
2. **Expected**: Title may auto-update based on first message content (if implemented), or remains "New Chat".

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **Very long message** | Handled without truncation or crash |
| **Rapid message sending** | Messages queued and processed sequentially |
| **No games exist** | Game selector shows empty; coach still works without game context |
| **AI service down** | Graceful error message; user messages still saved |
