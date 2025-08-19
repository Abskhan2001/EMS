// Simple test to verify API connection
async function testAPI() {
  try {
    console.log('Testing API connection...');

    // Test health endpoint
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();

    console.log('Health endpoint response:', data);

    // Test API v1 health endpoint
    const apiResponse = await fetch('http://localhost:4000/api/v1/health');
    const apiData = await apiResponse.json();

    console.log('API v1 health endpoint response:', apiData);

  } catch (error) {
    console.error('API test failed:', error);
  }
}

testAPI();