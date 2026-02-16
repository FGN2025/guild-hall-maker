

# is_active Filtering and Drag-to-Reorder for Games

## 1. Public Games Query -- is_active Filter

**File:** `src/hooks/useGames.ts`

- Split the current `useGames` hook into two variants:
  - `useGames()` (public) -- adds `.eq("is_active", true)` to only return active games. Used by the catalog page.
  - `useAdminGames()` (admin) -- returns all games regardless of `is_active`. Used by the admin page.
- Update `src/pages/Games.tsx` to continue using `useGames()` (no change needed there).
- Update `src/pages/admin/AdminGames.tsx` to import and use `useAdminGames()` instead.

## 2. Drag-to-Reorder in Admin Games Table

**File:** `src/pages/admin/AdminGames.tsx`

- Add `@dnd-kit/core` and `@dnd-kit/sortable` integration (already installed).
- Wrap the `TableBody` in a `SortableContext` with the games array ordered by `display_order`.
- Add a new "Order" column with a drag handle icon (GripVertical) as the first column.
- Each `TableRow` becomes a sortable item using `useSortable`.
- On drag end, compute the new order and batch-update `display_order` for all affected rows.

**File:** `src/hooks/useGames.ts`

- Add a new `useReorderGames()` mutation that accepts an array of `{ id, display_order }` and performs a batch update (loop of individual updates, since Supabase JS doesn't support bulk upsert on arbitrary columns easily).

## Technical Details

### useGames split

```typescript
// Public: only active games
export const useGames = () => {
  return useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as unknown as Game[]) ?? [];
    },
  });
};

// Admin: all games
export const useAdminGames = () => {
  return useQuery({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games" as any)
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as unknown as Game[]) ?? [];
    },
  });
};
```

### Reorder mutation

```typescript
export const useReorderGames = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from("games" as any)
          .update({ display_order: item.display_order } as any)
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      toast({ title: "Order updated" });
    },
  });
};
```

### Admin table drag-and-drop

- Use `DndContext` with `closestCenter` collision detection and `restrictToVerticalAxis` modifier.
- Use `SortableContext` with `verticalListSortingStrategy`.
- Create a `SortableGameRow` component that uses `useSortable` hook to make each row draggable.
- Apply `transform` and `transition` styles from `useSortable` to the row.
- Add a `GripVertical` icon in the first cell as the drag handle (using `attributes` and `listeners` from `useSortable`).
- On `onDragEnd`, use `arrayMove` to reorder the local list, then call `useReorderGames` with the new order indices.

### Files changed

| File | Change |
|------|--------|
| `src/hooks/useGames.ts` | Add `useAdminGames`, `useReorderGames`; add `.eq("is_active", true)` to `useGames` |
| `src/pages/admin/AdminGames.tsx` | Switch to `useAdminGames`, add dnd-kit drag-to-reorder with GripVertical handles and Order column |

No database changes required -- both `is_active` and `display_order` columns already exist.

