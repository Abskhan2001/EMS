# 🔐 JWT Token Authentication Guide

## Overview

Your EMS application now uses **JWT (JSON Web Tokens)** for authentication instead of Supabase. This guide explains how tokens work in your Node.js backend and how to use them properly.

## 🔄 Token Flow Explanation

### 1. **Token Generation (Backend)**

When a user signs up or logs in, your Node.js backend generates **TWO** tokens:

```javascript
// In authController.js
const accessToken = generateToken(user._id);        // Short-lived (7 days)
const refreshToken = generateRefreshToken(user._id); // Long-lived (30 days)
```

**Access Token:**
- Used for API requests
- Contains user ID and expiration
- Short lifespan for security

**Refresh Token:**
- Used to get new access tokens
- Longer lifespan
- Stored securely

### 2. **Token Storage (Frontend)**

Tokens are stored in localStorage:

```javascript
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);
localStorage.setItem('user', JSON.stringify(user));
```

### 3. **Token Usage (API Requests)**

Every API request includes the access token:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

### 4. **Automatic Token Refresh**

When access token expires, the system automatically:
1. Detects expired token
2. Uses refresh token to get new access token
3. Retries the original request
4. Updates stored tokens

## 🚀 Implementation Details

### **Signup Flow**

```javascript
// 1. User submits signup form
const userData = { email, password, fullName, role };

// 2. Backend creates user and generates tokens
const user = new User(userData);
await user.save();

const accessToken = generateToken(user._id);
const refreshToken = generateRefreshToken(user._id);

// 3. Frontend receives and stores tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### **Login Flow**

```javascript
// 1. User submits login form
const credentials = { email, password };

// 2. Backend validates credentials and generates tokens
const user = await User.findByEmail(email);
const isValid = await user.comparePassword(password);

if (isValid) {
  const accessToken = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  // Return tokens to frontend
}
```

### **Protected Route Access**

```javascript
// 1. Frontend makes API request
const response = await fetch('/api/v1/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 2. Backend middleware verifies token
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

## 🔧 Key Components

### **1. AuthService (`frontend/src/services/authService.ts`)**

Handles all authentication operations:
- `signInWithPassword()` - Login with email/password
- `signUp()` - Register new user
- `getSession()` - Get current user session
- `signOut()` - Logout user
- `getValidToken()` - Get valid access token (auto-refresh if needed)

### **2. API Interceptor (`frontend/src/services/apiInterceptor.ts`)**

Automatically handles token management:
- Adds tokens to requests
- Detects expired tokens
- Refreshes tokens automatically
- Retries failed requests

### **3. Database Service (`frontend/src/services/databaseService.ts`)**

Provides Supabase-like interface with JWT tokens:
- Automatically includes valid tokens in requests
- Handles all CRUD operations
- Maintains same API as Supabase

## 🛡️ Security Features

### **Token Expiration**
- Access tokens expire in 7 days
- Refresh tokens expire in 30 days
- Automatic cleanup of expired tokens

### **Token Validation**
- JWT signature verification
- Expiration time checking
- User existence validation

### **Automatic Refresh**
- Seamless token renewal
- No user interruption
- Fallback to login if refresh fails

## 📝 Usage Examples

### **Making Authenticated Requests**

```javascript
// Option 1: Use the database service (recommended)
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'admin');

// Option 2: Use the API interceptor directly
import apiClient from '../services/apiInterceptor';
const response = await apiClient.get('/users?role=admin');

// Option 3: Manual token handling
const token = await authService.getValidToken();
const response = await fetch('/api/v1/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### **Checking Authentication Status**

```javascript
// Get current session
const { data: { session }, error } = await supabase.auth.getSession();

if (session?.user) {
  console.log('User is authenticated:', session.user);
} else {
  console.log('User is not authenticated');
}
```

### **Handling Logout**

```javascript
// Sign out user
const { error } = await supabase.auth.signOut();

if (!error) {
  // Tokens are automatically cleared
  // User is redirected to login
}
```

## 🔍 Debugging Tips

### **Check Token Status**

```javascript
// Check if token exists
const token = localStorage.getItem('accessToken');
console.log('Token exists:', !!token);

// Check if token is expired
const isExpired = authService.isTokenExpired(token);
console.log('Token expired:', isExpired);

// Get token payload
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);
```

### **Monitor Token Refresh**

```javascript
// The API interceptor logs refresh attempts
// Check browser console for:
// - "Token refresh failed during request"
// - Network requests to "/auth/refresh-token"
```

## 🚨 Important Notes

1. **No More Supabase Service Keys**: You don't need VITE_SUPABASE_SERVICE_ROLE_KEY anymore
2. **JWT Secrets**: Make sure JWT_SECRET and JWT_REFRESH_SECRET are set in backend .env
3. **Token Security**: Tokens are stored in localStorage (consider httpOnly cookies for production)
4. **Automatic Cleanup**: Invalid tokens are automatically cleared
5. **Seamless Migration**: All existing Supabase code continues to work

## 🎯 Migration Summary

**Before (Supabase):**
```javascript
// Supabase handled everything automatically
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});
```

**After (Custom JWT):**
```javascript
// Same interface, but using your Node.js backend
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});
// Now powered by your JWT system!
```

The beauty of this migration is that **your frontend code doesn't change** - it just works with JWT tokens instead of Supabase tokens! 🎉