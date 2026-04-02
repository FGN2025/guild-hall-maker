

## Fix Drag-and-Drop Reorder Requiring Multiple Attempts

### Root Cause

In `handleDragEnd` (line 190–197), `arrayMove` is called on `filtered` (a derived `useMemo` from the query cache), and the new order is sent to the database. However, **no optimistic cache update** is performed — the UI still shows the old order from the stale query cache until `invalidateQueries` fires and the refetch completes. During that brief window the rows snap back to their original positions, making it appear the drag didn't work. If the user drags again before the refetch lands, the second drag operates on stale data, compounding the problem.

Additionally, the `reorderMutation` fires individual `UPDATE` calls in a `for` loop (line 181–184), which is slow and means the refetch can start before all updates have landed.

### Fix — `src/pages/admin/AdminChallenges.tsx`

1. **Optimistic cache update in `handleDragEnd`**: Before calling `reorderMutation.mutate()`, use `queryClient.setQueryData` to immediately rewrite the `["admin-challenges"]` cache with the reordered array. This makes the UI reflect the new order instantly.

2. **Rollback on error**: Store the previous cache snapshot and restore it in the mutation's `onError` callback so a failed save reverts the UI.

3. **Cancel in-flight refetches**: Call `queryClient.cancelQueries({ queryKey: ["admin-challenges"] })` at the start of `handleDragEnd` to prevent a concurrent refetch from overwriting the optimistic update before the mutation completes.

4. **Batch the database writes**: Replace the sequential `for` loop with a single RPC or a `Promise.all` so all `display_order` updates land atomically before the post-mutation refetch.

### Pseudocode

```ts
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = filtered.findIndex(c => c.id === active.id);
  const newIndex = filtered.findIndex(c => c.id === over.id);
  const reordered = arrayMove(filtered, oldIndex, newIndex);

  // 1. Cancel any in-flight refetch
  await queryClient.cancelQueries({ queryKey: ["admin-challenges"] });

  // 2. Snapshot + optimistic update
  const previous = queryClient.getQueryData(["admin-challenges"]);
  queryClient.setQueryData(["admin-challenges"], 
    reordered.map((c, i) => ({ ...c, display_order: i }))
  );

  // 3. Persist (batched)
  reorderMutation.mutate(
    reordered.map((c, i) => ({ id: c.id, display_order: i })),
    { onError: () => queryClient.setQueryData(["admin-challenges"], previous) }
  );
};
```

And update the mutation to use `Promise.all` instead of a sequential loop:

```ts
mutationFn: async (items) => {
  await Promise.all(items.map(item =>
    supabase.from("challenges")
      .update({ display_order: item.display_order })
      .eq("id", item.id)
      .then(({ error }) => { if (error) throw error; })
  ));
},
```

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminChallenges.tsx` | Add optimistic cache update, rollback on error, cancel in-flight queries, batch DB writes |

