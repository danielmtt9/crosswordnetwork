import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPaths() {
  const puzzles = await prisma.puzzle.findMany({
    where: {
      OR: [
        { clues: null },
        { clues: '' }
      ]
    },
    select: {
      id: true,
      title: true,
      file_path: true,
    },
    take: 10
  });

  console.log('Puzzles without clues:\n');
  puzzles.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`Title: ${p.title}`);
    console.log(`Path: ${p.file_path}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

checkPaths();
