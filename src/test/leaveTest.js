// Simple test script to verify leave functionality
import { leaveService } from '../services/leaveService.js';

// Test data
const testLeaveRequestData = {
  leaveType: 'Annual Leave',
  reason: 'Family vacation - automated test',
  leaveDates: ['2024-12-25', '2024-12-26'],
  notifyManager: true,
  notifyHR: true
};

const testLeaveRequestDataRange = {
  leaveType: 'Sick Leave',
  startDate: '2024-12-20',
  endDate: '2024-12-22',
  reason: 'Medical appointment - automated test',
  notifyManager: true,
  notifyHR: false
};

// Test functions
async function testCreateLeaveRequest() {
  try {
    console.log('Testing create leave request with specific dates...');
    const response = await leaveService.createLeaveRequest(testLeaveRequestData);
    console.log('✅ Create leave request successful:', response);
    return response.leaveRequest._id;
  } catch (error) {
    console.error('❌ Create leave request failed:', error.message);
    return null;
  }
}

async function testCreateLeaveRequestRange() {
  try {
    console.log('Testing create leave request with date range...');
    const response = await leaveService.createLeaveRequest(testLeaveRequestDataRange);
    console.log('✅ Create leave request (range) successful:', response);
    return response.leaveRequest._id;
  } catch (error) {
    console.error('❌ Create leave request (range) failed:', error.message);
    return null;
  }
}

async function testGetLeaveRequests() {
  try {
    console.log('Testing get leave requests...');
    const response = await leaveService.getLeaveRequests({
      page: 1,
      limit: 10
    });
    console.log('✅ Get leave requests successful:', response);
    return true;
  } catch (error) {
    console.error('❌ Get leave requests failed:', error.message);
    return false;
  }
}

async function testGetLeaveRequestById(leaveId) {
  try {
    console.log('Testing get leave request by ID...');
    const response = await leaveService.getLeaveRequestById(leaveId);
    console.log('✅ Get leave request by ID successful:', response);
    return true;
  } catch (error) {
    console.error('❌ Get leave request by ID failed:', error.message);
    return false;
  }
}

async function testUpdateLeaveRequest(leaveId) {
  try {
    console.log('Testing update leave request...');
    const updateData = {
      reason: 'Updated reason - automated test'
    };
    const response = await leaveService.updateLeaveRequest(leaveId, updateData);
    console.log('✅ Update leave request successful:', response);
    return true;
  } catch (error) {
    console.error('❌ Update leave request failed:', error.message);
    return false;
  }
}

async function testCancelLeaveRequest(leaveId) {
  try {
    console.log('Testing cancel leave request...');
    const response = await leaveService.cancelLeaveRequest(leaveId, 'Test cancellation');
    console.log('✅ Cancel leave request successful:', response);
    return true;
  } catch (error) {
    console.error('❌ Cancel leave request failed:', error.message);
    return false;
  }
}

async function testGetHolidays() {
  try {
    console.log('Testing get holidays...');
    const response = await leaveService.getHolidays(2024);
    console.log('✅ Get holidays successful:', response);
    return true;
  } catch (error) {
    console.error('❌ Get holidays failed:', error.message);
    return false;
  }
}

async function testGetLeaveBalance() {
  try {
    console.log('Testing get leave balance...');
    const response = await leaveService.getLeaveBalance();
    console.log('✅ Get leave balance successful:', response);
    return true;
  } catch (error) {
    console.error('❌ Get leave balance failed:', error.message);
    return false;
  }
}

async function testGetLeaveStats() {
  try {
    console.log('Testing get leave statistics...');
    const response = await leaveService.getLeaveStats(2024);
    console.log('✅ Get leave statistics successful:', response);
    return true;
  } catch (error) {
    console.error('❌ Get leave statistics failed:', error.message);
    return false;
  }
}

// Main test function
async function runLeaveTests() {
  console.log('🚀 Starting leave functionality tests...\n');
  
  // Test 1: Get holidays
  await testGetHolidays();
  console.log('');
  
  // Test 2: Get leave balance
  await testGetLeaveBalance();
  console.log('');
  
  // Test 3: Get leave statistics
  await testGetLeaveStats();
  console.log('');
  
  // Test 4: Get existing leave requests
  await testGetLeaveRequests();
  console.log('');
  
  // Test 5: Create leave request with specific dates
  const leaveId1 = await testCreateLeaveRequest();
  console.log('');
  
  // Test 6: Create leave request with date range
  const leaveId2 = await testCreateLeaveRequestRange();
  console.log('');
  
  // Test 7: Get leave request by ID (if creation was successful)
  if (leaveId1) {
    await testGetLeaveRequestById(leaveId1);
    console.log('');
    
    // Test 8: Update leave request
    await testUpdateLeaveRequest(leaveId1);
    console.log('');
    
    // Test 9: Cancel leave request
    await testCancelLeaveRequest(leaveId1);
    console.log('');
  }
  
  console.log('✨ Leave functionality tests completed!');
}

// Export for use in browser console or testing framework
if (typeof window !== 'undefined') {
  window.runLeaveTests = runLeaveTests;
  window.leaveService = leaveService;
}

export { runLeaveTests, leaveService };
