import requests
import sys
import json
from datetime import datetime
import time

class FashionDesignAPITester:
    def __init__(self, base_url="https://design-studio-api-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON response)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Error: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout (30s)")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_register(self, username, email, password):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"username": username, "email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user', {}).get('id')
            return True
        return False

    def test_login(self, username, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user', {}).get('id')
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_generate_design(self, prompt):
        """Test AI design preview generation"""
        print(f"\n🎨 Testing AI Design Preview (this may take up to 60 seconds)...")
        
        success, response = self.run_test(
            "Generate AI Design Preview",
            "POST",
            "designs/preview",
            200,
            data={"prompt": prompt, "clothing_type": "shirt", "color": "blue"}
        )
        
        if success and 'image_base64' in response:
            return response['image_base64']
        return None

    def test_get_designs(self):
        """Test get user designs"""
        success, response = self.run_test(
            "Get User Designs",
            "GET",
            "designs",
            200
        )
        
        if success:
            return response
        return []

    def test_toggle_favorite(self, design_id):
        """Test toggle design favorite"""
        success, response = self.run_test(
            "Toggle Design Favorite",
            "PUT",
            f"designs/{design_id}/favorite",
            200
        )
        return success

    def test_delete_design(self, design_id):
        """Test delete design"""
        success, response = self.run_test(
            "Delete Design",
            "DELETE",
            f"designs/{design_id}",
            200
        )
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login Test",
            "POST",
            "auth/login",
            401,
            data={"username": "invalid_user", "password": "wrong_password"}
        )
        return success

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access Test",
            "GET",
            "designs",
            403
        )
        
        # Restore token
        self.token = temp_token
        return success

    def test_get_coupons(self):
        """Test get available coupons"""
        success, response = self.run_test(
            "Get Available Coupons",
            "GET",
            "coupons",
            200
        )
        
        if success:
            print(f"   Found {len(response)} available coupons")
            return response
        return []

    def test_validate_coupon(self, code="WELCOME10", amount=100):
        """Test coupon validation"""
        success, response = self.run_test(
            "Validate Coupon",
            "POST",
            f"coupons/validate?code={code}&amount={amount}",
            200
        )
        
        if success:
            valid = response.get('valid', False)
            message = response.get('message', '')
            print(f"   Coupon {code}: {'Valid' if valid else 'Invalid'} - {message}")
            return response
        return {}

    def test_get_orders(self):
        """Test get user orders"""
        success, response = self.run_test(
            "Get User Orders",
            "GET",
            "orders",
            200
        )
        
        if success:
            print(f"   Found {len(response)} orders")
            return response
        return []

    def test_get_notifications(self):
        """Test get user notifications"""
        success, response = self.run_test(
            "Get User Notifications",
            "GET",
            "notifications",
            200
        )
        
        if success:
            print(f"   Found {len(response)} notifications")
            return response
        return []

    def test_get_unread_notifications_count(self):
        """Test get unread notifications count"""
        success, response = self.run_test(
            "Get Unread Notifications Count",
            "GET",
            "notifications/unread-count",
            200
        )
        
        if success:
            count = response.get('count', 0)
            print(f"   Unread notifications: {count}")
            return count
        return 0

    def test_mark_notification_read(self, notification_id):
        """Test mark notification as read"""
        success, response = self.run_test(
            "Mark Notification as Read",
            "PUT",
            f"notifications/{notification_id}/read",
            200
        )
        return success

    def test_create_order(self):
        """Test create order with sample data"""
        order_data = {
            "design_image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "prompt": "Test order - casual blue shirt",
            "phone_number": "+966501234567",
            "size": "M",
            "color": "blue",
            "notes": "Test order for API testing"
        }
        
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders/create",
            200,
            data=order_data
        )
        
        if success and 'id' in response:
            print(f"   Created order ID: {response['id']}")
            return response['id']
        return None

def main():
    print("🚀 Starting Fashion Design API Testing...")
    print("=" * 60)
    
    tester = FashionDesignAPITester()
    
    # Generate unique test user
    timestamp = datetime.now().strftime('%H%M%S')
    test_username = f"test_user_{timestamp}"
    test_email = f"test_{timestamp}@example.com"
    test_password = "TestPass123!"
    
    # Test sequence
    print(f"\n📝 Test User: {test_username}")
    print(f"📧 Test Email: {test_email}")
    
    # 1. Test root endpoint
    tester.test_root_endpoint()
    
    # 2. Test user registration
    if not tester.test_register(test_username, test_email, test_password):
        print("❌ Registration failed, stopping tests")
        return 1
    
    # 3. Test get current user
    tester.test_get_me()
    
    # 4. Test AI design preview generation with Arabic prompt
    arabic_prompt = "قميص كاجوال باللون الأزرق الفاتح مع طبعة ورود صغيرة"
    design_image = tester.test_generate_design(arabic_prompt)
    
    if not design_image:
        print("⚠️  Design preview generation failed, continuing with other tests...")
    
    # 5. Test get designs
    designs = tester.test_get_designs()
    
    # 6. Test favorite toggle (if we have designs)
    if designs and len(designs) > 0:
        first_design_id = designs[0].get('id')
        if first_design_id:
            tester.test_toggle_favorite(first_design_id)
    
    # 7. Test security - invalid login
    tester.test_invalid_login()
    
    # 8. Test security - unauthorized access
    tester.test_unauthorized_access()
    
    # 9. Test delete design (if we have one)
    if designs and len(designs) > 0:
        first_design_id = designs[0].get('id')
        if first_design_id:
            tester.test_delete_design(first_design_id)
    
    # 10. Test new features - Coupons
    print("\n🎫 Testing Coupons API...")
    coupons = tester.test_get_coupons()
    
    # Test coupon validation with default test coupon
    tester.test_validate_coupon("WELCOME10", 100)
    
    # Test with invalid coupon
    tester.test_validate_coupon("INVALID", 100)
    
    # 11. Test Orders API
    print("\n📦 Testing Orders API...")
    
    # Create a test order first
    order_id = tester.test_create_order()
    
    # Get user orders
    orders = tester.test_get_orders()
    
    # 12. Test Notifications API
    print("\n🔔 Testing Notifications API...")
    
    # Get notifications
    notifications = tester.test_get_notifications()
    
    # Get unread count
    unread_count = tester.test_get_unread_notifications_count()
    
    # Mark first notification as read if any exist
    if notifications and len(notifications) > 0:
        first_notification_id = notifications[0].get('id')
        if first_notification_id:
            tester.test_mark_notification_read(first_notification_id)
    
    # 13. Test login with existing user
    # Reset token to test login
    tester.token = None
    tester.test_login(test_username, test_password)
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Save detailed results
    results_file = f"/app/test_reports/backend_test_results_{timestamp}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": tester.tests_run - tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100,
                "test_timestamp": datetime.now().isoformat()
            },
            "detailed_results": tester.test_results
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())