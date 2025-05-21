# maxGraph Upgrade Plan

## Background

The current implementation of cfn-diagram uses mxgraph for diagram generation. However, mxgraph:
1. Has known XSS vulnerabilities
2. Is no longer maintained (archived repository)
3. Is not recommended for new projects

maxGraph is a modern TypeScript successor to mxgraph, designed as a drop-in replacement with improved security and maintenance.

## Scope of Impact

The ASCII art feature in cfn-diagram depends on mxgraph through the following path:
- ASCII art command → MxGenerator → mxgraph library
- MxGenerator generates XML → mxgraph-to-asciiart parses that XML

## Migration Tasks

### Investigation (Completed)
- [x] Check if ASCII art features depend on mxgraph library
- [x] Examine mxgraph-to-asciiart.js to understand dependencies
- [x] Review tests in the ASCII art modules
- [x] Research alternative diagram generation libraries for CloudFormation
- [x] Investigate maxGraph as a direct replacement for mxgraph
- [x] Assess scope of changes needed to replace mxgraph with maxGraph

### Preparation
- [ ] Add snapshot tests for all output formats (ASCII, HTML, draw.io, Mermaid)
  - Create parameterized tests for simple and complex templates
  - Capture current output as snapshots before library migration
  - These will serve as a reference to verify output consistency after migration

### Implementation
- [ ] Update package.json to replace mxgraph with @maxgraph/core
- [ ] Modify MxGenerator.js to use maxGraph instead of mxgraph
  - Remove mx prefix from class and method names
  - Update initialization pattern
  - Replace utility methods with appropriate namespaces
  - Update model access methods (getModel → getDataModel)
- [ ] Ensure XML export format from maxGraph is compatible with existing mxgraph-to-asciiart.js
  - Verify XML structure compatibility
  - Test with sample CloudFormation templates

### Testing
- [ ] Update tests to work with maxGraph
- [ ] Verify output matches expected format across all diagram types
- [ ] Compare outputs against pre-migration snapshots
- [ ] Run full test suite to ensure no regressions

### Documentation
- [ ] Document the migration in README or CHANGELOG
- [ ] Update any API references if needed

## Notes on maxGraph

- maxGraph is the successor to mxgraph, written in TypeScript
- It has XML export/import capabilities compatible with mxgraph
- API differences exist but concepts are similar
- Installation: `npm install @maxgraph/core`
- Currently under active development but stable enough for our use case
- Provides better security than the deprecated mxgraph library

## References

- maxGraph repository: https://github.com/maxGraph/maxGraph
- maxGraph documentation: https://maxgraph.github.io/maxGraph
- Migration guide: https://github.com/maxGraph/maxGraph/blob/main/packages/website/docs/usage/migrate-from-mxgraph.md