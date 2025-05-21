const path = require('path');
const { spawnSync } = require('child_process');

// Test cases definition for parameterized testing
const testCases = [
  {
    name: 'simple template in normal mode',
    templateFile: 'simple-template.yaml',
    ciMode: false,
    contentChecks: ['Lambda', 'Role']
  },
  {
    name: 'simple template in CI mode',
    templateFile: 'simple-template.yaml',
    ciMode: true,
    contentChecks: ['LambdaE', 'role']
  },
  {
    name: 'complex template in normal mode',
    templateFile: 'complex-template.yaml',
    ciMode: false,
    contentChecks: ['ProcessingFunction', 'DataTable', 'ApiGateway', 'NotificationTopic', 'StorageBucket', 'EmailSubscription']
  },
  {
    name: 'complex template in CI mode',
    templateFile: 'complex-template.yaml',
    ciMode: true,
    contentChecks: ['ProcessingFunction', 'DataTable', 'ApiGateway', 'NotificationTopic', 'StorageBucket', 'EmailSubscription']
  },
  {
    name: 'simple template in CI mode with border',
    templateFile: 'simple-template.yaml',
    ciMode: true,
    border: true,
    contentChecks: ['Lambda', 'Role', '│', '╭', '╮', '╯', '╰', '├', '┤', 'Stack: CloudFormation Stack']
  }
];

// Helper function to run the CLI command
function runAsciiArt(templateFile, ciMode, border = false) {
  // Use the project's root directory
  const projectRoot = path.resolve(__dirname, '../../../');
  
  // Path to the test template
  const templatePath = path.resolve(projectRoot, `tests/resources/${templateFile}`);
  
  // Prepare command arguments
  const args = [
    path.join(projectRoot, 'index.js'),
    'ascii-art',
    '-t', templatePath
  ];
  
  // Add ci flag if needed
  if (ciMode) {
    args.push('--ci');
  }
  
  // Add border flag if needed
  if (border) {
    args.push('--border');
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

// Process the output to strip ANSI codes
function stripAnsiCodes(text) {
  return text.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
}

// For each test case, create a describe block
testCases.forEach(({ name, templateFile, ciMode, border = false, contentChecks }) => {
  describe(`ascii-art for ${name}`, () => {
    
    let result;
    let plainText;
    
    // Setup - run once for each describe block
    beforeAll(() => {
      result = runAsciiArt(templateFile, ciMode, border);
      plainText = stripAnsiCodes(result.stdout);
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
    
    // If in CI mode, verify no cursor control sequences
    if (ciMode) {
      test('should not contain cursor control sequences in CI mode', () => {
        expect(result.stdout).not.toMatch(/\u001b\[\d+[A-Z]/);
      });
    }
    
    // Test for expected content - one test per content check
    contentChecks.forEach((check) => {
      test(`should contain ${check}`, () => {
        expect(plainText).toContain(check);
      });
    });
    
    // Snapshot test
    test('should match snapshot', () => {
      // Clean output for snapshot
      const cleanOutput = plainText
        .replace(/modified="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z"/g, 'modified="[TIMESTAMP]"');
      
      // Add a line before and after for better readability
      const formattedOutput = `\n${cleanOutput}\n`;
      
      // Create a unique snapshot name based on the test case
      const snapshotName = `${ciMode ? 'CI' : 'normal'} mode - ${path.basename(templateFile)}`;
      
      expect(formattedOutput).toMatchSnapshot(snapshotName);
    });
  });
});