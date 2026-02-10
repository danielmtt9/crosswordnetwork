# Deployment Checklist

Comprehensive checklist for deploying the Animation System and Database-First Clue Caching System.

## ✅ Pre-Deployment

### Dependencies

- [ ] Install `jsdom` package: `npm install jsdom`
- [ ] Install `jsdom` types: `npm install -D @types/jsdom`
- [ ] Verify all Prisma dependencies are up to date
- [ ] Run `npm install` to ensure all packages are installed

### Database

- [ ] Review migration file: `prisma/migrations/20251031_add_puzzle_clue_cache/migration.sql`
- [ ] Backup production database before migration
- [ ] Run migration: `npx prisma migrate deploy`
- [ ] Verify tables created:
  - `puzzle_clue_cache`
  - `clue_cache_stats`
  - `clue_parse_log`
- [ ] Check indexes are created properly
- [ ] Generate Prisma client: `npx prisma generate`

### Configuration

- [ ] Verify `DATABASE_URL` in `.env` is correct
- [ ] Ensure file paths in puzzle records are correct
- [ ] Check public directory permissions for puzzle files
- [ ] Verify NextAuth configuration in `src/lib/auth.ts` exists

## ✅ Animation System

### Testing

- [ ] Check CSS animations load: inspect `styles/eclipsecrossword-theme.css`
- [ ] Test animation classes in browser DevTools
- [ ] Verify `prefers-reduced-motion` media query works
- [ ] Test animation triggers via bridge messages
- [ ] Validate all animation types work:
  - `ecw-animate-correct`
  - `ecw-animate-incorrect`
  - `ecw-animate-celebrate`
  - `ecw-animate-hint`
  - `ecw-animate-glow`
  - `ecw-animate-fadeIn`

### Integration

- [ ] Import animation manager in puzzle pages
- [ ] Connect to validation manager
- [ ] Test animations in:
  - Chrome
  - Firefox
  - Safari
  - Mobile browsers

## ✅ Clue Caching System

### Initial Setup

- [ ] Run background sync once to populate cache:
  ```bash
  curl -X POST http://localhost:3000/api/admin/clue-cache/sync \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
  ```
- [ ] Verify cache entries created in database
- [ ] Check first puzzle loads correctly
- [ ] Confirm second load uses cache (check `sourceInfo.source === 'cache'`)

### API Endpoints

Test all endpoints work:

- [ ] `GET /api/puzzles/[puzzleId]/clues` - Fetch clues
- [ ] `POST /api/puzzles/[puzzleId]/clues/refresh` - Force refresh
- [ ] `GET /api/admin/clue-cache` - Get stats (admin only)
- [ ] `POST /api/admin/clue-cache/bulk-refresh` - Bulk refresh (admin only)
- [ ] `DELETE /api/admin/clue-cache` - Clear cache (admin only)
- [ ] `GET /api/admin/clue-cache/sync` - Sync status (admin only)
- [ ] `POST /api/admin/clue-cache/sync` - Trigger sync (admin only)

### Monitoring

- [ ] Check cache statistics:
  ```bash
  curl http://localhost:3000/api/admin/clue-cache \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
  ```
- [ ] Verify logging is working (check `clue_parse_log` table)
- [ ] Confirm daily stats are being recorded (`clue_cache_stats`)
- [ ] Test cache hit rate is >0% after warm-up

### Integration

- [ ] Wrap puzzle pages with `ClueProvider`
- [ ] Replace iframe message listeners with `useClues` hook
- [ ] Update clue rendering components
- [ ] Add loading/error states
- [ ] Test single-player mode
- [ ] Test multiplayer mode
- [ ] Verify clues display correctly

## ✅ Performance Testing

### Metrics to Verify

- [ ] First load: ~180ms (parsing + caching)
- [ ] Second load: <20ms (cache hit)
- [ ] Cache hit rate: >90% after initial load
- [ ] Database query time: <10ms
- [ ] File hash generation: <50ms
- [ ] Parse time: <200ms for average puzzle

### Load Testing

