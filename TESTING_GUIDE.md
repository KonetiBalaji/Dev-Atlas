# DevAtlas Testing & Validation Guide

## 🧪 **Testing Strategy Overview**

This guide provides comprehensive testing procedures for each phase of DevAtlas development, ensuring quality and reliability at every stage.

## 📋 **Testing Phases**

### **Phase 1: MVP Testing**
### **Phase 2: Enhanced Features Testing**
### **Phase 3: Production Features Testing**

---

## 🚀 **Phase 1: MVP Testing**

### **1. Environment Setup Testing**

#### **Test 1.1: Docker Compose Setup**
```bash
# Test command
docker-compose up --build

# Expected results
✅ PostgreSQL container starts on port 5432
✅ Backend container starts on port 8080
✅ Frontend container starts on port 3000
✅ Worker container starts successfully
✅ All containers can communicate

# Validation
curl http://localhost:8080/api/health
# Expected: {"status":"OK","timestamp":"..."}
```

#### **Test 1.2: Database Connection**
```bash
# Test command
docker-compose exec postgres psql -U postgres -d devatlas -c "SELECT 1;"

# Expected results
✅ Database connection successful
✅ Schema tables exist
✅ No connection errors

# Validation
curl http://localhost:8080/api/repositories
# Expected: [] (empty array)
```

### **2. Backend API Testing**

#### **Test 2.1: Health Check**
```bash
# Test command
curl http://localhost:8080/api/health

# Expected results
✅ Status: 200 OK
✅ Response: {"status":"OK","timestamp":"..."}
✅ Response time < 100ms
```

#### **Test 2.2: Repository Addition**
```bash
# Test command
curl -X POST http://localhost:8080/api/repositories \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/facebook/react"}'

# Expected results
✅ Status: 200 OK
✅ Repository added to database
✅ Response includes repository ID
✅ No duplicate entries

# Validation
curl http://localhost:8080/api/repositories
# Expected: Array with one repository object
```

#### **Test 2.3: Invalid Repository URL**
```bash
# Test command
curl -X POST http://localhost:8080/api/repositories \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "invalid-url"}'

# Expected results
✅ Status: 400 Bad Request
✅ Error message: "Valid GitHub URL required"
✅ No database entry created
```

#### **Test 2.4: Duplicate Repository**
```bash
# Test command (run twice)
curl -X POST http://localhost:8080/api/repositories \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/facebook/react"}'

# Expected results
✅ First request: 200 OK, repository created
✅ Second request: 200 OK, "Repository already exists"
✅ No duplicate entries in database
```

### **3. Frontend Testing**

#### **Test 3.1: Page Load**
```bash
# Test command
curl http://localhost:3000

# Expected results
✅ Status: 200 OK
✅ HTML content loads
✅ No JavaScript errors in browser console
```

#### **Test 3.2: Repository Addition UI**
```bash
# Manual test steps
1. Open http://localhost:3000
2. Enter GitHub URL: https://github.com/facebook/react
3. Click "Add Repository"
4. Verify repository appears in list
5. Check browser network tab for API calls

# Expected results
✅ Form submission works
✅ API call successful
✅ Repository appears in UI
✅ No console errors
```

#### **Test 3.3: Analysis Button**
```bash
# Manual test steps
1. Add a repository
2. Click "Analyze" button
3. Verify button state changes
4. Check for API call

# Expected results
✅ Button becomes disabled during analysis
✅ API call to /api/analyze/:id
✅ Response received
✅ Button re-enables
```

### **4. Worker Testing**

#### **Test 4.1: Repository Cloning**
```bash
# Test command
docker-compose exec worker python -c "
from analyzers.repository_analyzer import RepositoryAnalyzer
analyzer = RepositoryAnalyzer()
result = analyzer.clone_repository('https://github.com/facebook/react')
print('Clone successful:', result is not None)
"

# Expected results
✅ Repository clones successfully
✅ Files are accessible
✅ No git errors
```

