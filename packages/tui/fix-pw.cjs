const fs = require('fs');
const f = String.raw`C:\Users\Farhan\Desktop\octo code\packages\tui\src\routes\session\index.tsx`;
let c = fs.readFileSync(f, 'utf8');

const cwLine = 'const contentWidth = createMemo(() => dimensions().width - (sidebarVisible() ? 42 : 0) - 4)';
const pwLine = cwLine + '\n  const promptMaxWidth = createMemo(() => Math.max(72, Math.min(92, dimensions().width - 18)))';

if (!c.includes('promptMaxWidth')) {
  c = c.replace(cwLine, pwLine);
  fs.writeFileSync(f, c, 'utf8');
  console.log('Added promptMaxWidth');
} else {
  console.log('Already exists');
}
