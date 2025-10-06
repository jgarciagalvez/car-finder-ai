/**
 * Real-world integration test for ScraperService and ParserService
 * This test scrapes actual Otomoto pages to validate functionality
 */

import { ScraperService } from '../services/ScraperService';
import { ParserService } from '../services/ParserService';

async function testRealWorldScraping() {
  console.log('🚗 Starting Real-World Scraping Test...\n');

  const scraper = new ScraperService({
    delayRange: { min: 2000, max: 4000 }, // Be respectful with delays
    timeout: 30000,
    maxRetries: 3,
    stealthMode: true
  });

  const parser = new ParserService('../../parser-schema.json');

  try {
    // Initialize scraper
    console.log('📡 Initializing scraper...');
    await scraper.initialize();
    console.log('✅ Scraper initialized successfully\n');

    // Test 1: Scrape search results page
    const searchUrl = 'https://www.otomoto.pl/osobowe/renault/trafic/wroclaw?search%5Bdist%5D=300&search%5Bfilter_float_engine_capacity%3Ato%5D=2500&search%5Bfilter_float_year%3Ato%5D=2012&search%5Blat%5D=51.10195&search%5Blon%5D=17.03667&search%5Border%5D=created_at_first%3Adesc';
    
    console.log('🔍 Scraping search results page...');
    console.log(`URL: ${searchUrl}\n`);
    
    const searchResult = await scraper.scrapeUrl(searchUrl);
    console.log(`✅ Search page scraped successfully!`);
    console.log(`📊 Status: ${searchResult.statusCode}`);
    console.log(`⏱️  Time: ${searchResult.scrapingTime}ms`);
    console.log(`📄 HTML Length: ${searchResult.html.length} characters\n`);

    // Test 2: Parse search results
    console.log('🔧 Parsing search results...');
    const searchParsed = parser.parseHtml(searchResult.html, 'otomoto');
    
    console.log(`✅ Search results parsed successfully!`);
    console.log(`📋 Page Type: ${searchParsed.pageType}`);
    console.log(`🚙 Vehicles Found: ${Array.isArray(searchParsed.data) ? searchParsed.data.length : 0}\n`);

    if (Array.isArray(searchParsed.data) && searchParsed.data.length > 0) {
      const firstVehicle = searchParsed.data[0];
      console.log('🎯 First Vehicle Details:');
      console.log(`   ID: ${firstVehicle.sourceId}`);
      console.log(`   Title: ${firstVehicle.sourceTitle}`);
      console.log(`   URL: ${firstVehicle.sourceUrl}`);
      console.log(`   Created: ${firstVehicle.sourceCreatedAt}\n`);

      // Test 3: Scrape first vehicle's detail page
      // Handle both relative and absolute URLs
      const detailUrl = firstVehicle.sourceUrl.startsWith('http') 
        ? firstVehicle.sourceUrl 
        : `https://www.otomoto.pl${firstVehicle.sourceUrl}`;
      console.log('🔍 Scraping vehicle detail page...');
      console.log(`URL: ${detailUrl}\n`);

      const detailResult = await scraper.scrapeUrl(detailUrl);
      console.log(`✅ Detail page scraped successfully!`);
      console.log(`📊 Status: ${detailResult.statusCode}`);
      console.log(`⏱️  Time: ${detailResult.scrapingTime}ms`);
      console.log(`📄 HTML Length: ${detailResult.html.length} characters\n`);

      // Test 4: Parse vehicle details
      console.log('🔧 Parsing vehicle details...');
      const detailParsed = parser.parseHtml(detailResult.html, 'otomoto');
      
      console.log(`✅ Vehicle details parsed successfully!`);
      console.log(`📋 Page Type: ${detailParsed.pageType}\n`);

      if (!Array.isArray(detailParsed.data)) {
        const vehicle = detailParsed.data;
        console.log('🚗 Parsed Vehicle Information:');
        console.log(`   ID: ${vehicle.sourceId}`);
        console.log(`   Title: ${vehicle.sourceTitle || vehicle.title}`);
        console.log(`   Price PLN: ${vehicle.pricePln}`);
        console.log(`   Price EUR: ${vehicle.priceEur}`);
        console.log(`   Description: ${vehicle.description ? vehicle.description.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`   Seller: ${vehicle.sellerInfo?.name || 'N/A'}`);
        console.log(`   Seller Type: ${vehicle.sellerInfo?.type || 'N/A'}`);
        console.log(`   Location: ${vehicle.sellerInfo?.location || 'N/A'}`);
        console.log(`   Member Since: ${vehicle.sellerInfo?.memberSince || 'N/A'}`);
        console.log(`   Photos: ${vehicle.sourcePhotos ? vehicle.sourcePhotos.length : 0} images`);
        
        if (vehicle.sourceParameters && typeof vehicle.sourceParameters === 'object') {
          console.log(`   Parameters: ${Object.keys(vehicle.sourceParameters).length} items`);
          // Show first few parameters
          const params = Object.entries(vehicle.sourceParameters).slice(0, 3);
          params.forEach(([key, value]) => {
            console.log(`     - ${key}: ${value}`);
          });
        }
        
        if (vehicle.sourceEquipment && typeof vehicle.sourceEquipment === 'object') {
          console.log(`   Equipment: ${Object.keys(vehicle.sourceEquipment).length} categories`);
        }
      }

      console.log('\n🎉 Real-world test completed successfully!');
      console.log('✅ Both scraping and parsing are working with live Otomoto data');
    } else {
      console.log('❌ No vehicles found in search results');
    }

  } catch (error) {
    console.error('❌ Real-world test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await scraper.close();
    console.log('✅ Scraper closed successfully');
  }
}

// Export for use in other tests or direct execution
export { testRealWorldScraping };

// Allow direct execution
if (require.main === module) {
  testRealWorldScraping().catch(console.error);
}
