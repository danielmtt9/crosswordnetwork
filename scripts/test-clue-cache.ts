/**
 * Test script for Clue Caching System
 * 
 * Run with: npx ts-node scripts/test-clue-cache.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testClueCacheSystem() {
  console.log('🧪 Testing Clue Cache System...\n');

  try {
    // Test 1: Check tables exist
    console.log('1️⃣  Checking database tables...');
    
    const cacheCount = await prisma.puzzleClueCache.count();
    console.log(`   ✅ puzzle_clue_cache table exists (${cacheCount} entries)`);
    
    const statsCount = await prisma.clueCacheStats.count();
    console.log(`   ✅ clue_cache_stats table exists (${statsCount} entries)`);
    
    const logsCount = await prisma.clueParseLog.count();
    console.log(`   ✅ clue_parse_log table exists (${logsCount} entries)`);

    // Test 2: Check puzzle relation
    console.log('\n2️⃣  Checking puzzle relations...');
    const puzzles = await prisma.puzzle.findMany({
      take: 1,
      include: {
        clueCache: true,
      },
    });
    
    if (puzzles.length > 0) {
      console.log(`   ✅ Found puzzle: "${puzzles[0].title}" (ID: ${puzzles[0].id})`);
      console.log(`   📊 Cache entries for this puzzle: ${puzzles[0].clueCache.length}`);
    } else {
      console.log('   ⚠️  No puzzles found in database');
    }

    // Test 3: Create a test log entry
    console.log('\n3️⃣  Testing log creation...');
    const testLog = await prisma.clueParseLog.create({
      data: {
        puzzleId: puzzles.length > 0 ? puzzles[0].id : 1,
        action: 'TEST',
        source: 'test-script',
        success: true,
        durationMs: 100,
      },
    });
    console.log(`   ✅ Created test log entry (ID: ${testLog.id})`);

    // Test 4: Check today's stats
    console.log('\n4️⃣  Checking daily stats...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayStats = await prisma.clueCacheStats.findUnique({
      where: { date: today },
    });

    if (!todayStats) {
      console.log('   📝 No stats for today, creating entry...');
      todayStats = await prisma.clueCacheStats.create({
        data: {
          date: today,
          cacheHits: 0,
          cacheMisses: 0,
          iframeParses: 0,
          totalRefreshes: 0,
          errors: 0,
        },
      });
    }

    console.log(`   ✅ Today's stats:`);
    console.log(`      Cache Hits: ${todayStats.cacheHits}`);
    console.log(`      Cache Misses: ${todayStats.cacheMisses}`);
    console.log(`      Iframe Parses: ${todayStats.iframeParses}`);
    console.log(`      Total Refreshes: ${todayStats.totalRefreshes}`);
    console.log(`      Errors: ${todayStats.errors}`);

    // Test 5: Summary
    console.log('\n✅ All tests passed!\n');
    console.log('📊 System Status:');
    console.log(`   • Total cached puzzles: ${cacheCount}`);
    console.log(`   • Total log entries: ${logsCount}`);
    console.log(`   • Stats days tracked: ${statsCount}`);
    console.log(`   • Database connection: ✅ Working`);
    console.log(`   • Tables: ✅ All present`);
    console.log(`   • Relations: ✅ Configured\n`);

    console.log('🎉 Clue caching system is ready to use!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testClueCacheSystem();
