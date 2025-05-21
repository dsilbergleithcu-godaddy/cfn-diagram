const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Test cases for Draw.io output format
const testCases = [
  {
    name: 'Simple template',
    templateFile: 'simple-template.yaml', 
    ciMode: true,
    outputFile: 'test-output-drawio.drawio'
  },
  {
    name: 'Complex template',
    templateFile: 'complex-template.yaml',
    ciMode: true,
    outputFile: 'test-output-drawio-complex.drawio'
  }
];

// Helper function to run the CLI command
function runDrawioCommand(templateFile, ciMode, outputFile) {
  // Use the project's root directory
  const projectRoot = path.resolve(__dirname, '../../../');
  
  // Path to the test template
  const templatePath = path.resolve(projectRoot, `tests/resources/${templateFile}`);
  
  // Prepare command arguments
  const args = [
    path.join(projectRoot, 'index.js'),
    'draw.io',
    '-t', templatePath
  ];
  
  // Add ci flag if needed
  if (ciMode) {
    args.push('--ci-mode');
  }
  
  // Add output file - need to specify a full path, not just filename
  const outputPath = path.join(projectRoot, 'tests', 'output', outputFile);
  args.push('-o', outputPath);
  
  // Make sure the directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Run the CLI command
  return spawnSync('node', args, {
    encoding: 'utf-8',
    stdio: 'pipe',
    cwd: projectRoot,
    env: { 
      ...process.env,
      FORCE_COLOR: '0',  // Disable colors in the output for consistent snapshots
      NODE_ENV: 'test'   // Mark as test environment
    }
  });
}

// Clean output for snapshots
function cleanOutput(content) {
  if (!content) return '';
  
  // Draw.io specific cleaning
  return content
    .replace(/modified="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z"/g, 'modified="[TIMESTAMP]"')
    .replace(/date="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z"/g, 'date="[TIMESTAMP]"')
    .replace(/agent="[^"]*"/g, 'agent="[AGENT]"')
    .replace(/host="[^"]*"/g, 'host="[HOST]"')
    .replace(/version="[^"]*"/g, 'version="[VERSION]"')
    .replace(/etag="[^"]*"/g, 'etag="[ETAG]"');
}

// For each test case, create a describe block
testCases.forEach(({ name, templateFile, ciMode, outputFile }) => {
  describe(`Draw.io Output Format: ${name}`, () => {
    let result;
    let outputContent;
    
    // Setup - run once for each describe block
    beforeAll(() => {
      result = runDrawioCommand(templateFile, ciMode, outputFile);
      
      try {
        const projectRoot = path.resolve(__dirname, '../../../');
        const outputPath = path.join(projectRoot, 'tests', 'output', outputFile);
        
        if (fs.existsSync(outputPath)) {
          outputContent = fs.readFileSync(outputPath, 'utf-8');
        } else {
          outputContent = `Error: Output file not found: ${outputPath}`;
        }
      } catch (error) {
        outputContent = `Error reading output file: ${error.message}`;
      }
    });
    
    // Cleanup after tests
    afterAll(() => {
      try {
        const projectRoot = path.resolve(__dirname, '../../../');
        const outputPath = path.join(projectRoot, 'tests', 'output', outputFile);
        
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (error) {
        console.error(`Error cleaning up file ${outputFile}:`, error.message);
      }
    });
    
    // Test successful execution
    test('should complete successfully', () => {
      expect(result.status).toBe(0);
    });
    
    // Test for no errors in stderr
    test('should have no errors', () => {
      const cleanStdErr = result.stderr
        .replace(/\(node:\d+\) \[DEP\d+\].*\n?/g, '')
        .replace(/\(Use `node --trace-deprecation.*\n?/g, '')
        .trim();
      expect(cleanStdErr).toBe('');
    });
    
    // Test for file creation
    test('should create output file', () => {
      expect(outputContent).not.toContain('Error:');
    });
    
    // Test for mxfile structure
    test('should have valid mxfile structure', () => {
      expect(outputContent).toContain('<mxfile');
      expect(outputContent).toContain('<diagram');
      expect(outputContent).toContain('<mxGraphModel');
    });
    
    // Snapshot test for Draw.io XML
    test('should match snapshot', () => {
      const cleaned = cleanOutput(outputContent);
      
      // Create a unique snapshot name based on the test case
      const snapshotName = `drawio - ${path.basename(templateFile)}`;
      
      expect(cleaned).toMatchSnapshot(snapshotName);
    });
  });
});