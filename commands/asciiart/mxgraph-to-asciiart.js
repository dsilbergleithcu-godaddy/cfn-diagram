const clc = require("cli-color");
const { XMLParser } = require("fast-xml-parser");
const colorConvert = require("color-convert");
const yScale = 12;
const xScale = 7;
const serviceColors = {
  lambda: clc.bgYellow,
  apigateway: clc.bgRed,
  sqs: clc.bgRed,
  sns: clc.bgRed,
  dynamodb: clc.bgBlue,
};

// Buffer class for CI mode
class AsciiBuffer {
  constructor() {
    this.buffer = [];
    this.colors = [];
    this.maxX = 0;
    this.maxY = 0;
  }

  // Ensure the buffer is large enough for the coordinates
  ensureSize(x, y) {
    if (x < 0 || y < 0) return false;
    
    try {
      // Expand buffer size if needed
      this.maxX = Math.max(this.maxX, x + 1);
      this.maxY = Math.max(this.maxY, y + 1);
      
      // Ensure we have enough rows
      while (this.buffer.length <= y) {
        this.buffer.push(Array(this.maxX).fill(' '));
        this.colors.push(Array(this.maxX).fill(null));
      }
      
      // Ensure each row has enough columns
      for (let i = 0; i <= y; i++) {
        if (!this.buffer[i]) {
          this.buffer[i] = [];
          this.colors[i] = [];
        }
        
        while (this.buffer[i].length <= x) {
          this.buffer[i].push(' ');
          this.colors[i].push(null);
        }
      }
      
      return true;
    } catch (err) {
      console.error(`Error in ensureSize(${x}, ${y}): ${err.message}`);
      return false;
    }
  }

  // Write a character to the buffer
  write(x, y, char, color = null) {
    // Ensure x and y are integers
    x = Math.floor(x);
    y = Math.floor(y);
    
    if (x < 0 || y < 0) return;
    
    // Only proceed if ensureSize is successful
    if (!this.ensureSize(x, y)) return;
    
    try {
      // Handle non-string characters
      if (typeof char !== 'string') {
        char = ' '; // Default to space for non-string characters
      }
      
      this.buffer[y][x] = char;
      this.colors[y][x] = color;
    } catch (err) {
      console.error(`Error in buffer.write(${x}, ${y}, '${char}'): ${err.message}`);
    }
  }

  // Render the buffer to a string (for CI mode)
  toString(useColors = true) {
    let result = '';
    for (let y = 0; y < this.buffer.length; y++) {
      let line = '';
      for (let x = 0; x < this.buffer[y].length; x++) {
        const char = this.buffer[y][x];
        const color = this.colors[y][x];
        
        if (useColors && color) {
          line += color(char);
        } else {
          line += char;
        }
      }
      // Trim trailing spaces for cleaner output
      result += line.replace(/\s+$/, '') + '\n';
    }
    return result;
  }
}

// Global state for tracking cursor position in CI mode
let currentX = 0;
let currentY = 0;
let highestY = 0;

