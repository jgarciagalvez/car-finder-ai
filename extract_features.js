const fs = require('fs');
const csv = require('csv-parser');

// Read the CSV file and extract unique features
const features = new Set();
const existingFeatures = new Set();

// First, read the existing dictionary to know what's already there
const featureDict = JSON.parse(fs.readFileSync('packages/ai/src/dictionaries/feature-dictionary.json', 'utf8'));
Object.keys(featureDict.features).forEach(feature => existingFeatures.add(feature));

console.log('Existing features count:', existingFeatures.size);

// Read CSV and extract features
fs.createReadStream('data/extract-20251013_114541.csv')
  .pipe(csv())
  .on('data', (row) => {
    if (row.sourceEquipment && row.sourceEquipment !== '{}') {
      try {
        const equipment = JSON.parse(row.sourceEquipment);
        
        // Extract all feature names from all categories
        Object.values(equipment).forEach(category => {
          if (Array.isArray(category)) {
            category.forEach(feature => {
              if (feature && feature.trim()) {
                features.add(feature.trim());
              }
            });
          }
        });
      } catch (e) {
        // Skip invalid JSON
      }
    }
  })
  .on('end', () => {
    console.log('Total unique features found:', features.size);
    
    // Find features not in existing dictionary
    const newFeatures = [];
    features.forEach(feature => {
      if (!existingFeatures.has(feature)) {
        newFeatures.push(feature);
      }
    });
    
    console.log('New features to add:', newFeatures.length);
    console.log('New features:', newFeatures.sort());
    
    // Add new features to dictionary
    newFeatures.forEach(feature => {
      featureDict.features[feature] = "";
    });
    
    // Write updated dictionary
    fs.writeFileSync('packages/ai/src/dictionaries/feature-dictionary.json', JSON.stringify(featureDict, null, 2));
    console.log('Updated feature dictionary saved');
  });

