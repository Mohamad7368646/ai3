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

    def test_validate_coupon(self, code="WELCOME10"):
        """Test coupon validation"""
        success, response = self.run_test(
            "Validate Coupon",
            "POST",
            "coupons/validate",
            200,
            data={"code": code}
        )
        
        if success:
            valid = response.get('valid', False)
            message = response.get('message', '')
            print(f"   Coupon {code}: {'Valid' if valid else 'Invalid'} - {message}")
            return response
        return {}

    def test_create_coupon(self, code, discount_percentage, expiry_date=None, max_uses=None):
        """Test creating a new coupon (Admin only)"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        coupon_data = {
            "code": code,
            "discount_percentage": discount_percentage
        }
        
        if expiry_date:
            coupon_data["expiry_date"] = expiry_date
        if max_uses:
            coupon_data["max_uses"] = max_uses
        
        success, response = self.run_test(
            "Create Coupon",
            "POST",
            "coupons",
            201,
            data=coupon_data
        )
        
        if success:
            coupon_id = response.get('id')
            print(f"   ✅ Created coupon: {code} ({discount_percentage}% discount)")
            if coupon_id:
                print(f"   📝 Coupon ID: {coupon_id[:8]}...")
        
        # Restore user token
        self.token = temp_token
        return success, response.get('id') if success else None

    def test_update_coupon(self, coupon_id, discount_percentage=None, expiry_date=None, is_active=None, max_uses=None):
        """Test updating a coupon (Admin only)"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        update_data = {}
        if discount_percentage is not None:
            update_data["discount_percentage"] = discount_percentage
        if expiry_date is not None:
            update_data["expiry_date"] = expiry_date
        if is_active is not None:
            update_data["is_active"] = is_active
        if max_uses is not None:
            update_data["max_uses"] = max_uses
        
        success, response = self.run_test(
            "Update Coupon",
            "PUT",
            f"coupons/{coupon_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   ✅ Updated coupon: {coupon_id[:8]}...")
        
        # Restore user token
        self.token = temp_token
        return success

    def test_delete_coupon(self, coupon_id):
        """Test deleting a coupon (Admin only)"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Delete Coupon",
            "DELETE",
            f"coupons/{coupon_id}",
            200
        )
        
        if success:
            print(f"   ✅ Deleted coupon: {coupon_id[:8]}...")
        
        # Restore user token
        self.token = temp_token
        return success

    def test_get_all_coupons(self):
        """Test getting all coupons (Admin only)"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Get All Coupons (Admin)",
            "GET",
            "coupons",
            200
        )
        
        if success:
            coupons = response
            print(f"   📋 Found {len(coupons)} coupons in system")
            for coupon in coupons[:5]:  # Show first 5 coupons
                status = "فعال" if coupon.get('is_active') else "غير فعال"
                print(f"      - {coupon.get('code')}: {coupon.get('discount_percentage')}% - {status}")
        
        # Restore user token
        self.token = temp_token
        return success, response if success else []

    def test_validate_invalid_coupon(self, code="INVALID123"):
        """Test validation of invalid coupon"""
        success, response = self.run_test(
            "Validate Invalid Coupon",
            "POST",
            "coupons/validate",
            404,
            data={"code": code}
        )
        
        if success:
            print(f"   ✅ Invalid coupon {code} correctly rejected")
        
        return success

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

    # ===== SHOWCASE MANAGER TESTS =====
    
    def test_admin_get_showcase_designs(self):
        """Test admin get all showcase designs"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Admin Get Showcase Designs",
            "GET",
            "admin/showcase-designs",
            200
        )
        
        if success:
            designs = response
            print(f"   🌟 Found {len(designs)} showcase designs")
            for design in designs[:3]:  # Show first 3 designs
                print(f"      - {design.get('title')} ({design.get('clothing_type')}) - Featured: {design.get('is_featured')}")
        
        # Restore user token
        self.token = temp_token
        return success, response if success else []

    def test_admin_create_showcase_design(self, title, description, prompt, clothing_type, color="أزرق", tags=None, is_featured=False):
        """Test admin create new showcase design"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        # Mock base64 image for testing
        mock_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        design_data = {
            "title": title,
            "description": description,
            "prompt": prompt,
            "image_base64": mock_image,
            "clothing_type": clothing_type,
            "color": color,
            "tags": tags or ["اختبار", "تصميم"],
            "is_featured": is_featured
        }
        
        success, response = self.run_test(
            "Admin Create Showcase Design",
            "POST",
            "admin/showcase-designs",
            201,
            data=design_data
        )
        
        if success and 'id' in response:
            design_id = response['id']
            print(f"   ✅ Created showcase design: {title} (ID: {design_id[:8]}...)")
            # Restore user token
            self.token = temp_token
            return design_id
        
        # Restore user token
        self.token = temp_token
        return None

    def test_admin_update_showcase_design(self, design_id, new_title):
        """Test admin update showcase design"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        update_data = {
            "title": new_title,
            "description": "تصميم محدث للاختبار"
        }
        
        success, response = self.run_test(
            "Admin Update Showcase Design",
            "PUT",
            f"admin/showcase-designs/{design_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   ✅ Updated design title to: {new_title}")
        
        # Restore user token
        self.token = temp_token
        return success

    def test_admin_toggle_featured(self, design_id):
        """Test admin toggle featured status"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Admin Toggle Featured Status",
            "PUT",
            f"admin/showcase-designs/{design_id}/toggle-featured",
            200
        )
        
        if success:
            is_featured = response.get('is_featured', False)
            status = "مميز" if is_featured else "عادي"
            print(f"   ✅ Design status changed to: {status}")
        
        # Restore user token
        self.token = temp_token
        return success, response.get('is_featured', False) if success else (False, False)

    def test_admin_delete_showcase_design(self, design_id):
        """Test admin delete showcase design"""
        # Use admin token
        temp_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Admin Delete Showcase Design",
            "DELETE",
            f"admin/showcase-designs/{design_id}",
            200
        )
        
        if success:
            print(f"   ✅ Deleted showcase design: {design_id[:8]}...")
        
        # Restore user token
        self.token = temp_token
        return success

    def test_public_showcase_designs(self):
        """Test public get showcase designs (for homepage)"""
        # No authentication needed for public endpoint
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Public Get Showcase Designs",
            "GET",
            "designs/showcase",
            200
        )
        
        if success:
            designs = response
            print(f"   🌟 Found {len(designs)} active showcase designs for homepage")
            featured_count = len([d for d in designs if d.get('is_featured')])
            print(f"   ⭐ Featured designs: {featured_count}")
        
        # Restore user token
        self.token = temp_token
        return success, response if success else []