function render(xml, options = {}) {
  const ciMode = options && options.ci === true;
  const buffer = ciMode ? new AsciiBuffer() : null;
  
  // Reset cursor position for CI mode
  currentX = 0;
  currentY = 0;
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const doc = parser.parse(xml);

  if (!ciMode) {
    console.clear();
  }
  
  const mxGraphModel = doc.mxGraphModel || doc.mxfile.diagram.mxGraphModel;
  
  // Render edges
  for (const cell of mxGraphModel.root.mxCell) {
    if (
      cell.mxGeometry &&
      cell.mxGeometry.Array &&
      cell.mxGeometry.Array.as === "points"
    ) {
      let lastKnownX, lastKnownY;
      const color = Math.floor(Math.random() * 200 + 100);
      for (let i = 0; i < cell.mxGeometry.Array.mxPoint.length; i++) {
        const point = cell.mxGeometry.Array.mxPoint[i];
        if (lastKnownX && lastKnownY) {
          edge(
            lastKnownX / xScale,
            lastKnownY / yScale,
            (point.x || lastKnownX) / xScale,
            (point.y || lastKnownY) / yScale,
            color,
            i === cell.mxGeometry.Array.mxPoint.length - 1,
            buffer,
            ciMode
          );
        }
        lastKnownX = point.x || lastKnownX;
        lastKnownY = point.y || lastKnownY;
        highestY = Math.max(highestY, lastKnownY);
      }
    }
  }

  // Render boxes
  for (const cell of mxGraphModel.root.mxCell) {
    if (cell.mxGeometry && cell.mxGeometry.width) {
      const resourceType = cell.style.match(/resIcon=mxgraph.aws4.(.+);/);
      const color = cell.style.match(/fillColor=#(.+?);/);
      box(
        cell.mxGeometry.x / xScale,
        cell.mxGeometry.y / yScale,
        resourceType ? resourceType[1] : "",
        cell.value,
        color ? color[1] : "#000000",
        buffer,
        ciMode
      );
      highestY = Math.max(cell.mxGeometry.y + 4, highestY);
    }
  }
  
  // Output final buffer for CI mode, or move cursor to bottom for interactive mode
  if (ciMode) {
    process.stdout.write(buffer.toString());
  } else {
    process.stdout.write(clc.move.bottom);
    process.stdout.write(clc.move.lineBegin);
  }
}

function edge(fromX, fromY, toX, toY, color, isLast, buffer, ciMode) {
  const coloredLine = clc.xterm(color);
  let x = fromX;
  let y = fromY;
  const deltaX = Math.max(Math.min(1, (toX - fromX) / xScale), -1);
  const deltaY = Math.max(Math.min(1, (toY - fromY) / yScale), -1);
  let prevX = Math.floor(x);
  let prevY = Math.floor(y);
  let safetyExit = 0;
  while (
    (Math.floor(x) !== Math.floor(toX) || Math.floor(y) !== Math.floor(toY)) &&
    safetyExit++ < 50
  ) {
    const flooredX = Math.floor(x);
    const flooredY = Math.floor(y);
    if (flooredX !== Math.floor(toX)) x = x + deltaX;
    if (flooredY !== Math.floor(toY)) y = y + deltaY;
    let char = "+";
    if (flooredY === prevY && flooredX !== prevX) char = "─";
    if (flooredY === prevY && flooredX === prevX) char = "─";
    if (flooredY > prevY) {
      if (flooredX == prevX) char = "│";
      if (flooredX > prevX) {
        char = "└";
        moveToAbsolute(flooredX, flooredY - 1, buffer, ciMode);
        print(coloredLine, "┐", buffer, ciMode);
      }
      if (flooredX < prevX) {
        char = "┘";
        moveToAbsolute(flooredX, flooredY - 1, buffer, ciMode);
        print(coloredLine, "┌", buffer, ciMode);
      }
    }
    if (flooredY < prevY) {
      if (flooredX === prevX) char = "│";
      if (flooredX > prevX) {
        char = "┌";
        moveToAbsolute(flooredX, flooredY + 1, buffer, ciMode);
        print(coloredLine, "┘", buffer, ciMode);
      }
      if (flooredX < prevX) {
        char = "┐";
        moveToAbsolute(flooredX, flooredY + 1, buffer, ciMode);
        print(coloredLine, "└", buffer, ciMode);
      }
    }
    prevX = flooredX;
    prevY = flooredY;
    moveToAbsolute(flooredX, flooredY, buffer, ciMode);
    print(coloredLine, char, buffer, ciMode);
  }
  if (isLast) {
    moveToAbsolute(toX, toY, buffer, ciMode);
    if (fromX > toX) {
      print(coloredLine, "<", buffer, ciMode);
    } else {
      print(coloredLine, ">", buffer, ciMode);
    }
  }
}

function box(x, y, type, text, color, buffer, ciMode) {
  const coloredBox =
    clc.bgXterm(rgbToX256(...colorConvert.hex.rgb(color))) || clc.bgBlack;

  y = y || 0;
  x = x || 0;
  const height = 2;
  if (text.length > 20) {
    text = text.substring(0, 20) + "...";
  }
  const width = Math.max(text.length, type.length + 2) + 2;
  moveToAbsolute(x, y, buffer, ciMode);
  print(coloredBox, `┌${"─".repeat(width - 2)}╮`, buffer, ciMode);
  for (let row = 0; row < height; row++) {
    moveToRelative(-width, 1, buffer, ciMode);
    print(coloredBox, `│${" ".repeat(width - 2)}│`, buffer, ciMode);
  }
  moveToRelative(-width, 1, buffer, ciMode);
  print(coloredBox, `╰${"─".repeat(width - 2)}╯`, buffer, ciMode);
  moveToAbsolute(x + 1, y + Math.floor(height / 2), buffer, ciMode);
  print(coloredBox, text, buffer, ciMode);
  moveToAbsolute(x + 1, y + Math.floor(height / 2) + 1, buffer, ciMode);
  print(coloredBox, `(${type})`, buffer, ciMode);
}

function print(color, text, buffer, ciMode) {
  if (ciMode && buffer) {
    // In CI mode, write to the buffer with color information
    for (let i = 0; i < text.length; i++) {
      buffer.write(currentX + i, currentY, text[i], color);
    }
    currentX += text.length;
  } else {
    // In interactive mode, directly write to stdout
    process.stdout.write(color(text));
  }
}

function moveToAbsolute(x, y, buffer, ciMode) {
  if (ciMode && buffer) {
    // In CI mode, just update the current position (no actual cursor movement)
    currentX = x;
    currentY = y; // No +7 offset in CI mode
  } else {
    // In interactive mode, use the original cursor control with Y offset
    process.stdout.write(clc.move.to(x, y + 7));
  }
}

function moveToRelative(x, y, buffer, ciMode) {
  if (ciMode && buffer) {
    // In CI mode, just update the current position
    currentX += x;
    currentY += y;
  } else {
    // In interactive mode, use the original cursor control
    process.stdout.write(clc.move(x, y));
  }
}

function rgbToX256(r, g, b) {
  // Calculate the nearest 0-based color index at 16 .. 231
  const v2ci = (v) => {
    if (v < 48) {
      return 0;
    } else if (v < 115) {
      return 1;
    } else {
      return Math.trunc((v - 35) / 40);
    }
  };

  const ir = v2ci(r);
  const ig = v2ci(g);
  const ib = v2ci(b);
  const colorIndex = 36 * ir + 6 * ig + ib;

  // Calculate the nearest 0-based gray index at 232 .. 255
  const average = Math.trunc((r + g + b) / 3);
  const grayIndex = average > 238 ? 23 : Math.trunc((average - 3) / 10);

  // Calculate the represented colors back from the index
  const i2cv = [0, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
  const cr = i2cv[ir];
  const cg = i2cv[ig];
  const cb = i2cv[ib];
  const gv = 8 + 10 * grayIndex;

  // Return the one which is nearer to the original input rgb value
  const distSquare = (A, B, C, a, b, c) => {
    return (A - a) * (A - a) + (B - b) * (B - b) + (C - c) * (C - c);
  };
  const colorErr = distSquare(cr, cg, cb, r, g, b);
  const grayErr = distSquare(gv, gv, gv, r, g, b);

  return colorErr <= grayErr ? 16 + colorIndex : 232 + grayIndex;
}

module.exports = {
  render,
};
