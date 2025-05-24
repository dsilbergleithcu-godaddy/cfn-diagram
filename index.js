#!/usr/bin/env node
const program = require("commander");
const mxGenerator = require("./graph/MxGenerator");
const templateParser = require("./shared/templateParser");
const mxGraphToAsciiArt = require("./commands/asciiart/mxgraph-to-asciiart");
const filterConfig = require("./resources/FilterConfig");
const packag = require("./package.json");

// Load all command modules
require("./commands/draw.io");
require("./commands/html");
require("./commands/asciiart");
require("./commands/browse");
require("./commands/mermaid");

// Set up CLI version
program.version(packag.version, "-v, --vers", "output the current version");

// When run directly as a script, parse command line arguments
if (require.main === module) {
  program.parse(process.argv);
}

// Module exports for programmatic usage
module.exports = {
  // Core functionality
  renderTemplate: async (templatePath, options = {}) => {
    const cmd = {
      templateFile: templatePath,
      cdkOutput: options.cdkOutput || 'cdk.out',
      skipSynth: options.skipSynth !== undefined ? options.skipSynth : true,
      stacks: options.stacks || null
    };
    const template = templateParser.get(cmd).template;
    
    // Set up filterConfig
    if (!template.Resources) {
      throw new Error("Can't find resources in " + templatePath);
    }
    
    // Initialize filter config with all resources
    const resourceNames = Object.keys(template.Resources);
    const resourceTypes = resourceNames.map(name => template.Resources[name].Type);
    
    filterConfig.resourceNamesToInclude = resourceNames;
    filterConfig.resourceTypesToInclude = resourceTypes;
    filterConfig.edgeMode = "On";
    
    return await mxGenerator.renderTemplate(template);
  },
  
  // Main renderers
  renderers: {
    asciiArt: {
      render: async (templatePath, options = {}) => {
        const cmd = {
          templateFile: templatePath,
          cdkOutput: options.cdkOutput || 'cdk.out',
          skipSynth: options.skipSynth !== undefined ? options.skipSynth : true,
          stacks: options.stacks || null,
          ci: options.ci !== undefined ? options.ci : true,
          border: options.border !== undefined ? options.border : false,
          title: options.title,
          sideBySide: options.sideBySide !== undefined ? options.sideBySide : false,
          spacing: options.spacing !== undefined ? options.spacing : 2
        };
        
        // Handle single template or side-by-side rendering
        let templateFiles = [templatePath];
        if (cmd.sideBySide && templatePath.includes(',')) {
          templateFiles = templatePath.split(',').map(file => file.trim());
        }
        
        if (templateFiles.length === 1 && !cmd.sideBySide) {
          // Original single template behavior
          const template = templateParser.get(cmd).template;
          if (!template.Resources) {
            throw new Error("Can't find resources in " + templatePath);
          }
          
          // Initialize filter config with all resources
          const resourceNames = Object.keys(template.Resources);
          const resourceTypes = resourceNames.map(name => template.Resources[name].Type);
          
          filterConfig.resourceNamesToInclude = resourceNames;
          filterConfig.resourceTypesToInclude = resourceTypes;
          filterConfig.edgeMode = "On";
          
          mxGenerator.reset();
          const xml = await mxGenerator.renderTemplate(template);
          const stackName = templateParser.getStackName(template);
          
          if (options.returnBuffer) {
            // Return the ascii buffer without printing
            const buffer = new mxGraphToAsciiArt.AsciiBuffer();
            mxGraphToAsciiArt.render(xml, { 
              ci: true,
              border: cmd.border,
              stackName: stackName,
              buffer: buffer,
              skipOutput: true
            });
            return buffer.toString();
          } else {
            // Print to console and return the XML
            mxGraphToAsciiArt.render(xml, { 
              ci: cmd.ci,
              border: cmd.border,
              stackName: stackName
            });
            return xml;
          }
        } else {
          // Handle multiple templates for side-by-side rendering
          const diagrams = [];
          
          for (const templateFile of templateFiles) {
            try {
              const templateForFile = templateParser.get({ ...cmd, templateFile }).template;
              
              if (!templateForFile.Resources) {
                console.log("Can't find resources in " + templateFile + ", skipping.");
                continue;
              }
              
              // Set up filter config for this template
              const resourceNames = Object.keys(templateForFile.Resources);
              const resourceTypes = resourceNames.map(name => templateForFile.Resources[name].Type);
              
              filterConfig.resourceNamesToInclude = resourceNames;
              filterConfig.resourceTypesToInclude = resourceTypes;
              filterConfig.edgeMode = "On";
              
              mxGenerator.reset();
              const xml = await mxGenerator.renderTemplate(templateForFile);
              const stackName = templateParser.getStackName(templateForFile);
              
              // Create a buffer for this diagram
              let buffer = new mxGraphToAsciiArt.AsciiBuffer();
              buffer = mxGraphToAsciiArt.render(xml, {
                ci: true,
                border: false, // Skip individual borders for side-by-side
                stackName: stackName,
                buffer: buffer,
                skipOutput: true
              });
              
              diagrams.push({
                buffer: buffer,
                stackName: stackName
              });
            } catch (err) {
              console.log(`Error processing ${templateFile}: ${err.message}`);
            }
          }
          
          if (diagrams.length === 0) {
            throw new Error("No valid templates were found.");
          }
          
          let combinedBuffer;
          
          if (cmd.border) {
            // Create individually bordered buffers following CLI logic
            const borderedBuffers = [];
            
            for (let i = 0; i < diagrams.length; i++) {
              const buffer = diagrams[i].buffer;
              const stackName = diagrams[i].stackName;
              
              // Get maximum content width
              let contentWidth = 0;
              for (let y = 0; y < buffer.buffer.length; y++) {
                for (let x = buffer.buffer[y].length - 1; x >= 0; x--) {
                  if (buffer.buffer[y][x] && buffer.buffer[y][x] !== ' ') {
                    contentWidth = Math.max(contentWidth, x + 1);
                    break;
                  }
                }
              }
              
              // Create bordered buffer (replicating CLI logic)
              const borderedBuffer = new mxGraphToAsciiArt.AsciiBuffer();
              const title = stackName ? "Stack: " + stackName : "";
              const titleWidth = title.length + 4;
              const borderWidth = Math.max(contentWidth + 4, titleWidth);
              
              // Draw top border
              borderedBuffer.write(0, 0, '╭');
              for (let x = 1; x < borderWidth - 1; x++) {
                borderedBuffer.write(x, 0, '─');
              }
              borderedBuffer.write(borderWidth - 1, 0, '╮');
              
              // Draw title row
              borderedBuffer.write(0, 1, '│');
              borderedBuffer.write(borderWidth - 1, 1, '│');
              
              if (stackName) {
                const padding = Math.floor((borderWidth - 2 - title.length) / 2);
                for (let x = 0; x < padding; x++) {
                  borderedBuffer.write(1 + x, 1, ' ');
                }
                for (let x = 0; x < title.length; x++) {
                  borderedBuffer.write(1 + padding + x, 1, title.charAt(x));
                }
                for (let x = 0; x < borderWidth - 2 - padding - title.length; x++) {
                  borderedBuffer.write(1 + padding + title.length + x, 1, ' ');
                }
              } else {
                for (let x = 1; x < borderWidth - 1; x++) {
                  borderedBuffer.write(x, 1, ' ');
                }
              }
              
              // Draw separator row
              borderedBuffer.write(0, 2, '├');
              for (let x = 1; x < borderWidth - 1; x++) {
                borderedBuffer.write(x, 2, '─');
              }
              borderedBuffer.write(borderWidth - 1, 2, '┤');
              
              // Copy content with offset
              const contentOffset = 3;
              for (let y = 0; y < buffer.buffer.length; y++) {
                borderedBuffer.write(0, y + contentOffset, '│');
                borderedBuffer.write(borderWidth - 1, y + contentOffset, '│');
                for (let x = 0; x < buffer.buffer[y].length && x < borderWidth - 4; x++) {
                  if (buffer.buffer[y][x]) {
                    borderedBuffer.write(x + 2, y + contentOffset, buffer.buffer[y][x]);
                  }
                }
              }
              
              // Draw bottom border
              const bottomY = Math.max(buffer.buffer.length + contentOffset, contentOffset + 1);
              borderedBuffer.write(0, bottomY, '╰');
              for (let x = 1; x < borderWidth - 1; x++) {
                borderedBuffer.write(x, bottomY, '─');
              }
              borderedBuffer.write(borderWidth - 1, bottomY, '╯');
              
              borderedBuffers.push(borderedBuffer);
            }
            
            combinedBuffer = mxGraphToAsciiArt.combineBuffersSideBySide(borderedBuffers, cmd.spacing);
          } else {
            // Non-border mode, just combine raw buffers
            const buffers = diagrams.map(d => d.buffer);
            combinedBuffer = mxGraphToAsciiArt.combineBuffersSideBySide(buffers, cmd.spacing);
          }
          
          // Add outer border with custom title if specified
          if (cmd.title) {
            combinedBuffer = mxGraphToAsciiArt.addOuterBorder(combinedBuffer, cmd.title);
          }
          
          if (options.returnBuffer) {
            return combinedBuffer.toString();
          } else {
            process.stdout.write(combinedBuffer.toString());
            return "Side-by-side rendering completed";
          }
        }
      }
    },
    
    // Other renderers can be added here
    drawio: {
      render: async (templatePath, outputFile = 'template.drawio', options = {}) => {
        const cmd = {
          templateFile: templatePath,
          outputFile: outputFile,
          cdkOutput: options.cdkOutput || 'cdk.out',
          skipSynth: options.skipSynth !== undefined ? options.skipSynth : true,
          stacks: options.stacks || null,
          ciMode: options.ciMode !== undefined ? options.ciMode : true,
          excludeTypes: options.excludeTypes || []
        };
        
        // Initialize filter config
        const template = templateParser.get(cmd).template;
        if (!template.Resources) {
          throw new Error("Can't find resources in " + templatePath);
        }
        
        // Initialize filter config with all resources
        const resourceNames = Object.keys(template.Resources);
        const resourceTypes = resourceNames.map(name => template.Resources[name].Type);
        
        filterConfig.resourceNamesToInclude = resourceNames;
        filterConfig.resourceTypesToInclude = resourceTypes;
        filterConfig.edgeMode = "On";
        
        // Apply exclusions if specified
        if (cmd.excludeTypes && cmd.excludeTypes.length > 0) {
          filterConfig.resourceTypesToInclude = filterConfig.resourceTypesToInclude.filter(
            type => !cmd.excludeTypes.includes(type)
          );
        }
        
        // Generate the XML
        mxGenerator.reset();
        const xml = await mxGenerator.renderTemplate(template);
        
        // Save to file
        const fs = require('fs');
        fs.writeFileSync(outputFile, xml);
        
        return outputFile;
      }
    },
    
    html: {
      render: (templatePath, options = {}) => {
        // Import the required module
        const html = require("./commands/html");
        // Implementation would go here
        throw new Error("Programmatic HTML rendering not yet implemented");
      }
    },
    
    mermaid: {
      render: (templatePath, options = {}) => {
        // Import the required module
        const mermaid = require("./commands/mermaid");
        // Implementation would go here
        throw new Error("Programmatic mermaid rendering not yet implemented");
      }
    }
  },
  
  // Utility exports
  utils: {
    templateParser,
    mxGenerator
  }
};
