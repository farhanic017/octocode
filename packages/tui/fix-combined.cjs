const fs = require('fs');
const f = String.raw`C:\Users\Farhan\Desktop\octo code\packages\tui\src\component\prompt\index.tsx`;
const buf = fs.readFileSync(f);
let c = buf.toString('utf8');
const NL = '\r\n';

// 1. Remove the early homeDock return block
// Find: if (props.homeDock) {\n      input.cursorColor = HOME_DOCK_BG\n      return\n    }
const earlyReturn = '    if (props.homeDock) {\r\n      input.cursorColor = HOME_DOCK_BG\r\n      return\r\n    }';
if (c.includes(earlyReturn)) {
  c = c.replace(earlyReturn + '\r\n', '');
  console.log('1. Removed early homeDock return');
} else {
  console.log('1. Early return pattern not found, trying alternatives...');
  // Try with \n only
  const alt = '    if (props.homeDock) {\n      input.cursorColor = HOME_DOCK_BG\n      return\n    }';
  if (c.includes(alt)) {
    c = c.replace(alt + '\n', '');
    console.log('1. Removed early homeDock return (alt)');
  } else {
    console.log('1. SKIP - not found');
  }
}

// 2. Change visible={!props.homeDock} to visible={true} for the 3 model/status boxes
c = c.replace(/visible=\{!props\.homeDock\}/g, 'visible={true}');
console.log('2. Changed visible={!props.homeDock} to visible={true}');

// 3. Remove the liveVoice homeDockButton
const liveVoiceStart = c.indexOf('id: "liveVoice"');
if (liveVoiceStart !== -1) {
  const marker = '{homeDockButton({';
  const blockStart = c.lastIndexOf(marker, liveVoiceStart);
  let depth = 0;
  let blockEnd = -1;
  for (let i = blockStart; i < c.length; i++) {
    if (c.substring(i, i + 3) === '({ ') depth++;
    if (c.substring(i, i + 3) === '})}') {
      if (depth <= 1) { blockEnd = i + 3; break; }
      depth--;
    }
  }
  if (blockEnd !== -1) {
    c = c.substring(0, blockStart) + c.substring(blockEnd);
    console.log('3. Removed liveVoice button');
  }
}

// 4. Update send button color - white when text, gray when empty
c = c.replace(
  'children: <text fg={hoverFg("send", HOME_DOCK_ACCENT, HOME_DOCK_ACCENT_HOVER)}>↑</text>,',
  'children: <text fg={store.prompt.input.length > 0 ? hoverFg("send", HOME_DOCK_TEXT, HOME_DOCK_TEXT) : hoverFg("send", HOME_DOCK_TEXT_MUTED, HOME_DOCK_TEXT_MUTED)}>↑</text>,'
);
console.log('4. Updated send button color');

// 5. Add homeDockControls() after inputArea() in the session render path
// The textarea ends with syntaxStyle={syntax()} /> and then there's a model info box
// Find the textarea close and add homeDockControls after it
const textareaClose = 'syntaxStyle={syntax()}';
const textAreaIdx = c.indexOf(textAreaIdx);
// Actually find it in the session path (after line 1689)
const sessionReturnIdx = c.indexOf('border={props.homeDock ? false : ["left"]}');

// Find the textarea close after session return
const taCloseIdx = c.indexOf(textareaClose, sessionReturnIdx);
if (taCloseIdx !== -1) {
  const afterTaClose = taCloseIdx + textareaClose.length;
  // Find the first > after syntaxStyle
  const gtIdx = c.indexOf('/>', afterTaClose);
  const insertPoint = gtIdx + 2;
  
  // Check if homeDockControls is already there
  if (!c.substring(insertPoint, insertPoint + 50).includes('homeDockControls')) {
    const controls = NL + '            <Show when={props.homeDock}>' + NL +
      '              {homeDockControls()}' + NL +
      '            </Show>';
    c = c.substring(0, insertPoint) + controls + c.substring(insertPoint);
    console.log('5. Added homeDockControls() after textarea');
  } else {
    console.log('5. homeDockControls already present');
  }
} else {
  console.log('5. textarea close not found in session path');
}

fs.writeFileSync(f, c, 'utf8');
console.log('DONE - wrote', c.length, 'chars');