#### **Test 4.2: Metrics Calculation**
```bash
# Test command
docker-compose exec worker python -c "
from analyzers.repository_analyzer import RepositoryAnalyzer
analyzer = RepositoryAnalyzer()
metrics = analyzer.calculate_metrics('/tmp/test-repo')
print('Metrics calculated:', len(metrics) > 0)
print('File count:', metrics.get('file_count', 0))
"

# Expected results
✅ Metrics calculated successfully
✅ File count > 0
✅ Language distribution present
✅ No calculation errors
```

#### **Test 4.3: Score Calculation**
```bash
# Test command
docker-compose exec worker python -c "
from analyzers.repository_analyzer import RepositoryAnalyzer
analyzer = RepositoryAnalyzer()
metrics = {'file_count': 100, 'has_readme': True, 'has_tests': True}
score = analyzer.calculate_score(metrics)
print('Score calculated:', 0 <= score <= 100)
"

# Expected results
✅ Score between 0-100
✅ Score increases with better metrics
✅ No calculation errors
```

---

## 🚀 **Phase 2: Enhanced Features Testing**

### **1. LLM Integration Testing**

#### **Test 2.1: OpenAI Connection**
```bash
# Test command
curl -X POST http://localhost:8080/api/test-openai \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected results
✅ Status: 200 OK
✅ OpenAI API responds
✅ Token usage tracked
✅ No API errors
```

#### **Test 2.2: Repository Summary Generation**
```bash
# Test command
curl -X POST http://localhost:8080/api/analyze/1 \
  -H "Content-Type: application/json"

# Expected results
✅ Analysis starts successfully
✅ LLM summary generated
✅ Summary stored in database
✅ Token usage recorded
```

#### **Test 2.3: Summary Quality**
```bash
# Manual validation
1. Check generated summary in database
2. Verify summary is 2-3 sentences
3. Confirm summary mentions repository purpose
4. Check for technical details

# Expected results
✅ Summary is coherent and relevant
✅ Mentions repository purpose
✅ Includes technical strengths
✅ Suggests improvements
```

### **2. Security Analysis Testing**

#### **Test 2.4: Dependency Vulnerability Scan**
```bash
# Test command
docker-compose exec worker python -c "
from analyzers.security_analyzer import SecurityAnalyzer
analyzer = SecurityAnalyzer('/tmp/test-repo')
issues = analyzer.analyze_dependencies()
print('Security issues found:', len(issues))
"

# Expected results
✅ Dependencies scanned successfully
✅ Vulnerabilities detected (if any)
✅ Issues stored in database
✅ No scan errors
```

#### **Test 2.5: Secret Detection**
```bash
# Test command
docker-compose exec worker python -c "
from analyzers.security_analyzer import SecurityAnalyzer
analyzer = SecurityAnalyzer('/tmp/test-repo')
issues = analyzer.scan_for_secrets()
print('Secrets found:', len(issues))
"

# Expected results
✅ Secret scanning completes
✅ Patterns detected correctly
✅ False positives minimized
✅ No scan errors
```

#### **Test 2.6: Bandit Analysis**
```bash
# Test command (for Python repositories)
docker-compose exec worker python -c "
from analyzers.security_analyzer import SecurityAnalyzer
analyzer = SecurityAnalyzer('/tmp/test-repo')
issues = analyzer.run_bandit_analysis()
print('Bandit issues found:', len(issues))
"

# Expected results
✅ Bandit analysis completes
✅ Security issues detected
✅ Results stored in database
✅ No analysis errors
```

### **3. Ownership Analysis Testing**

#### **Test 2.7: Git Blame Analysis**
```bash
# Test command
docker-compose exec worker python -c "
from analyzers.ownership_analyzer import OwnershipAnalyzer
analyzer = OwnershipAnalyzer('/tmp/test-repo')
ownership = analyzer.analyze_ownership()
print('Ownership data points:', len(ownership))
"

# Expected results
✅ Git blame analysis completes
✅ Author contributions calculated
✅ Percentage ownership computed
✅ Data stored in database
```

