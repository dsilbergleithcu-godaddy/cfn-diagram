const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Test cases for Mermaid output format
const testCases = [
  {
    name: 'Simple template',
    templateFile: 'simple-template.yaml', 
    contentChecks: ['Lambda', 'Role'],
    outputFile: 'test-output-mermaid.md'
  },
  {
    name: 'Complex template',
    templateFile: 'complex-template.yaml',
    contentChecks: ['ProcessingFunction', 'DataTable', 'ApiGateway'],
    outputFile: 'test-output-mermaid-complex.md'
  }
];

// Helper function to run the CLI command
function runMermaidCommand(templateFile, outputFile) {
  // Use the project's root directory
  const projectRoot = path.resolve(__dirname, '../../../');
  
  // Path to the test template
  const templatePath = path.resolve(projectRoot, `tests/resources/${templateFile}`);
  
  // Prepare command arguments
  const args = [
    path.join(projectRoot, 'index.js'),
    'mermaid',
    '-t', templatePath
  ];
  
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

// For each test case, create a describe block
testCases.forEach(({ name, templateFile, contentChecks, outputFile }) => {
  describe(`Mermaid Output Format: ${name}`, () => {
    let result;
    let outputContent;
    
    // Setup - run once for each describe block
    beforeAll(() => {
      result = runMermaidCommand(templateFile, outputFile);
      
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
    
    // Test for valid mermaid syntax
    test('should have valid mermaid syntax', () => {
      expect(outputContent).toContain('```mermaid');
      expect(outputContent).toContain('flowchart TB');
      expect(outputContent).toContain('```');
    });
    
    // Test for expected content in mermaid output
    contentChecks.forEach((check) => {
      test(`should contain ${check}`, () => {
        expect(outputContent).toContain(check);
      });
    });
    
    // Snapshot test for Mermaid
    test('should match snapshot', () => {
      // Create a unique snapshot name based on the test case
      const snapshotName = `mermaid - ${path.basename(templateFile)}`;
      
      expect(outputContent).toMatchSnapshot(snapshotName);
    });
  });
});