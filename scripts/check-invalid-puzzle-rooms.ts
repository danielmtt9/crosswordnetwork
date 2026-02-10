/**
 * Script to check for multiplayer rooms with invalid/inaccessible puzzles
 * Run with: npx tsx scripts/check-invalid-puzzle-rooms.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInvalidPuzzleRooms() {
  console.log('Checking for rooms with invalid puzzles...\n');

  try {
    // Get all rooms (including expired ones to see the full picture)
    const rooms = await prisma.multiplayerRoom.findMany({
      // Remove status filter to see all rooms
      include: {
        puzzle: {
          select: {
            id: true,
            title: true,
            is_active: true
          }
        },
        hostUser: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${rooms.length} total rooms\n`);

    // Check for rooms with null puzzles
    const roomsWithNullPuzzles = rooms.filter(room => !room.puzzle);
    
    if (roomsWithNullPuzzles.length > 0) {
      console.log(`⚠️  Found ${roomsWithNullPuzzles.length} rooms with inaccessible puzzles:\n`);
      
      roomsWithNullPuzzles.forEach(room => {
        console.log(`  - Room: ${room.roomCode} (${room.name || 'Unnamed'})`);
        console.log(`    Puzzle ID: ${room.puzzleId}`);
        console.log(`    Host: ${room.hostUser?.username || room.hostUser?.name || 'Unknown'}`);
        console.log(`    Status: ${room.status}`);
        console.log(`    Created: ${room.createdAt.toISOString()}`);
        console.log('');
      });
    } else {
      console.log('✅ All rooms have valid puzzles');
    }

    // Check for rooms with inactive puzzles
    const roomsWithInactivePuzzles = rooms.filter(
      room => room.puzzle && room.puzzle.is_active === false
    );

    if (roomsWithInactivePuzzles.length > 0) {
      console.log(`⚠️  Found ${roomsWithInactivePuzzles.length} rooms with inactive puzzles:\n`);
      
      roomsWithInactivePuzzles.forEach(room => {
        console.log(`  - Room: ${room.roomCode} (${room.name || 'Unnamed'})`);
        console.log(`    Puzzle: ${room.puzzle?.title} (ID: ${room.puzzleId})`);
        console.log(`    Host: ${room.hostUser?.username || room.hostUser?.name || 'Unknown'}`);
        console.log(`    Status: ${room.status}`);
        console.log('');
      });
    }

    // Check puzzle counts
    const puzzleCount = await prisma.puzzle.count();
    const activePuzzleCount = await prisma.puzzle.count({ where: { is_active: true } });
    
    // Summary
    console.log('\n--- Summary ---');
    console.log(`Total rooms: ${rooms.length}`);
    console.log(`Active rooms: ${rooms.filter(r => r.status === 'WAITING' || r.status === 'ACTIVE').length}`);
    console.log(`Rooms with null puzzles: ${roomsWithNullPuzzles.length}`);
    console.log(`Rooms with inactive puzzles: ${roomsWithInactivePuzzles.length}`);
    console.log(`Valid rooms: ${rooms.length - roomsWithNullPuzzles.length - roomsWithInactivePuzzles.length}`);
    console.log(`\nTotal puzzles in database: ${puzzleCount}`);
    console.log(`Active puzzles: ${activePuzzleCount}`);
    console.log(`Inactive puzzles: ${puzzleCount - activePuzzleCount}`);

  } catch (error) {
    console.error('Error checking rooms:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvalidPuzzleRooms();
