const path = require('path');
const { spawnSync } = require('child_process');

describe('ASCII Art Side-by-Side Rendering', () => {
  const projectRoot = path.resolve(__dirname, '../../../');
  
  // Helper function to strip ANSI codes
  function stripAnsiCodes(text) {
    return text.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
  }

  // Helper function to run the CLI command with side-by-side rendering
  function runSideBySide(templateFiles, options = {}) {
    // Prepare template paths
    const templatePaths = templateFiles.map(file => 
      path.resolve(projectRoot, `tests/resources/${file}`)
    ).join(',');
    
    // Build arguments
    const args = [
      path.join(projectRoot, 'index.js'),
      'ascii-art',
      '-t', templatePaths,
      '--side-by-side',
      '--ci'  // CI mode is required for side-by-side
    ];
    
    // Add border if specified
    if (options.border) {
      args.push('--border');
    }
    
    // Add custom spacing if specified
    if (options.spacing !== undefined) {
      args.push('--spacing', options.spacing.toString());
    }
    
    // Add custom title if specified
    if (options.title) {
      args.push('--title', options.title);
    }
    
    // Run the command
    return spawnSync('node', args, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: projectRoot,
      env: { 
        ...process.env,
        FORCE_COLOR: '0',  // Disable colors for consistent snapshots
        NODE_ENV: 'test'   // Mark as test environment
      }
    });
  }
  
  test('should render two templates side-by-side', () => {
    const result = runSideBySide(['simple-template.yaml', 'complex-template.yaml']);
    
    // Check successful execution
    expect(result.status).toBe(0);
    
    // Get plain text output
    const plainText = stripAnsiCodes(result.stdout);
    
    // Check for content from both templates
    expect(plainText).toContain('LambdaExecutionRole');  // From simple template
    expect(plainText).toContain('ProcessingFunction');   // From complex template
    
    // Create a snapshot
    const cleanOutput = plainText
      .replace(/modified="\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}Z"/g, 'modified="[TIMESTAMP]"');
    
    // Ensure consistent snapshot format with a leading newline
    const formattedOutput = `\n${cleanOutput}`;
    
    expect(formattedOutput).toMatchSnapshot('Two templates side-by-side');
  });
  
  test('should render side-by-side with borders', () => {
    const result = runSideBySide(
      ['simple-template.yaml', 'complex-template.yaml'], 
      { border: true }
    );
    
    // Check successful execution
    expect(result.status).toBe(0);
    
    // Get plain text output
    const plainText = stripAnsiCodes(result.stdout);
    
    // Check for borders and resource names from both templates
    expect(plainText).toContain('MyLambdaFunction');  // From simple template
    expect(plainText).toContain('ProcessingFunction');  // From complex template
    // Check for border characters
    expect(plainText).toContain('╭');
    expect(plainText).toContain('╮');
    expect(plainText).toContain('╯');
    expect(plainText).toContain('╰');
    
    // Create a snapshot
    const cleanOutput = plainText
      .replace(/modified="\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}Z"/g, 'modified="[TIMESTAMP]"');
    
    // Ensure consistent snapshot format with a leading newline
    const formattedOutput = `\n${cleanOutput}`;
    
    expect(formattedOutput).toMatchSnapshot('Two templates side-by-side with borders');
  });
  
  test('should respect custom spacing between diagrams', () => {
    // Run with minimal spacing
    const resultMinSpacing = runSideBySide(
      ['simple-template.yaml', 'complex-template.yaml'],
      { spacing: 2 }
    );
    
    // Run with larger spacing
    const resultLargeSpacing = runSideBySide(
      ['simple-template.yaml', 'complex-template.yaml'],
      { spacing: 10 }
    );
    
    // Both should execute successfully
    expect(resultMinSpacing.status).toBe(0);
    expect(resultLargeSpacing.status).toBe(0);
    
    // Get plain text outputs
    const plainTextMin = stripAnsiCodes(resultMinSpacing.stdout);
    const plainTextLarge = stripAnsiCodes(resultLargeSpacing.stdout);
    
    // Create snapshots with consistent formatting (leading newline)
    const formattedMinOutput = `\n${plainTextMin}`;
    const formattedLargeOutput = `\n${plainTextLarge}`;
    
    expect(formattedMinOutput).toMatchSnapshot('Side-by-side with minimal spacing (2)');
    expect(formattedLargeOutput).toMatchSnapshot('Side-by-side with large spacing (10)');
  });
  
  test('should handle templates with very different sizes', () => {
    const result = runSideBySide([
      'simple-template.yaml',
      'very-long-stack-name-template-that-will-overflow-border.yaml'
    ], { border: true });
    
    // Check successful execution
    expect(result.status).toBe(0);
    
    // Get plain text output
    const plainText = stripAnsiCodes(result.stdout);
    
    // Check for content from both templates
    expect(plainText).toContain('LambdaExecutionRole');  // From first template
    expect(plainText).toContain('LambdaRole');  // From second template
    
    // Create a snapshot
    // Ensure consistent snapshot format with a leading newline
    const formattedOutput = `\n${plainText}`;
    
    expect(formattedOutput).toMatchSnapshot('Templates with different sizes');
  });
  
  test('should render side-by-side with custom outer title', () => {
    const customTitle = "CloudFormation Stack Comparison";
    const result = runSideBySide(
      ['simple-template.yaml', 'complex-template.yaml'], 
      { border: true, title: customTitle }
    );
    
    // Check successful execution
    expect(result.status).toBe(0);
    
    // Get plain text output
    const plainText = stripAnsiCodes(result.stdout);
    
    // Check for custom title and stack names
    expect(plainText).toContain(customTitle);
    expect(plainText).toContain('Stack: simple-template');
    expect(plainText).toContain('Stack: complex-template');
    
    // Check for nested border characters
    expect(plainText).toContain('╭');
    expect(plainText).toContain('╮');
    expect(plainText).toContain('╯');
    expect(plainText).toContain('╰');
    
    // Create a snapshot
    // Ensure consistent snapshot format with a leading newline
    const formattedOutput = `\n${plainText}`;
    
    expect(formattedOutput).toMatchSnapshot('Two templates side-by-side with custom title');
  });
  
  test('should render side-by-side with custom title without individual borders', () => {
    const customTitle = "Unbounded Stack Comparison";
    const result = runSideBySide(
      ['simple-template.yaml', 'complex-template.yaml'], 
      { title: customTitle }
    );
    
    // Check successful execution
    expect(result.status).toBe(0);
    
    // Get plain text output
    const plainText = stripAnsiCodes(result.stdout);
    
    // Check for custom title
    expect(plainText).toContain(customTitle);
    
    // Check for border characters
    expect(plainText).toContain('╭');
    expect(plainText).toContain('╮');
    expect(plainText).toContain('╯');
    expect(plainText).toContain('╰');
    
    // Create a snapshot
    const formattedOutput = `\n${plainText}`;
    
    expect(formattedOutput).toMatchSnapshot('Two templates with only outer border and custom title');
  });
  
  test('should render side-by-side with reversed template order (large stack first)', () => {
    const customTitle = "Reversed Order Comparison";
    const result = runSideBySide(
      ['complex-template.yaml', 'simple-template.yaml'], 
      { border: true, title: customTitle }
    );
    
    // Check successful execution
    expect(result.status).toBe(0);
    
    // Get plain text output
    const plainText = stripAnsiCodes(result.stdout);
    
    // Check for custom title and stack names in the correct order
    expect(plainText).toContain(customTitle);
    expect(plainText).toContain('Stack: complex-template');
    expect(plainText).toContain('Stack: simple-template');
    
    // Check for border characters
    expect(plainText).toContain('╭');
    expect(plainText).toContain('╮');
    expect(plainText).toContain('╯');
    expect(plainText).toContain('╰');
    
    // Create a snapshot
    const formattedOutput = `\n${plainText}`;
    
    expect(formattedOutput).toMatchSnapshot('Large stack first, small stack second with custom title');
  });
  
  test('should render side-by-side with very different sizes in reversed order', () => {
    const customTitle = "Extreme Size Difference (Reversed)";
    const result = runSideBySide(
      ['very-long-stack-name-template-that-will-overflow-border.yaml', 'simple-template.yaml'],
      { border: true, title: customTitle }
    );
    
    // Check successful execution
    expect(result.status).toBe(0);
    
    // Get plain text output
    const plainText = stripAnsiCodes(result.stdout);
    
    // Check for custom title and content from both templates
    expect(plainText).toContain(customTitle);
    expect(plainText).toContain('LambdaRole');  // From first template
    expect(plainText).toContain('LambdaExecutionRole');  // From second template
    
    // Create a snapshot
    const formattedOutput = `\n${plainText}`;
    
    expect(formattedOutput).toMatchSnapshot('Templates with different sizes in reversed order');
  });
});