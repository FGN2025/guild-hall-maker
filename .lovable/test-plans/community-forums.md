# Test Plan: Community Forums

Covers topic creation, replies, likes, pinning, categories, and moderation.

---

## Prerequisites

1. Logged in as an authenticated user.
2. An admin account available for pin/moderation tests.

---

## Phase 1: Topic Creation

### Test 1.1 — Create a Topic
1. Navigate to `/community`.
2. Click **New Topic** (or equivalent).
3. Fill in title, body, and category.
4. Submit.
5. **Expected**: Toast confirmation. Topic appears at the top of the list with correct title, category badge, and author name.

### Test 1.2 — Validation
1. Try submitting with empty title or body.
2. **Expected**: Validation error prevents submission.

---

## Phase 2: Replies

### Test 2.1 — Reply to a Topic
1. Open an existing topic.
2. Type a reply and submit.
3. **Expected**: Reply appears below the original post with author info and timestamp. Reply count increments.

### Test 2.2 — Multiple Replies
1. Add 3+ replies to a topic.
2. **Expected**: All replies displayed in chronological order.

---

## Phase 3: Likes

### Test 3.1 — Like a Post
1. Click the like button on a topic or reply.
2. **Expected**: Like count increments. Button shows "liked" state.

### Test 3.2 — Unlike a Post
1. Click the like button again.
2. **Expected**: Like count decrements. Button reverts to "unliked."

### Test 3.3 — Duplicate Like Prevention
1. Verify RLS: `community_likes` has unique constraint on `(post_id, user_id)`.
2. **Expected**: Database prevents double-liking.

---

## Phase 4: Pinning & Moderation

### Test 4.1 — Admin Can Pin a Post
1. As admin, toggle pin on a topic.
2. **Expected**: Post moves to top of the list with a "Pinned" indicator. `is_pinned = true` in DB.

### Test 4.2 — Admin Can Edit Any Post
1. As admin, edit another user's post body.
2. **Expected**: Changes persist. RLS policy "Admins can update any post" allows this.

### Test 4.3 — Users Can Only Edit Own Posts
1. As a regular user, attempt to edit another user's post.
2. **Expected**: Edit button not visible, or RLS blocks the update.

### Test 4.4 — Users Can Delete Own Posts
1. Delete a post you created.
2. **Expected**: Post removed. Associated replies (via `parent_id`) may remain or cascade (verify behavior).

---

## Phase 5: Categories

### Test 5.1 — Filter by Category
1. Select a specific category filter.
2. **Expected**: Only posts matching that category are displayed.

### Test 5.2 — Default Category
1. Create a post without selecting a category.
2. **Expected**: Defaults to "Discussion" per DB schema default.

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **Very long post body** | Renders with scroll/truncation, no layout break |
| **Post by deleted user** | Shows "Unknown" author |
| **No posts exist** | Empty state with prompt to create first topic |
| **Rapid like/unlike** | No duplicate rows; final state is correct |