- [ ] Test with 10 concurrent users
- [ ] Test with 100 concurrent users
- [ ] Verify cache doesn't degrade under load
- [ ] Check database connection pool handles load
- [ ] Monitor memory usage during background sync

## ✅ Production Deployment

### Environment Variables

- [ ] `DATABASE_URL` configured
- [ ] `SHADOW_DATABASE_URL` configured (for migrations)
- [ ] `NEXTAUTH_SECRET` set
- [ ] All required NextAuth providers configured

### Build Process

- [ ] Run `npm run build` successfully
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bundle size acceptable
- [ ] Prisma client generated

### Deployment Steps

1. [ ] Push code to repository
2. [ ] Deploy to staging environment
3. [ ] Run migration on staging database
4. [ ] Test all features on staging
5. [ ] Monitor staging for 24 hours
6. [ ] Deploy to production
7. [ ] Run migration on production database
8. [ ] Run initial background sync
9. [ ] Monitor production metrics

### Post-Deployment

- [ ] Monitor error logs for first hour
- [ ] Check cache hit rates
- [ ] Verify no performance regressions
- [ ] Test random puzzles load correctly
- [ ] Confirm multiplayer rooms work
- [ ] Check admin dashboard shows correct stats

## ✅ Ongoing Maintenance

### Daily

- [ ] Monitor cache hit rate (should be >95%)
- [ ] Check error count in logs
- [ ] Review failed parse attempts

### Weekly

- [ ] Run background sync manually if not automated
- [ ] Review cache statistics
- [ ] Clean up invalid cache entries
- [ ] Check for stale puzzles

### Monthly

- [ ] Analyze parse performance trends
- [ ] Review and optimize slow queries
- [ ] Clean up old cache entries (>90 days)
- [ ] Update documentation if needed

## ✅ Rollback Plan

If issues occur:

### Quick Rollback (Keep new code, disable features)

1. [ ] Revert puzzle pages to use iframe parsing directly
2. [ ] Keep database tables intact
3. [ ] Disable ClueProvider temporarily
4. [ ] Monitor for stability

### Full Rollback (Revert code and database)

1. [ ] Revert code to previous commit
2. [ ] Rollback database migration:
   ```bash
   npx prisma migrate resolve --rolled-back 20251031_add_puzzle_clue_cache
   ```
3. [ ] Drop tables manually if needed:
   ```sql
   DROP TABLE clue_parse_log;
   DROP TABLE clue_cache_stats;
   DROP TABLE puzzle_clue_cache;
   ```
4. [ ] Redeploy previous version

## ✅ Documentation

- [ ] Update README with new features
- [ ] Document new API endpoints
- [ ] Add examples to wiki/docs
- [ ] Update architecture diagrams
- [ ] Record migration in changelog

## Success Criteria

After deployment, verify:

✅ Cache hit rate >95% after warm-up  
✅ Average response time <20ms for cached clues  
✅ No increase in error rates  
✅ Multiplayer performance improved  
✅ Users report faster puzzle loading  
✅ Admin tools accessible and functional  
✅ Background sync running correctly  
✅ Animations working across browsers  

## Support Contacts

- **Technical Issues**: Check logs and database
- **Performance Issues**: Review cache stats
- **User Reports**: Check browser console logs

## Useful Commands

```bash
# Check cache stats
curl -H "Auth: TOKEN" http://localhost:3000/api/admin/clue-cache

# Trigger background sync
curl -X POST -H "Auth: TOKEN" http://localhost:3000/api/admin/clue-cache/sync

# Clear all cache (emergency)
curl -X DELETE -H "Auth: TOKEN" http://localhost:3000/api/admin/clue-cache

# Check database
npx prisma studio

# View migration status
npx prisma migrate status

# Generate Prisma client
npx prisma generate
```

## Notes

- First deployment will have 0% cache hit rate (normal)
- Cache will warm up as puzzles are accessed
- Background sync will maintain cache freshness
- Monitor logs for first 48 hours closely
- Expect 18x performance improvement for cached clues!

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Verification**: _______________  
**Sign-off**: _______________