#### **Test 2.8: Top Contributors**
```bash
# Test command
docker-compose exec worker python -c "
from analyzers.ownership_analyzer import OwnershipAnalyzer
analyzer = OwnershipAnalyzer('/tmp/test-repo')
ownership = analyzer.analyze_ownership()
top_contributors = analyzer.get_top_contributors(ownership)
print('Top contributors:', len(top_contributors))
"

# Expected results
✅ Top contributors identified
✅ Contributors sorted by contribution
✅ File contribution counts accurate
✅ No calculation errors
```

### **4. Enhanced UI Testing**

#### **Test 2.9: Analysis Progress Display**
```bash
# Manual test steps
1. Start analysis of a repository
2. Check progress endpoint
3. Verify progress updates in UI
4. Confirm completion status

# Expected results
✅ Progress updates in real-time
✅ Steps displayed correctly
✅ Progress percentages accurate
✅ Completion status shown
```

#### **Test 2.10: Security Report Display**
```bash
# Manual test steps
1. Complete analysis with security issues
2. Navigate to security tab
3. Verify issues displayed
4. Check severity levels

# Expected results
✅ Security issues displayed
✅ Severity levels shown correctly
✅ File paths and line numbers accurate
✅ Recommendations provided
```

#### **Test 2.11: Export Functionality**
```bash
# Test command
curl http://localhost:8080/api/analyses/1/export?format=json

# Expected results
✅ Export endpoint responds
✅ JSON format correct
✅ All analysis data included
✅ File download works
```

---

## 🚀 **Phase 3: Production Features Testing**

### **1. Authentication Testing**

#### **Test 3.1: User Registration**
```bash
# Test command
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Test Org",
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Expected results
✅ Status: 200 OK
✅ Organization created
✅ User created with owner role
✅ JWT token returned
✅ Password hashed securely
```

#### **Test 3.2: User Login**
```bash
# Test command
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Expected results
✅ Status: 200 OK
✅ JWT token returned
✅ User info included
✅ Organization info included
✅ Last login updated
```

#### **Test 3.3: Token Validation**
```bash
# Test command
curl http://localhost:8080/api/repositories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected results
✅ Status: 200 OK
✅ User context available
✅ Organization context available
✅ No authentication errors
```

#### **Test 3.4: Role-Based Access**
```bash
# Test command (with member role)
curl -X POST http://localhost:8080/api/organizations/1/users \
  -H "Authorization: Bearer MEMBER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@example.com"}'

# Expected results
✅ Status: 403 Forbidden
✅ Error: "Insufficient permissions"
✅ No user created
```

### **2. Billing Integration Testing**

#### **Test 3.5: Stripe Customer Creation**
```bash
# Test command
curl -X POST http://localhost:8080/api/billing/create-customer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Expected results
✅ Status: 200 OK
✅ Stripe customer created
✅ Customer ID stored in database
✅ No Stripe API errors
```

#### **Test 3.6: Subscription Creation**
```bash
# Test command
curl -X POST http://localhost:8080/api/billing/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_test123"}'

# Expected results
✅ Status: 200 OK
✅ Stripe subscription created
✅ Subscription stored in database
✅ Payment intent returned
```

#### **Test 3.7: Webhook Handling**
```bash
# Test command (simulate Stripe webhook)
curl -X POST http://localhost:8080/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test_signature" \
  -d '{
    "type": "customer.subscription.created",
    "data": {
      "object": {
        "id": "sub_test123",
        "customer": "cus_test123",
        "status": "active"
      }
    }
  }'

# Expected results
✅ Status: 200 OK
✅ Webhook processed successfully
✅ Database updated
✅ No processing errors
```

### **3. Background Job Testing**

#### **Test 3.8: Job Queue Creation**
```bash
# Test command
curl -X POST http://localhost:8080/api/analyze/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected results
✅ Status: 200 OK
✅ Job added to queue
✅ Job ID returned
✅ No queue errors
```

#### **Test 3.9: Job Status Tracking**
```bash
# Test command
curl http://localhost:8080/api/jobs/status/JOB_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected results
✅ Status: 200 OK
✅ Job status returned
✅ Progress information available
✅ No status errors
```

#### **Test 3.10: Job Processing**
```bash
# Test command (check worker logs)
docker-compose logs worker

# Expected results
✅ Jobs processed successfully
✅ No processing errors
✅ Results stored in database
✅ Job completion status updated
```

