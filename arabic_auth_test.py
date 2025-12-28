#!/usr/bin/env python3
"""
Arabic Authentication Test - Testing optional email verification
اختبار نظام التسجيل والمصادقة مع التحقق من أن البريد الإلكتروني أصبح اختيارياً
"""

import requests
import json
import sys
from datetime import datetime

class ArabicAuthTester:
    def __init__(self):
        # Use the backend URL from frontend/.env
        self.base_url = "https://styleit-1.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.test_results = []
        
    def log_result(self, test_name, success, details="", data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ نجح" if success else "❌ فشل"
        print(f"{status} - {test_name}")
        if details:
            print(f"   التفاصيل: {details}")
        if data and isinstance(data, dict):
            for key, value in data.items():
                print(f"   {key}: {value}")
        print()

    def test_traditional_registration(self):
        """
        1. اختبار التسجيل التقليدي (بريد + كلمة مرور)
        Test traditional registration with email + password
        """
        print("🔐 اختبار التسجيل التقليدي...")
        
        # Generate unique username and email to avoid conflicts
        timestamp = datetime.now().strftime('%H%M%S')
        registration_data = {
            "username": f"testuser123_{timestamp}",
            "email": f"test_{timestamp}@example.com", 
            "password": "password123"
        }
        
        # Store for login test
        self.test_username = registration_data["username"]
        self.test_password = registration_data["password"]
        
        try:
            response = requests.post(
                f"{self.api_url}/auth/register",
                json=registration_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                has_token = 'access_token' in data
                has_user = 'user' in data
                
                if has_token and has_user:
                    self.token = data['access_token']
                    self.user_data = data['user']
                    
                    # Check email_verified status
                    email_verified = self.user_data.get('email_verified', True)
                    
                    self.log_result(
                        "التسجيل التقليدي",
                        True,
                        "تم التسجيل بنجاح والحصول على access_token",
                        {
                            "access_token": "موجود" if has_token else "غير موجود",
                            "user_object": "موجود" if has_user else "غير موجود", 
                            "email_verified": email_verified,
                            "username": self.user_data.get('username'),
                            "email": self.user_data.get('email')
                        }
                    )
                    
                    # Verify email_verified is False (as requested)
                    if email_verified == False:
                        self.log_result(
                            "التحقق من حالة البريد الإلكتروني",
                            True,
                            "email_verified = false كما هو مطلوب (التحقق اختياري)"
                        )
                    else:
                        self.log_result(
                            "التحقق من حالة البريد الإلكتروني", 
                            False,
                            f"email_verified = {email_verified}, متوقع false"
                        )
                    
                    return True
                else:
                    self.log_result(
                        "التسجيل التقليدي",
                        False,
                        "الاستجابة لا تحتوي على access_token أو user object"
                    )
                    return False
            else:
                try:
                    error_data = response.json()
                    self.log_result(
                        "التسجيل التقليدي",
                        False,
                        f"كود الحالة: {response.status_code}, الخطأ: {error_data}"
                    )
                except:
                    self.log_result(
                        "التسجيل التقليدي",
                        False,
                        f"كود الحالة: {response.status_code}, النص: {response.text}"
                    )
                return False
                
        except Exception as e:
            self.log_result(
                "التسجيل التقليدي",
                False,
                f"خطأ في الطلب: {str(e)}"
            )
            return False

    def test_login(self):
        """
        2. اختبار تسجيل الدخول
        Test login with registered user
        """
        print("🔑 اختبار تسجيل الدخول...")
        
        if not hasattr(self, 'test_username'):
            self.log_result(
                "تسجيل الدخول",
                False,
                "لم يتم تسجيل مستخدم للاختبار"
            )
            return False
        
        login_data = {
            "username": self.test_username,
            "password": self.test_password
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/auth/login",
                json=login_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                has_token = 'access_token' in data
                has_user = 'user' in data
                
                if has_token:
                    # Update token for subsequent tests
                    self.token = data['access_token']
                    self.user_data = data['user']
                    
                    self.log_result(
                        "تسجيل الدخول",
                        True,
                        "تم تسجيل الدخول بنجاح والحصول على token",
                        {
                            "access_token": "موجود",
                            "user_id": self.user_data.get('id'),
                            "username": self.user_data.get('username')
                        }
                    )
                    return True
                else:
                    self.log_result(
                        "تسجيل الدخول",
                        False,
                        "لا يوجد access_token في الاستجابة"
                    )
                    return False
            else:
                try:
                    error_data = response.json()
                    self.log_result(
                        "تسجيل الدخول",
                        False,
                        f"كود الحالة: {response.status_code}, الخطأ: {error_data}"
                    )
                except:
                    self.log_result(
                        "تسجيل الدخول",
                        False,
                        f"كود الحالة: {response.status_code}"
                    )
                return False
                
        except Exception as e:
            self.log_result(
                "تسجيل الدخول",
                False,
                f"خطأ في الطلب: {str(e)}"
            )
            return False

    def test_protected_endpoint_access(self):
        """
        3. اختبار الوصول إلى endpoint محمي
        Test access to protected endpoint without email verification
        """
        print("🛡️ اختبار الوصول إلى endpoint محمي...")
        
        if not self.token:
            self.log_result(
                "الوصول إلى /auth/me",
                False,
                "لا يوجد token للاختبار"
            )
            return False
            
        try:
            response = requests.get(
                f"{self.api_url}/auth/me",
                headers={
                    'Authorization': f'Bearer {self.token}',
                    'Content-Type': 'application/json'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                self.log_result(
                    "الوصول إلى /auth/me",
                    True,
                    "تم الوصول بنجاح دون الحاجة للتحقق من البريد",
                    {
                        "user_id": data.get('id'),
                        "username": data.get('username'),
                        "email": data.get('email'),
                        "email_verified": data.get('email_verified')
                    }
                )
                return True
            else:
                try:
                    error_data = response.json()
                    self.log_result(
                        "الوصول إلى /auth/me",
                        False,
                        f"كود الحالة: {response.status_code}, الخطأ: {error_data}"
                    )
                except:
                    self.log_result(
                        "الوصول إلى /auth/me",
                        False,
                        f"كود الحالة: {response.status_code}"
                    )
                return False
                
        except Exception as e:
            self.log_result(
                "الوصول إلى /auth/me",
                False,
                f"خطأ في الطلب: {str(e)}"
            )
            return False

    def test_designs_quota(self):
        """
        4. التحقق من حصة التصميم
        Test designs quota for new user
        """
        print("🎨 اختبار حصة التصميم...")
        
        if not self.token:
            self.log_result(
                "حصة التصميم",
                False,
                "لا يوجد token للاختبار"
            )
            return False
            
        try:
            response = requests.get(
                f"{self.api_url}/user/designs-quota",
                headers={
                    'Authorization': f'Bearer {self.token}',
                    'Content-Type': 'application/json'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                designs_limit = data.get('designs_limit')
                designs_used = data.get('designs_used')
                designs_remaining = data.get('designs_remaining')
                
                # Check if new user has 3 designs available
                expected_limit = 3
                expected_used = 0
                expected_remaining = 3
                
                success = (designs_limit == expected_limit and 
                          designs_used == expected_used and 
                          designs_remaining == expected_remaining)
                
                self.log_result(
                    "حصة التصميم",
                    success,
                    "المستخدم الجديد لديه 3 تصميمات متاحة" if success else "حصة التصميم غير متطابقة مع المتوقع",
                    {
                        "designs_limit": designs_limit,
                        "designs_used": designs_used, 
                        "designs_remaining": designs_remaining,
                        "is_unlimited": data.get('is_unlimited')
                    }
                )
                return success
            else:
                try:
                    error_data = response.json()
                    self.log_result(
                        "حصة التصميم",
                        False,
                        f"كود الحالة: {response.status_code}, الخطأ: {error_data}"
                    )
                except:
                    self.log_result(
                        "حصة التصميم",
                        False,
                        f"كود الحالة: {response.status_code}"
                    )
                return False
                
        except Exception as e:
            self.log_result(
                "حصة التصميم",
                False,
                f"خطأ في الطلب: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 بدء اختبار نظام التسجيل والمصادقة...")
        print("=" * 60)
        
        # Test sequence as requested
        tests = [
            ("التسجيل التقليدي", self.test_traditional_registration),
            ("تسجيل الدخول", self.test_login), 
            ("الوصول إلى endpoint محمي", self.test_protected_endpoint_access),
            ("حصة التصميم", self.test_designs_quota)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n📋 {test_name}...")
            if test_func():
                passed += 1
            else:
                print(f"⚠️ فشل اختبار: {test_name}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 ملخص النتائج")
        print("=" * 60)
        print(f"إجمالي الاختبارات: {total}")
        print(f"نجح: {passed}")
        print(f"فشل: {total - passed}")
        print(f"معدل النجاح: {(passed/total)*100:.1f}%")
        
        # Save results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_file = f"/app/arabic_auth_test_results_{timestamp}.json"
        
        try:
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "summary": {
                        "total_tests": total,
                        "passed_tests": passed,
                        "failed_tests": total - passed,
                        "success_rate": (passed/total)*100,
                        "test_timestamp": datetime.now().isoformat()
                    },
                    "detailed_results": self.test_results
                }, f, indent=2, ensure_ascii=False)
            
            print(f"\n📄 تم حفظ النتائج التفصيلية في: {results_file}")
        except Exception as e:
            print(f"⚠️ فشل في حفظ النتائج: {str(e)}")
        
        return passed == total

def main():
    """Main test function"""
    tester = ArabicAuthTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())