

# Real Community Forum Backed by the Database

## Overview
Replace the static mock data on the Community page with a fully functional forum. Logged-in users will be able to create topics, reply to them, and like posts. All data will be stored in the database with proper security policies.

## Step 1: Database Migration -- Create Tables

### `community_posts` table
Stores both topics (top-level posts) and replies.

```sql
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  title text,  -- only set on top-level topics
  body text NOT NULL,
  category text NOT NULL DEFAULT 'Discussion',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can read all posts
CREATE POLICY "Anyone can view posts"
  ON public.community_posts FOR SELECT
  USING (true);

-- Users can create posts (user_id must match)
CREATE POLICY "Users can create posts"
  ON public.community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON public.community_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id);
```

### `community_likes` table
Tracks one like per user per post (unique constraint prevents duplicates).

```sql
CREATE TABLE public.community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.community_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like"
  ON public.community_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.community_likes FOR DELETE
  USING (auth.uid() = user_id);
```

### Trigger for `updated_at`
Reuse the existing `update_updated_at_column` function.

```sql
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 2: Create a Custom Hook -- `useCommunity.ts`

New file: `src/hooks/useCommunity.ts`

- **Fetch topics**: Query `community_posts` where `parent_id IS NULL`, joined with `profiles` for display name, and include aggregated reply count and like count via sub-selects or separate queries.
- **Fetch replies**: Given a `post_id`, query `community_posts` where `parent_id = post_id`, joined with `profiles`.
- **Create topic**: Insert into `community_posts` with `parent_id = null`, `title`, `body`, `category`.
- **Create reply**: Insert with `parent_id` set, no title.
- **Toggle like**: Check if a like exists; if so delete it, otherwise insert.
- Uses `@tanstack/react-query` for caching and refetching, matching existing hook patterns.

## Step 3: Create a "New Topic" Dialog Component

New file: `src/components/community/CreateTopicDialog.tsx`

- Uses the existing `Dialog` component from `@radix-ui/react-dialog`.
- Form fields: Title (Input), Category (Select with options: Discussion, Team Recruitment, Announcement), Body (Textarea).
- On submit, calls the create-topic mutation from the hook.
- Includes validation (title and body required).

## Step 4: Create a Topic Detail View with Replies

New file: `src/components/community/TopicDetail.tsx`

- Shown when a user clicks a topic row (rendered as a Dialog or inline expansion).
- Displays the original post body, author, timestamp.
- Lists all replies below.
- Includes a reply form (Textarea + Submit button) at the bottom.
- Each post/reply shows a like button with current count; clicking toggles the like.

## Step 5: Rewrite the Community Page

Modify `src/pages/Community.tsx`:

- Replace hardcoded `topics` array with data from `useCommunity` hook.
- Stats cards show real counts: total topics, total replies (or total posts), and announcements count -- all derived from the fetched data.
- Add a "New Topic" button (visible to logged-in users) that opens `CreateTopicDialog`.
- Each topic row is clickable and opens `TopicDetail`.
- Category colors remain the same (`Team Recruitment` = neon-accent, `Discussion` = primary, `Announcement` = warning).
- Show loading skeleton while data loads and an empty state if no topics exist.

## Files Changed Summary

| Action | File |
|--------|------|
| Migration | Create `community_posts` and `community_likes` tables with RLS |
| Create | `src/hooks/useCommunity.ts` |
| Create | `src/components/community/CreateTopicDialog.tsx` |
| Create | `src/components/community/TopicDetail.tsx` |
| Modify | `src/pages/Community.tsx` |

