# ClueProvider Migration Checklist

## Overview
Track the migration status of all puzzle pages from direct iframe clue extraction to the ClueProvider system.

---

## Migration Status Legend
- ⏳ **Pending**: Not yet migrated
- 🔄 **In Progress**: Currently being migrated
- ✅ **Complete**: Fully migrated and tested
- ❌ **Blocked**: Cannot migrate due to dependency or issue

---

## Pages to Migrate

### Single Player Pages

| Page | Status | Location | Notes |
|------|--------|----------|-------|
| **Single Player Puzzle** | ⏳ Pending | `src/app/puzzles/[id]/page.tsx` | Main single-player page with clue extraction at lines 289-300 |

### Multiplayer Pages

| Page | Status | Location | Notes |
|------|--------|----------|-------|
| **Multiplayer Room** | ⏳ Pending | `src/app/room/[roomCode]/page.tsx` | Current multiplayer page uses `parseCluesFromIframe` at lines 361-372 |
| **Old Multiplayer Room** | ❌ Blocked | `src/app/room/[roomCode]/page-old.tsx` | Deprecated file, may not need migration |

---

## Migration Steps (Per Page)

For each page listed above:

1. **Wrap page with ClueProvider**
   - [ ] Add `ClueProvider` import
   - [ ] Wrap component tree with provider
   - [ ] Pass `puzzleId` and `iframeRef` props

2. **Replace direct extraction**
   - [ ] Remove `extractCluesWithRetry` calls
   - [ ] Remove `formatCluesForDisplay` calls
   - [ ] Remove local clue state (`useState`)
   - [ ] Add `useClueProvider()` hook

3. **Update UI**
   - [ ] Add loading state handling
   - [ ] Add error state handling
   - [ ] Update CluesPanel props to use context clues

4. **Testing**
   - [ ] Verify clues load from DB on first load
   - [ ] Test iframe fallback when DB unavailable
   - [ ] Verify loading states display correctly
   - [ ] Test error handling and retry functionality
   - [ ] Confirm clue highlighting still works

5. **Cleanup**
   - [ ] Remove unused imports
   - [ ] Remove commented-out code
   - [ ] Update documentation if needed

---

## Additional Tasks

### Database & API
- [x] ✅ Database schema created (`puzzle_clue_cache`)
- [x] ✅ ClueRepository implemented
- [x] ✅ API endpoint created (`/api/puzzles/[id]/clues`)
- [x] ✅ Admin endpoints created (`/api/admin/clue-cache/*`)
- [x] ✅ Background sync service implemented

### Context & Hooks
- [x] ✅ ClueProvider context created
- [x] ✅ useClueProvider hook implemented
- [x] ✅ Integration with puzzle bridge completed

### Background Services
- [ ] ⏳ Schedule background sync (cron or scheduler)
  - Option 1: Node-cron job
  - Option 2: External scheduler (Vercel Cron, etc.)
  - Option 3: On-demand via admin panel

### Documentation
- [x] ✅ Clue caching system README
- [x] ✅ Migration guide created
- [x] ✅ This checklist created

---

## Testing Checklist

After migrating all pages:

- [ ] Load puzzle from DB on first visit (no iframe wait)
- [ ] Fallback to iframe when DB unavailable
- [ ] Cache invalidates when puzzle file changes
- [ ] Admin tools work correctly (stats, refresh, clear)
- [ ] Background sync refreshes stale entries
- [ ] Clue highlighting works in single-player
- [ ] Clue highlighting works in multiplayer
- [ ] Error states handle gracefully
- [ ] Loading states display properly
- [ ] Performance improved (faster clue load times)

---

## Known Issues / Notes

- **Issue**: `page-old.tsx` may be deprecated and not need migration
  - **Resolution**: Confirm with team before migrating

- **Note**: Multiplayer page requires fetching `puzzleId` from room before wrapping with ClueProvider
  - **Solution**: Use conditional rendering or loader until `puzzleId` is available

- **Note**: Background sync not yet scheduled
  - **Next Step**: Add cron job or scheduler to run sync periodically

---

## Migration Progress Summary

**Total Pages**: 3  
**Completed**: 0  
**Pending**: 2  
**Blocked**: 1  

**Completion**: 0%

---

## Next Steps

1. ⏳ Migrate Single Player Puzzle page (`src/app/puzzles/[id]/page.tsx`)
2. ⏳ Migrate Multiplayer Room page (`src/app/room/[roomCode]/page.tsx`)
3. ⏳ Set up background sync scheduler
4. 🎯 Test all pages thoroughly
5. 🚀 Deploy to production

---

## Resources

- **Migration Guide**: `docs/CLUE_MIGRATION_GUIDE.md`
- **Clue Cache Docs**: `src/lib/clueCache/README.md`
- **ClueProvider**: `src/contexts/ClueProvider.tsx`
- **useClueProvider**: `src/hooks/useClueProvider.ts`
- **API Routes**: `src/app/api/puzzles/[id]/clues/route.ts`

---

**Last Updated**: 2025-01-XX  
**Updated By**: [Your Name]
