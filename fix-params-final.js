const fs = require('fs');
const path = require('path');

// List of files that need fixing
const files = [
  'src/app/api/multiplayer/rooms/[roomId]/backup/automation/route.ts',
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
    
    // Fix extra braces after await params
    content = content.replace(/const \{ (\w+) \} = await params; \{\s*/g, 'const { $1 } = await params;\n');
    
    // Fix missing NextRequest import
    if (content.includes('NextRequest') && !content.includes("import { NextRequest")) {
      content = content.replace(
        /import { NextResponse } from 'next\/server';/g,
        "import { NextRequest, NextResponse } from 'next/server';"
      );
    }
    
    // Fix old params pattern
    const oldPattern = /export async function (GET|POST|PUT|DELETE|PATCH)\(\s*[^,]+,\s*\{ params \}: \{ params: \{ ([^}]+) \} \}\s*\)/g;
    let match;
    
    while ((match = oldPattern.exec(content)) !== null) {
      const [fullMatch, method, paramTypes] = match;
      
      // Extract parameter names
      const paramNames = paramTypes.split(',').map(pair => {
        const [name] = pair.trim().split(':').map(s => s.trim());
        return name;
      }).join(', ');
      
      // Create the new function signature
      const newSignature = `export async function ${method}(\n  request: NextRequest,\n  { params }: { params: Promise<{ ${paramTypes} }> }\n) {\n  const { ${paramNames} } = await params;`;
      
      content = content.replace(fullMatch, newSignature);
      hasChanges = true;
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Fix all files
files.forEach(fixFile);
console.log('Done fixing params!');