### **4. Multi-tenancy Testing**

#### **Test 3.11: Organization Isolation**
```bash
# Test command (create two organizations)
# Org 1: Add repository
curl -X POST http://localhost:8080/api/repositories \
  -H "Authorization: Bearer ORG1_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/org1/repo1"}'

# Org 2: Try to access Org 1's repository
curl http://localhost:8080/api/repositories \
  -H "Authorization: Bearer ORG2_JWT_TOKEN"

# Expected results
✅ Org 1: Repository added successfully
✅ Org 2: Cannot see Org 1's repositories
✅ Data isolation maintained
✅ No cross-organization access
```

#### **Test 3.12: Usage Tracking**
```bash
# Test command
curl http://localhost:8080/api/organizations/usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected results
✅ Status: 200 OK
✅ Usage data returned
✅ Analysis count accurate
✅ Repository count accurate
```

---

## 🔧 **Automated Testing Setup**

### **1. Unit Tests**
```bash
# Backend tests
cd backend
npm test

# Expected results
✅ All tests pass
✅ Coverage > 80%
✅ No test failures
```

### **2. Integration Tests**
```bash
# Run integration tests
npm run test:integration

# Expected results
✅ API endpoints tested
✅ Database operations tested
✅ External service integration tested
```

### **3. End-to-End Tests**
```bash
# Run E2E tests
npm run test:e2e

# Expected results
✅ Full user workflows tested
✅ UI interactions tested
✅ Cross-browser compatibility tested
```

---

## 📊 **Performance Testing**

### **1. Load Testing**
```bash
# Test API performance
npm run test:load

# Expected results
✅ Response times < 200ms
✅ Handles 100+ concurrent requests
✅ No memory leaks
✅ Database performance stable
```

### **2. Stress Testing**
```bash
# Test system limits
npm run test:stress

# Expected results
✅ System handles peak load
✅ Graceful degradation
✅ Recovery after stress
✅ No data corruption
```

---

## 🐛 **Bug Reporting Template**

### **Bug Report Format**
```
**Bug Title**: Brief description

**Environment**:
- Phase: [1/2/3]
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**: What should happen

**Actual Result**: What actually happens

**Screenshots**: If applicable

**Logs**: Relevant error messages
```

---

## ✅ **Testing Checklist**

### **Phase 1 Checklist**
- [ ] Docker setup works
- [ ] Database connection successful
- [ ] API endpoints respond correctly
- [ ] Frontend loads without errors
- [ ] Repository addition works
- [ ] Basic analysis completes
- [ ] Results display correctly

### **Phase 2 Checklist**
- [ ] LLM integration works
- [ ] Security analysis functions
- [ ] Ownership analysis works
- [ ] Enhanced UI displays data
- [ ] Export functionality works
- [ ] Progress tracking works
- [ ] All new features tested

### **Phase 3 Checklist**
- [ ] Authentication system works
- [ ] Billing integration functions
- [ ] Background jobs process
- [ ] Multi-tenancy works
- [ ] Admin features work
- [ ] Production deployment ready
- [ ] All security measures tested

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: Docker Compose Fails**
```bash
# Solution
docker-compose down
docker system prune -f
docker-compose up --build
```

### **Issue 2: Database Connection Errors**
```bash
# Solution
docker-compose restart postgres
# Wait 30 seconds
docker-compose up backend
```

### **Issue 3: OpenAI API Errors**
```bash
# Solution
Check API key in .env file
Verify API quota
Test with smaller requests
```

### **Issue 4: Redis Connection Issues**
```bash
# Solution
docker-compose restart redis
# Wait 10 seconds
docker-compose up worker
```

---

## 📝 **Testing Notes**

- **Always test with small repositories first**
- **Monitor API quotas and costs**
- **Check logs for detailed error information**
- **Test both success and failure scenarios**
- **Verify data persistence across restarts**
- **Test with different user roles and permissions**

This comprehensive testing guide ensures DevAtlas is robust, reliable, and ready for production use at each phase of development.
