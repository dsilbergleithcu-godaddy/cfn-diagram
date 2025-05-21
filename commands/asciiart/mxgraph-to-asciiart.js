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

  // Add a border with stack name around the buffer content
  addBorder(stackName) {
    // Find the actual max content width
    let maxContentWidth = 0;
    for (let y = 0; y < this.buffer.length; y++) {
      // Find the position of the last non-space character in each row
      let rowLastContentPos = 0;
      for (let x = this.buffer[y].length - 1; x >= 0; x--) {
        if (this.buffer[y][x] && this.buffer[y][x] !== ' ') {
          rowLastContentPos = x;
          break;
        }
      }
      maxContentWidth = Math.max(maxContentWidth, rowLastContentPos + 1);
    }
    
    // Calculate required width for the stack name (with margin)
    const title = stackName ? "Stack: " + stackName : "";
    const minWidthForTitle = title.length + 4; // Add some padding around the title
    
    // Add padding and ensure border is wide enough for both content and title
    const borderWidth = Math.max(maxContentWidth + 4, minWidthForTitle);
    
    // Create a new buffer with extra space for border
    const borderedBuffer = new AsciiBuffer();
    
    // Draw top border
    borderedBuffer.write(0, 0, '╭' + '─'.repeat(borderWidth - 2) + '╮');
    
    // Title row with stack name
    borderedBuffer.write(0, 1, '│');
    
    if (stackName) {
      const title = "Stack: " + stackName;
      const padding = Math.max(0, Math.floor((borderWidth - 2 - title.length) / 2));
      
      // Print spaces up to the title
      for (let i = 0; i < padding; i++) {
        borderedBuffer.write(1 + i, 1, ' ');
      }
      
      // Print the title
      for (let i = 0; i < title.length; i++) {
        borderedBuffer.write(1 + padding + i, 1, title[i]);
      }
      
      // Print spaces after the title
      for (let i = 0; i < borderWidth - 2 - padding - title.length; i++) {
        borderedBuffer.write(1 + padding + title.length + i, 1, ' ');
      }
    } else {
      // No title, just fill with spaces
      for (let i = 0; i < borderWidth - 2; i++) {
        borderedBuffer.write(1 + i, 1, ' ');
      }
    }
    
    // Right border of title row
    borderedBuffer.write(borderWidth - 1, 1, '│');
    
    // Separator line
    borderedBuffer.write(0, 2, '├' + '─'.repeat(borderWidth - 2) + '┤');
    
    // Content area (with 3-line offset for the header)
    const contentOffset = 3;
    
    // Draw content with borders
    for (let y = 0; y < this.buffer.length; y++) {
      // Left border
      borderedBuffer.write(0, y + contentOffset, '│');
      
      // Calculate centering offset when border is wider than content
      const extraWidth = borderWidth - 4 - maxContentWidth; // -4 for the border and padding
      const centeringOffset = Math.floor(extraWidth / 2);
      
      // Content from original buffer (with padding plus centering)
      for (let x = 0; x < this.buffer[y].length; x++) {
        if (this.buffer[y][x]) {
          borderedBuffer.write(2 + centeringOffset + x, y + contentOffset, this.buffer[y][x], this.colors[y][x]);
        }
      }
      
      // Fill any remaining space with spaces
      for (let x = 0; x < borderWidth - 2; x++) {
        if (!borderedBuffer.buffer[y + contentOffset][x + 1]) {  // +1 to skip the left border
          borderedBuffer.write(x + 1, y + contentOffset, ' ');
        }
      }
      
      // Right border
      borderedBuffer.write(borderWidth - 1, y + contentOffset, '│');
    }
    
    // Bottom border
    borderedBuffer.write(0, this.buffer.length + contentOffset, '╰' + '─'.repeat(borderWidth - 2) + '╯');
    
    return borderedBuffer;
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
  const showBorder = options && options.border === true;
  const stackName = options && options.stackName;
  const skipOutput = options && options.skipOutput === true;
  const skipBorder = options && options.skipBorder === true;
  const buffer = options.buffer || (ciMode ? new AsciiBuffer() : null);
  
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
  
  // Process the buffer for output
  if (ciMode) {
    // Add border if option is enabled, we have a stack name, and we're not skipping borders
    let finalBuffer = buffer;
    if (showBorder && stackName && !skipBorder) {
      finalBuffer = buffer.addBorder(stackName);
    }
    
    // Output the buffer unless skipOutput is set
    if (!skipOutput) {
      process.stdout.write(finalBuffer.toString());
    }
    
    // Return the buffer for side-by-side rendering
    return finalBuffer;
  } else {
    // For now, border is only supported in CI mode
    if (!skipOutput) {
      process.stdout.write(clc.move.bottom);
      process.stdout.write(clc.move.lineBegin);
    }
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

/**
 * Combines multiple AsciiBuffer instances side-by-side
 * @param {Array<AsciiBuffer>} buffers - Array of AsciiBuffer instances to combine
 * @param {number} spacing - Number of spaces between buffers
 * @returns {AsciiBuffer} A new buffer containing all input buffers side-by-side
 */
function combineBuffersSideBySide(buffers, spacing = 4) {
  if (!buffers || !buffers.length) {
    return new AsciiBuffer();
  }
  
  if (buffers.length === 1) {
    return buffers[0];
  }

  // Find the maximum height across all buffers
  const maxHeight = Math.max(...buffers.map(buffer => buffer.buffer.length));
  
  // Create a new buffer for the combined output
  const combinedBuffer = new AsciiBuffer();
  
  // Get widths of each buffer
  const bufferWidths = buffers.map(buffer => {
    const lastRow = buffer.buffer.length - 1;
    if (lastRow < 0) return 0;
    return buffer.buffer[lastRow].length;
  });
  
  // Render each row
  for (let y = 0; y < maxHeight; y++) {
    let currentX = 0;
    
    // Process each buffer
    for (let bufferIndex = 0; bufferIndex < buffers.length; bufferIndex++) {
      const buffer = buffers[bufferIndex];
      
      // If this buffer has content for this row
      if (y < buffer.buffer.length) {
        const row = buffer.buffer[y];
        
        // Write each character in the row with its color
        for (let x = 0; x < row.length; x++) {
          combinedBuffer.write(currentX + x, y, row[x], buffer.colors[y] ? buffer.colors[y][x] : null);
        }
      }
      
      // Move to the position for the next buffer
      currentX += bufferWidths[bufferIndex] + (bufferIndex < buffers.length - 1 ? spacing : 0);
    }
  }
  
  return combinedBuffer;
}

/**
 * Adds an outer border with a title around a buffer
 * @param {AsciiBuffer} buffer - The buffer to add a border around
 * @param {string} title - The title to display in the border
 * @returns {AsciiBuffer} A new buffer with the border added
 */
function addOuterBorder(buffer, title) {
  // Find the actual max content width and height
  const maxWidth = buffer.maxX;
  const maxHeight = buffer.buffer.length;
  
  // Calculate border dimensions with padding
  const borderWidth = maxWidth + 4;
  const titleWidth = title.length + 4;
  const finalWidth = Math.max(borderWidth, titleWidth);
  
  // Create a new buffer with extra space for border
  const borderedBuffer = new AsciiBuffer();
  
  // Draw top border
  borderedBuffer.write(0, 0, '╭');
  for (let x = 1; x < finalWidth - 1; x++) {
    borderedBuffer.write(x, 0, '─');
  }
  borderedBuffer.write(finalWidth - 1, 0, '╮');
  
  // Draw title row
  borderedBuffer.write(0, 1, '│');
  borderedBuffer.write(finalWidth - 1, 1, '│');
  
  // Add title if provided - centered
  if (title) {
    const padding = Math.floor((finalWidth - 2 - title.length) / 2);
    
    // Add spaces before title
    for (let x = 0; x < padding; x++) {
      borderedBuffer.write(1 + x, 1, ' ');
    }
    
    // Add title text
    for (let x = 0; x < title.length; x++) {
      borderedBuffer.write(1 + padding + x, 1, title.charAt(x));
    }
    
    // Add spaces after title
    for (let x = 0; x < finalWidth - 2 - padding - title.length; x++) {
      borderedBuffer.write(1 + padding + title.length + x, 1, ' ');
    }
  } else {
    // No title, just spaces
    for (let x = 0; x < finalWidth - 2; x++) {
      borderedBuffer.write(1 + x, 1, ' ');
    }
  }
  
  // Draw separator line
  borderedBuffer.write(0, 2, '├');
  for (let x = 1; x < finalWidth - 1; x++) {
    borderedBuffer.write(x, 2, '─');
  }
  borderedBuffer.write(finalWidth - 1, 2, '┤');
  
  // Copy original content with padding
  const contentOffset = 3;
  for (let y = 0; y < maxHeight; y++) {
    // Draw left border
    borderedBuffer.write(0, y + contentOffset, '│');
    
    // Copy content from original buffer
    if (y < buffer.buffer.length) {
      for (let x = 0; x < buffer.buffer[y].length; x++) {
        if (buffer.buffer[y][x]) {
          borderedBuffer.write(
            2 + x, 
            y + contentOffset, 
            buffer.buffer[y][x],
            buffer.colors[y] ? buffer.colors[y][x] : null
          );
        }
      }
    }
    
    // Draw right border
    borderedBuffer.write(finalWidth - 1, y + contentOffset, '│');
  }
  
  // Draw bottom border
  borderedBuffer.write(0, maxHeight + contentOffset, '╰');
  for (let x = 1; x < finalWidth - 1; x++) {
    borderedBuffer.write(x, maxHeight + contentOffset, '─');
  }
  borderedBuffer.write(finalWidth - 1, maxHeight + contentOffset, '╯');
  
  return borderedBuffer;
}

module.exports = {
  render,
  combineBuffersSideBySide,
  AsciiBuffer,
  addOuterBorder
};
