const { AsciiBuffer, combineBuffersSideBySide } = require('../../../commands/asciiart/mxgraph-to-asciiart');

describe('AsciiBuffer combination', () => {
  test('should handle empty buffers array', () => {
    const result = combineBuffersSideBySide([]);
    expect(result).toBeInstanceOf(AsciiBuffer);
    expect(result.buffer).toEqual([]);
  });
  
  test('should return single buffer unchanged', () => {
    const buffer = new AsciiBuffer();
    buffer.write(0, 0, 'A');
    buffer.write(1, 0, 'B');
    buffer.write(0, 1, 'C');
    buffer.write(1, 1, 'D');
    
    const result = combineBuffersSideBySide([buffer]);
    expect(result).toBe(buffer);  // Should be the same instance
  });
  
  test('should combine two buffers side-by-side with default spacing', () => {
    const buffer1 = new AsciiBuffer();
    buffer1.write(0, 0, 'A');
    buffer1.write(1, 0, 'B');
    buffer1.write(0, 1, 'C');
    buffer1.write(1, 1, 'D');
    
    const buffer2 = new AsciiBuffer();
    buffer2.write(0, 0, '1');
    buffer2.write(1, 0, '2');
    buffer2.write(0, 1, '3');
    buffer2.write(1, 1, '4');
    
    const result = combineBuffersSideBySide([buffer1, buffer2]);
    
    // Check dimensions
    expect(result.buffer.length).toBe(2); // 2 rows
    
    // Check content (with default spacing of 4)
    expect(result.buffer[0][0]).toBe('A');
    expect(result.buffer[0][1]).toBe('B');
    expect(result.buffer[0][6]).toBe('1'); // After 4 spaces
    expect(result.buffer[0][7]).toBe('2');
    
    expect(result.buffer[1][0]).toBe('C');
    expect(result.buffer[1][1]).toBe('D');
    expect(result.buffer[1][6]).toBe('3');
    expect(result.buffer[1][7]).toBe('4');
  });
  
  test('should combine two buffers with custom spacing', () => {
    const buffer1 = new AsciiBuffer();
    buffer1.write(0, 0, 'A');
    buffer1.write(1, 0, 'B');
    
    const buffer2 = new AsciiBuffer();
    buffer2.write(0, 0, '1');
    buffer2.write(1, 0, '2');
    
    // Use spacing of 2
    const result = combineBuffersSideBySide([buffer1, buffer2], 2);
    
    // Check content with spacing of 2
    expect(result.buffer[0][0]).toBe('A');
    expect(result.buffer[0][1]).toBe('B');
    expect(result.buffer[0][4]).toBe('1'); // After 2 spaces
    expect(result.buffer[0][5]).toBe('2');
  });
  
  test('should handle buffers of different heights', () => {
    const buffer1 = new AsciiBuffer();
    buffer1.write(0, 0, 'A');
    buffer1.write(0, 1, 'B');
    buffer1.write(0, 2, 'C'); // Taller buffer
    
    const buffer2 = new AsciiBuffer();
    buffer2.write(0, 0, '1');
    buffer2.write(0, 1, '2');
    
    const result = combineBuffersSideBySide([buffer1, buffer2]);
    
    // Should have 3 rows (height of tallest buffer)
    expect(result.buffer.length).toBe(3);
    
    // Check content
    expect(result.buffer[0][0]).toBe('A');
    expect(result.buffer[1][0]).toBe('B');
    expect(result.buffer[2][0]).toBe('C');
    expect(result.buffer[0][5]).toBe('1');
    expect(result.buffer[1][5]).toBe('2');
    // Third row of second buffer should not have content
  });
  
  test('should handle multiple buffers', () => {
    const buffer1 = new AsciiBuffer();
    buffer1.write(0, 0, 'A');
    
    const buffer2 = new AsciiBuffer();
    buffer2.write(0, 0, 'B');
    
    const buffer3 = new AsciiBuffer();
    buffer3.write(0, 0, 'C');
    
    const result = combineBuffersSideBySide([buffer1, buffer2, buffer3], 1);
    
    // Should have content from all three buffers
    expect(result.buffer[0][0]).toBe('A');
    expect(result.buffer[0][2]).toBe('B');
    expect(result.buffer[0][4]).toBe('C');
  });
  
  test('should preserve colors when combining buffers', () => {
    const colorFunc = () => {}; // Mock color function
    
    const buffer1 = new AsciiBuffer();
    buffer1.write(0, 0, 'A', colorFunc);
    
    const buffer2 = new AsciiBuffer();
    buffer2.write(0, 0, 'B');
    
    const result = combineBuffersSideBySide([buffer1, buffer2]);
    
    // Check if color information is preserved
    expect(result.colors[0][0]).toBe(colorFunc);
    expect(result.colors[0][5]).toBe(null);
  });
});