def test_coupon_system_comprehensive():
    """Comprehensive testing of the coupon system after fixes"""
    print("🎫 اختبار شامل لنظام الكوبونات بعد الإصلاح")
    print("=" * 80)
    
    tester = NodeJSBackendTester()
    
    # Generate unique test user
    timestamp = datetime.now().strftime('%H%M%S')
    test_username = f"coupontest_{timestamp}"
    test_email = f"coupontest_{timestamp}@example.com"
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
    
    # Test admin login
    if not tester.test_admin_login(admin_username, admin_password):
        print("❌ Admin login failed, stopping coupon tests")
        return 1
    
    # ===== 2. COUPON CRUD OPERATIONS =====
    print(f"\n{'='*20} 2. اختبارات CRUD للكوبونات {'='*20}")
    
    # Test 1: Get existing coupons
    print("\n🔍 1. جلب جميع الكوبونات الموجودة...")
    success, existing_coupons = tester.test_get_all_coupons()
    if not success:
        print("❌ Failed to get existing coupons")
        return 1
    
    initial_count = len(existing_coupons)
    print(f"   📊 عدد الكوبونات الحالية: {initial_count}")
    
    # Test 2: Create coupon with expiry date
    print("\n🔍 2. إنشاء كوبون مع تاريخ انتهاء...")
    from datetime import datetime, timedelta
    future_date = (datetime.now() + timedelta(days=30)).isoformat()
    
    success, coupon_id_1 = tester.test_create_coupon(
        code="TEST50",
        discount_percentage=50,
        expiry_date=future_date,
        max_uses=100
    )
    
    if not success:
        print("❌ Failed to create coupon with expiry date")
        return 1
    
    # Test 3: Create coupon without expiry date (should succeed)
    print("\n🔍 3. إنشاء كوبون بدون تاريخ انتهاء...")
    success, coupon_id_2 = tester.test_create_coupon(
        code="NOEXPIRY25",
        discount_percentage=25
    )
    
    if not success:
        print("❌ Failed to create coupon without expiry date")
        return 1
    
    # Test 4: Verify coupons were created
    print("\n🔍 4. التحقق من إنشاء الكوبونات...")
    success, updated_coupons = tester.test_get_all_coupons()
    if success:
        new_count = len(updated_coupons)
        if new_count > initial_count:
            print(f"   ✅ Coupon count increased: {initial_count} → {new_count}")
        else:
            print(f"   ⚠️  Coupon count unchanged: {new_count}")
    
    # Test 5: Update coupon
    print("\n🔍 5. تعديل كوبون...")
    if coupon_id_1:
        success = tester.test_update_coupon(
            coupon_id_1,
            discount_percentage=60,
            is_active=True
        )
        if not success:
            print("❌ Failed to update coupon")
    
    # ===== 3. COUPON VALIDATION TESTS =====
    print(f"\n{'='*20} 3. اختبارات التحقق من الكوبونات {'='*20}")
    
    # Test 6: Validate valid coupon
    print("\n🔍 6. التحقق من كوبون صالح...")
    validation_result = tester.test_validate_coupon("TEST50")
    if not validation_result:
        print("❌ Failed to validate valid coupon")
    
    # Test 7: Validate existing coupons from the request
    print("\n🔍 7. التحقق من الكوبونات الموجودة...")
    existing_coupon_codes = ["WINTER50", "NEWYEAR25", "NEW5631", "DAMAS21", "MLHAM20"]
    
    for code in existing_coupon_codes:
        print(f"\n   🔍 Testing coupon: {code}")
        result = tester.test_validate_coupon(code)
        if result:
            print(f"   ✅ {code}: Valid")
        else:
            print(f"   ⚠️  {code}: May not exist or be inactive")
    
    # Test 8: Validate invalid coupon
    print("\n🔍 8. التحقق من كوبون غير موجود...")
    tester.test_validate_invalid_coupon("INVALID999")
    
    # ===== 4. COUPON DELETION TESTS =====
    print(f"\n{'='*20} 4. اختبارات حذف الكوبونات {'='*20}")
    
    # Test 9: Delete test coupons
    print("\n🔍 9. حذف الكوبونات التجريبية...")
    
    if coupon_id_1:
        success = tester.test_delete_coupon(coupon_id_1)
        if not success:
            print("❌ Failed to delete first test coupon")
    
    if coupon_id_2:
        success = tester.test_delete_coupon(coupon_id_2)
        if not success:
            print("❌ Failed to delete second test coupon")
    
    # Test 10: Verify deletion
    print("\n🔍 10. التحقق من الحذف...")
    success, final_coupons = tester.test_get_all_coupons()
    if success:
        final_count = len(final_coupons)
        if final_count == initial_count:
            print(f"   ✅ Coupons deleted successfully - Count back to: {final_count}")
        else:
            print(f"   ⚠️  Coupon count unexpected: {final_count}")
    
    # ===== 5. ERROR HANDLING TESTS =====
    print(f"\n{'='*20} 5. اختبارات معالجة الأخطاء {'='*20}")
    
    # Test 11: Try to create duplicate coupon
    print("\n🔍 11. محاولة إنشاء كوبون مكرر...")
    if existing_coupons:
        existing_code = existing_coupons[0].get('code', 'WINTER50')
        temp_token = tester.token
        tester.token = tester.admin_token
        
        success, response = tester.run_test(
            "Create Duplicate Coupon",
            "POST",
            "coupons",
            400,  # Should fail with 400
            data={"code": existing_code, "discount_percentage": 10}
        )
        
        if success:
            print(f"   ✅ Duplicate coupon {existing_code} correctly rejected")
        
        tester.token = temp_token
    
    # Test 12: Try to validate without authentication
    print("\n🔍 12. محاولة التحقق بدون مصادقة...")
    temp_token = tester.token
    tester.token = None
    
    success, response = tester.run_test(
        "Validate Without Auth",
        "POST",
        "coupons/validate",
        401,  # Should fail with 401
        data={"code": "TEST123"}
    )
    
    if success:
        print("   ✅ Unauthorized validation correctly rejected")
    
    tester.token = temp_token
    
    # ===== FINAL RESULTS =====
    print("\n" + "=" * 80)
    print("📊 ملخص نتائج اختبار نظام الكوبونات")
    print("=" * 80)
    print(f"إجمالي الاختبارات: {tester.tests_run}")
    print(f"نجح: {tester.tests_passed}")
    print(f"فشل: {tester.tests_run - tester.tests_passed}")
    print(f"معدل النجاح: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Detailed results by category
    print(f"\n📋 تفاصيل النتائج:")
    auth_tests = [t for t in tester.test_results if 'auth' in t['test_name'].lower() or 'login' in t['test_name'].lower()]
    coupon_tests = [t for t in tester.test_results if 'coupon' in t['test_name'].lower()]
    crud_tests = [t for t in coupon_tests if any(op in t['test_name'].lower() for op in ['create', 'update', 'delete', 'get'])]
    validation_tests = [t for t in coupon_tests if 'validate' in t['test_name'].lower()]
    
    print(f"   🔐 اختبارات المصادقة: {len([t for t in auth_tests if t['success']])}/{len(auth_tests)} نجح")
    print(f"   🎫 اختبارات CRUD للكوبونات: {len([t for t in crud_tests if t['success']])}/{len(crud_tests)} نجح")
    print(f"   ✅ اختبارات التحقق من الكوبونات: {len([t for t in validation_tests if t['success']])}/{len(validation_tests)} نجح")
    
    # Save detailed results
    results_file = f"/app/test_reports/coupon_system_test_{timestamp}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump({
            "test_type": "Coupon System Comprehensive Test",
            "feature": "نظام الكوبونات (Coupon System)",
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
                "coupon_crud": {
                    "total": len(crud_tests),
                    "passed": len([t for t in crud_tests if t['success']])
                },
                "coupon_validation": {
                    "total": len(validation_tests),
                    "passed": len([t for t in validation_tests if t['success']])
                }
            },
            "detailed_results": tester.test_results,
            "apis_tested": [
                "GET /api/coupons",
                "POST /api/coupons", 
                "PUT /api/coupons/:id",
                "DELETE /api/coupons/:id",
                "POST /api/coupons/validate"
            ],
            "test_scenarios": [
                "إنشاء كوبون مع تاريخ انتهاء",
                "إنشاء كوبون بدون تاريخ انتهاء",
                "التحقق من كوبون صالح",
                "التحقق من كوبون غير موجود",
                "تعديل كوبون",
                "حذف كوبون",
                "معالجة الأخطاء"
            ]
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 تم حفظ النتائج التفصيلية في: {results_file}")
    
    # Final status message
    if tester.tests_passed == tester.tests_run:
        print(f"\n🎉 جميع اختبارات نظام الكوبونات نجحت! النظام يعمل بشكل مثالي.")
        return 0
    else:
        failed_tests = [t for t in tester.test_results if not t['success']]
        print(f"\n⚠️  بعض الاختبارات فشلت:")
        for test in failed_tests:
            print(f"   ❌ {test['test_name']}: {test['details']}")
        
        # Check if coupon tests specifically failed
        failed_coupons = [t for t in failed_tests if 'coupon' in t['test_name'].lower()]
        if failed_coupons:
            print(f"\n🎫 اختبارات الكوبونات الفاشلة:")
            for test in failed_coupons:
                print(f"   ❌ {test['test_name']}: {test['details']}")
        
def main():
    """Main function - calls coupon system comprehensive test"""
    return test_coupon_system_comprehensive()

if __name__ == "__main__":
    sys.exit(main())