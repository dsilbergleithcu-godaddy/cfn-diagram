#!/bin/bash
# Test programmatic usage of the library

echo "Running programmatic usage example..."
node examples/programmatic-usage.js 

# Check if the drawio file was created
if [ -f /tmp/cfn-diagram-example.drawio ]; then
    echo -e "\nVerifying drawio file..."
    file_size=$(stat -f%z "/tmp/cfn-diagram-example.drawio")
    echo "File size: $file_size bytes"
    
    if [ "$file_size" -gt 500 ]; then
        echo "✅ Draw.io file generated successfully"
    else
        echo "❌ Draw.io file seems invalid (too small)"
        exit 1
    fi
else
    echo "❌ Draw.io file not found at /tmp/cfn-diagram-example.drawio"
    exit 1
fi

echo -e "\n✅ All tests passed!"