import requests
import sys
import json
from datetime import datetime
import time

class NodeJSBackendTester:
    def __init__(self, base_url="https://ai-clothier.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.admin_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_designs = []
        self.created_orders = []

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
            201,  # Node.js returns 201 for creation
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

    def test_admin_login(self, username, password):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        
        if success and 'access_token' in response:
            user_data = response.get('user', {})
            if user_data.get('is_admin'):
                self.admin_token = response['access_token']
                self.admin_user_id = user_data.get('id')
                print(f"   ✅ Admin login successful - User: {user_data.get('username')}")
                return True
            else:
                print(f"   ❌ User {username} is not an admin")
                return False
        return False

    def test_admin_stats(self):
        """Test admin dashboard statistics"""
        # Temporarily use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Admin Dashboard Stats",
            "GET",
            "admin/stats",
            200
        )
        
        if success:
            stats = response
            print(f"   📊 إجمالي المستخدمين: {stats.get('total_users', 0)}")
            print(f"   📦 إجمالي الطلبات: {stats.get('total_orders', 0)}")
            print(f"   🎨 إجمالي التصاميم: {stats.get('total_designs', 0)}")
            print(f"   💰 الإيرادات الكلية: {stats.get('total_revenue', 0)} ر.س")
        
        # Restore user token
        self.token = temp_token
        return success

    def test_admin_users(self):
        """Test admin get all users"""
        # Temporarily use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Admin Get All Users",
            "GET",
            "admin/users",
            200
        )
        
        if success:
            users = response
            print(f"   👥 Found {len(users)} users in system")
            for user in users[:3]:  # Show first 3 users
                print(f"      - {user.get('username')} ({user.get('email')})")
        
        # Restore user token
        self.token = temp_token
        return success

    def test_admin_orders(self):
        """Test admin get all orders"""
        # Temporarily use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Admin Get All Orders",
            "GET",
            "admin/orders",
            200
        )
        
        if success:
            orders = response
            print(f"   📋 Found {len(orders)} orders in system")
            for order in orders[:3]:  # Show first 3 orders
                print(f"      - Order {order.get('id')[:8]}... by {order.get('user_name')} - Status: {order.get('status')}")
        
        # Restore user token
        self.token = temp_token
        return success

    def test_save_design_with_phone(self, prompt, phone_number):
        """Test saving design with phone number (creates order automatically)"""
        # First generate a preview
        preview_success, preview_response = self.run_test(
            "Generate Design Preview for Save",
            "POST",
            "designs/preview",
            200,
            data={"prompt": prompt, "clothing_type": "shirt", "color": "أزرق"}
        )
        
        if not preview_success:
            return False
            
        image_base64 = preview_response.get('image_base64')
        if not image_base64:
            print("   ❌ No image generated in preview")
            return False
        
        # Now save the design
        success, response = self.run_test(
            "Save Design with Phone Number",
            "POST",
            "designs/save",
            201,  # Node.js returns 201 for creation
            data={
                "prompt": prompt,
                "image_base64": image_base64,
                "clothing_type": "shirt",
                "color": "أزرق",
                "phone_number": phone_number
            }
        )
        
        if success and 'id' in response:
            design_id = response['id']
            self.created_designs.append(design_id)
            print(f"   ✅ Design saved with ID: {design_id[:8]}...")
            print(f"   📱 Phone number: {phone_number}")
            return design_id
        return None

    def test_get_designs(self):
        """Test get user designs (NEW ENDPOINT)"""
        success, response = self.run_test(
            "Get User Designs (NEW ENDPOINT)",
            "GET",
            "designs",
            200
        )
        
        if success:
            designs = response
            print(f"   🎨 Found {len(designs)} designs for user")
            return designs
        return []

    def test_designs_quota(self):
        """Test get user designs quota"""
        success, response = self.run_test(
            "Get User Designs Quota",
            "GET",
            "user/designs-quota",
            200
        )
        
        if success:
            quota = response
            print(f"   📊 Designs Limit: {quota.get('designs_limit')}")
            print(f"   📊 Designs Used: {quota.get('designs_used')}")
            print(f"   📊 Designs Remaining: {quota.get('designs_remaining')}")
            print(f"   📊 Is Unlimited: {quota.get('is_unlimited')}")
            return quota
        return {}

    def test_designs_showcase(self):
        """Test get showcase designs for homepage"""
        success, response = self.run_test(
            "Get Showcase Designs",
            "GET",
            "designs/showcase",
            200
        )
        
        if success:
            designs = response
            print(f"   🌟 Found {len(designs)} showcase designs")
            return designs
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
    print("🚀 اختبار شامل للـ Node.js Backend - Fashion Design API")
    print("=" * 80)
    
    tester = NodeJSBackendTester()
    
    # Generate unique test user
    timestamp = datetime.now().strftime('%H%M%S')
    test_username = f"testuser_{timestamp}"
    test_email = f"test_{timestamp}@example.com"
    test_password = "TestPass123!"
    
    # Admin credentials from request
    admin_username = "mohamad"
    admin_password = "mohamad271"
    
    print(f"\n📝 Test User: {test_username}")
    print(f"📧 Test Email: {test_email}")
    print(f"👑 Admin User: {admin_username}")
    
    # ===== 1. AUTHENTICATION TESTS =====
    print(f"\n{'='*20} 1. اختبارات المصادقة {'='*20}")
    
    # Test user registration
    if not tester.test_register(test_username, test_email, test_password):
        print("❌ Registration failed, stopping tests")
        return 1
    
    # Test get current user
    tester.test_get_me()
    
    # Test admin login
    if not tester.test_admin_login(admin_username, admin_password):
        print("❌ Admin login failed, continuing with user tests only")
    
    # ===== 2. DESIGNS TESTS =====
    print(f"\n{'='*20} 2. اختبارات التصاميم {'='*20}")
    
    # Test designs quota
    tester.test_designs_quota()
    
    # Test showcase designs
    tester.test_designs_showcase()
    
    # Test design preview generation
    arabic_prompt = "تيشيرت أحمر مع شعار جميل"
    phone_number = "+963937938856"
    
    success, preview_response = tester.run_test(
        "Generate Design Preview",
        "POST",
        "designs/preview",
        200,
        data={"prompt": arabic_prompt, "clothing_type": "shirt", "color": "أحمر"}
    )
    
    if success:
        print("   ✅ Design preview generated successfully")
    
    # Test save design with phone number (creates order automatically)
    design_id = tester.test_save_design_with_phone(arabic_prompt, phone_number)
    
    # Test get user designs (NEW ENDPOINT)
    designs = tester.test_get_designs()
    
    # ===== 3. USER TESTS =====
    print(f"\n{'='*20} 3. اختبارات المستخدم {'='*20}")
    
    # Test designs quota again (should show updated count)
    tester.test_designs_quota()
    
    # ===== 4. ADMIN TESTS =====
    print(f"\n{'='*20} 4. اختبارات لوحة الأدمن {'='*20}")
    
    if tester.admin_token:
        # Test admin dashboard stats
        tester.test_admin_stats()
        
        # Test admin get all users
        tester.test_admin_users()
        
        # Test admin get all orders
        tester.test_admin_orders()
    else:
        print("⚠️  Admin tests skipped - Admin login failed")
    
    # ===== 5. SECURITY TESTS =====
    print(f"\n{'='*20} 5. اختبارات الأمان {'='*20}")
    
    # Test invalid login
    tester.test_invalid_login()
    
    # Test unauthorized access
    tester.test_unauthorized_access()
    
    # ===== 6. FRONTEND INTEGRATION TEST =====
    print(f"\n{'='*20} 6. اختبار تكامل الواجهة الأمامية {'='*20}")
    
    # Test login page functionality (simulate)
    print("🔍 Testing Frontend Integration...")
    
    # Test if we can access the frontend URL
    try:
        frontend_response = requests.get(tester.base_url, timeout=10)
        if frontend_response.status_code == 200:
            tester.log_test("Frontend Landing Page Access", True, "Frontend accessible")
        else:
            tester.log_test("Frontend Landing Page Access", False, f"Status: {frontend_response.status_code}")
    except Exception as e:
        tester.log_test("Frontend Landing Page Access", False, f"Error: {str(e)}")
    
    # Test login with existing user (re-login)
    print("\n🔄 Testing Re-login with Created User...")
    tester.token = None  # Reset token
    if tester.test_login(test_username, test_password):
        print("   ✅ Re-login successful")
    
    # ===== FINAL RESULTS =====
    print("\n" + "=" * 80)
    print("📊 ملخص نتائج الاختبار")
    print("=" * 80)
    print(f"إجمالي الاختبارات: {tester.tests_run}")
    print(f"نجح: {tester.tests_passed}")
    print(f"فشل: {tester.tests_run - tester.tests_passed}")
    print(f"معدل النجاح: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Detailed results by category
    print(f"\n📋 تفاصيل النتائج:")
    auth_tests = [t for t in tester.test_results if 'auth' in t['test_name'].lower() or 'login' in t['test_name'].lower() or 'register' in t['test_name'].lower()]
    design_tests = [t for t in tester.test_results if 'design' in t['test_name'].lower()]
    admin_tests = [t for t in tester.test_results if 'admin' in t['test_name'].lower()]
    
    print(f"   🔐 اختبارات المصادقة: {len([t for t in auth_tests if t['success']])}/{len(auth_tests)} نجح")
    print(f"   🎨 اختبارات التصاميم: {len([t for t in design_tests if t['success']])}/{len(design_tests)} نجح")
    print(f"   👑 اختبارات الأدمن: {len([t for t in admin_tests if t['success']])}/{len(admin_tests)} نجح")
    
    # Save detailed results
    results_file = f"/app/test_reports/nodejs_backend_test_{timestamp}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump({
            "test_type": "Node.js Backend Comprehensive Test",
            "backend_type": "Node.js/Express",
            "database": "MongoDB (fashion_designer_db)",
            "test_user": test_username,
            "admin_user": admin_username,
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": tester.tests_run - tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100,
                "test_timestamp": datetime.now().isoformat()
            },
            "category_results": {
                "authentication": {
                    "total": len(auth_tests),
                    "passed": len([t for t in auth_tests if t['success']])
                },
                "designs": {
                    "total": len(design_tests),
                    "passed": len([t for t in design_tests if t['success']])
                },
                "admin": {
                    "total": len(admin_tests),
                    "passed": len([t for t in admin_tests if t['success']])
                }
            },
            "detailed_results": tester.test_results,
            "created_resources": {
                "designs": tester.created_designs,
                "orders": tester.created_orders
            }
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 تم حفظ النتائج التفصيلية في: {results_file}")
    
    # Final status message
    if tester.tests_passed == tester.tests_run:
        print(f"\n🎉 جميع الاختبارات نجحت! النظام يعمل بشكل مثالي.")
        return 0
    else:
        failed_tests = [t for t in tester.test_results if not t['success']]
        print(f"\n⚠️  بعض الاختبارات فشلت:")
        for test in failed_tests:
            print(f"   ❌ {test['test_name']}: {test['details']}")
        return 1

if __name__ == "__main__":
    sys.exit(main())