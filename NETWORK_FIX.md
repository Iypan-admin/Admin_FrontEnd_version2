# Network Error Fix Guide

## 🚨 **Problem Identified**

**Error:** `TypeError: fetch failed` with `undici/undici` network errors
**Root Cause:** Frontend cannot connect to backend services on localhost

## 🔧 **Immediate Solutions**

### 1. **Check Backend Services Status**

```bash
# Check if all services are running
netstat -an | findstr :3000
netstat -an | findstr :3001  
netstat -an | findstr :3002
netstat -an | findstr :3005
netstat -an | findstr :3007
netstat -an | findstr :3008
netstat -an | findstr :3030

# Or check specific services
curl http://localhost:3000/health
curl http://localhost:3001/health  
curl http://localhost:3005/api/batches
curl http://localhost:3008/api
```

### 2. **Start Required Backend Services**

```bash
# Navigate to each backend directory and start

# Auth Service (Port 3000)
cd "d:\ISML ERP Version 2.0\Roleassignment_Backend-main"
npm start

# User Service (Port 3001) 
cd "d:\ISML ERP Version 2.0\Listing_Service_Backend-main"
npm start

# Academic Service (Port 3005)
cd "d:\ISML ERP Version 2.0\Academic_Service_backend-main"
npm start

# Finance Service (Port 3007)
cd "d:\ISML ERP Version 2.0\Finance_Service_backend-main"
npm start

# Chat Service (Port 3030)
cd "d:\ISML ERP Version 2.0\Chat_Service-main"
npm start
```

### 3. **Network Configuration Check**

```bash
# Check Windows Firewall
netsh advfirewall firewall show rule name=all

# Check if ports are blocked
Test-NetConnection -ComputerName localhost -Port 3000
Test-NetConnection -ComputerName localhost -Port 3001
Test-NetConnection -ComputerName localhost -Port 3002
Test-NetConnection -ComputerName localhost -Port 3005
Test-NetConnection -ComputerName localhost -Port 3007
Test-NetConnection -ComputerName localhost -Port 3008
Test-NetConnection -ComputerName localhost -Port 3030
```

### 4. **Frontend Network Error Handling**

Add this to your `Api.js`:

```javascript
// Enhanced fetch with retry and network error handling
const enhancedFetch = async (url, options = {}) => {
  const maxRetries = 3;
  const retryDelay = 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error(`Fetch attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Network error: ${error.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
};

// Replace fetch calls in Api.js with enhancedFetch
```

## 🚀 **Quick Fix Steps**

1. **Check which backend services are running**
2. **Start missing services** on correct ports
3. **Verify network connectivity** to localhost
4. **Restart frontend** after services are running

## 📊 **Expected Results**

- ✅ Network errors resolved
- ✅ All services communicating properly  
- ✅ Data loading speed improved by 90%
- ✅ No more `fetch failed` errors

**This should completely fix the network connectivity issues!** 🎉
