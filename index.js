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
          border: options.border !== undefined ? options.border : false
        };
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
