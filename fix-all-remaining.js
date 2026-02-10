const fs = require('fs');

const files = [
  'src/app/api/multiplayer/rooms/[roomId]/backup/monitor/route.ts',
  'src/app/api/multiplayer/rooms/[roomId]/backup/report/route.ts',
  'src/app/api/multiplayer/rooms/[roomId]/backup/route.ts',
  'src/app/api/multiplayer/rooms/[roomId]/backup/schedule/route.ts',
  'src/app/api/multiplayer/rooms/[roomId]/backup/test/route.ts',
  'src/app/api/multiplayer/rooms/[roomId]/host/transfer/route.ts',
  'src/app/api/multiplayer/rooms/[roomId]/persistence/route.ts',
  'src/app/api/multiplayer/rooms/[roomId]/recovery/route.ts',
  'src/app/api/multiplayer/rooms/[roomId]/state/route.ts'
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Fix missing NextRequest import
    if (content.includes('NextRequest') && !content.includes("import { NextRequest")) {
      content = content.replace(
        /import { NextResponse } from 'next\/server';/g,
        "import { NextRequest, NextResponse } from 'next/server';"
      );
      hasChanges = true;
    }
    
    // Fix extra braces after await params
    content = content.replace(/const \{ (\w+) \} = await params; \{\s*/g, 'const { $1 } = await params;\n');
    
    // Fix duplicate roomId declarations
    content = content.replace(/const \{ roomId \} = await params;\s*.*?const \{ roomId \} = params;/g, 'const { roomId } = await params;');
    
    // Fix req.url to request.url
    content = content.replace(/new URL\(req\.url\)/g, 'new URL(request.url)');
    
    if (hasChanges || content.includes('const { roomId } = await params; {')) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Fix all files
files.forEach(fixFile);
console.log('Done fixing all remaining files!');