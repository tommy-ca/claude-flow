# Authentication System - Technical Design

**Feature**: JWT-based Authentication System  
**Status**: 🟢 **Reference Example**  
**Architecture**: Clean Architecture + SOLID Principles + Security-First Design  
**Global Context**: E-Commerce Craft Marketplace Authentication Architecture  

---

## 🏗️ **System Architecture Design**

### **Clean Architecture Implementation** 🎯

```typescript
interface AuthenticationArchitecture {
  // Clean Architecture Layers (Dependency Rule: Inner → Outer)
  entities: {
    user: 'User entity with authentication properties',
    token: 'JWT token entity with claims and validation',
    session: 'Session entity for state management',
    role: 'Role entity with permissions and access control'
  };
  
  useCases: {
    authenticateUser: 'Core authentication business logic',
    generateToken: 'JWT token generation with claims',
    validateToken: 'Token validation and authorization',
    manageSession: 'Session lifecycle management',
    enforceRoles: 'Role-based access control logic'
  };
  
  interfaceAdapters: {
    authController: 'HTTP API endpoints for authentication',
    tokenGateway: 'JWT token management interface',
    userRepository: 'User data persistence interface',
    sessionStore: 'Session storage and retrieval interface'
  };
  
  frameworksDrivers: {
    expressServer: 'Express.js HTTP server implementation',
    postgresDatabase: 'PostgreSQL database connection',
    redisCache: 'Redis session and rate limiting storage',
    bcryptHasher: 'Password hashing implementation'
  };
}
```

### **SOLID Principles Implementation** 🔧

```typescript
interface SOLIDAuthenticationDesign {
  // Single Responsibility Principle
  singleResponsibility: {
    UserAuthenticator: 'Only handles user credential validation',
    TokenManager: 'Only manages JWT token lifecycle',
    RoleAuthorizer: 'Only handles role-based authorization',
    PasswordHasher: 'Only handles password hashing and verification',
    SessionManager: 'Only manages user session state'
  };
  
  // Open/Closed Principle
  openClosed: {
    AuthenticationStrategy: 'Interface for different auth methods (JWT, OAuth)',
    TokenValidator: 'Extensible token validation with pluggable validators',
    UserRepository: 'Database-agnostic user storage interface',
    AuthorizationPolicy: 'Pluggable authorization policy system'
  };
  
  // Liskov Substitution Principle
  liskovSubstitution: {
    IAuthenticator: 'All authenticators (JWT, OAuth) fully interchangeable',
    ITokenProvider: 'All token providers maintain same contract',
    IUserStore: 'All user storage implementations substitutable',
    ISessionStore: 'All session stores (Redis, Memory) interchangeable'
  };
  
  // Interface Segregation Principle
  interfaceSegregation: {
    IUserReader: 'Read-only user operations',
    IUserWriter: 'Write-only user operations',
    ITokenGenerator: 'Token generation operations',
    ITokenValidator: 'Token validation operations',
    ISessionReader: 'Session read operations',
    ISessionWriter: 'Session write operations'
  };
  
  // Dependency Inversion Principle
  dependencyInversion: {
    AuthController: 'Depends on IAuthenticator abstraction',
    AuthService: 'Depends on IUserRepository abstraction',
    TokenService: 'Depends on ITokenProvider abstraction',
    SessionService: 'Depends on ISessionStore abstraction'
  };
}
```

---

## 💻 **Component Design Details**

### **Core Authentication Components** 🔐

```typescript
// Entity Layer - User Entity
interface User {
  readonly id: UserId;
  readonly email: EmailAddress;
  readonly passwordHash: HashedPassword;
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly createdAt: Date;
  readonly lastLoginAt: Date | null;
  
  // Domain methods
  verifyPassword(plainPassword: string): Promise<boolean>;
  updateLastLogin(): User;
  changeRole(newRole: UserRole): User;
  isActive(): boolean;
}

// Entity Layer - JWT Token Entity
interface JWTToken {
  readonly payload: TokenPayload;
  readonly signature: string;
  readonly expiresAt: Date;
  readonly issuedAt: Date;
  
  // Domain methods
  isExpired(): boolean;
  isValidSignature(publicKey: string): boolean;
  getClaims(): TokenClaims;
  getRemainingTTL(): number;
}

// Use Case Layer - Authentication Service
class AuthenticationService implements IAuthenticationService {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher,
    private tokenGenerator: ITokenGenerator,
    private sessionManager: ISessionManager,
    private logger: ILogger
  ) {}
  
  async authenticateUser(credentials: UserCredentials): Promise<AuthenticationResult> {
    this.logger.info('Authentication attempt', { email: credentials.email });
    
    // 1. Validate input
    await this.validateCredentials(credentials);
    
    // 2. Find user
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      this.logger.warn('Authentication failed - user not found', { email: credentials.email });
      throw new AuthenticationError('Invalid credentials');
    }
    
    // 3. Verify password
    const isPasswordValid = await user.verifyPassword(credentials.password);
    if (!isPasswordValid) {
      this.logger.warn('Authentication failed - invalid password', { userId: user.id });
      throw new AuthenticationError('Invalid credentials');
    }
    
    // 4. Check account status
    if (!user.isActive()) {
      this.logger.warn('Authentication failed - inactive account', { userId: user.id });
      throw new AuthenticationError('Account is not active');
    }
    
    // 5. Generate token
    const token = await this.tokenGenerator.generateToken({
      userId: user.id,
      role: user.role,
      email: user.email
    });
    
    // 6. Create session
    const session = await this.sessionManager.createSession(user.id, token);
    
    // 7. Update last login
    const updatedUser = user.updateLastLogin();
    await this.userRepository.save(updatedUser);
    
    this.logger.info('Authentication successful', { userId: user.id });
    
    return {
      user: updatedUser,
      token,
      session,
      expiresAt: token.expiresAt
    };
  }
  
  private async validateCredentials(credentials: UserCredentials): Promise<void> {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required()
    });
    
    const { error } = schema.validate(credentials);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
  }
}
```

### **JWT Token Management** 🎫

```typescript
// Interface Adapter Layer - Token Service
class JWTTokenService implements ITokenGenerator, ITokenValidator {
  constructor(
    private privateKey: string,
    private publicKey: string,
    private issuer: string,
    private tokenBlacklist: ITokenBlacklist,
    private logger: ILogger
  ) {}
  
  async generateToken(payload: TokenPayload): Promise<JWTToken> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.getExpirationTime(payload.role));
    
    const claims: TokenClaims = {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      iss: this.issuer,
      aud: 'craft-marketplace',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      jti: crypto.randomUUID() // Unique token ID for blacklisting
    };
    
    const signature = jwt.sign(claims, this.privateKey, { algorithm: 'RS256' });
    
    return new JWTToken({
      payload,
      signature,
      expiresAt,
      issuedAt: now
    });
  }
  
  async validateToken(tokenString: string): Promise<TokenValidationResult> {
    try {
      // 1. Verify signature and decode
      const decoded = jwt.verify(tokenString, this.publicKey, { 
        algorithm: 'RS256',
        issuer: this.issuer,
        audience: 'craft-marketplace'
      }) as TokenClaims;
      
      // 2. Check if token is blacklisted
      const isBlacklisted = await this.tokenBlacklist.isBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new TokenError('Token has been revoked');
      }
      
      // 3. Validate custom claims
      await this.validateCustomClaims(decoded);
      
      return {
        isValid: true,
        claims: decoded,
        userId: decoded.sub,
        role: decoded.role
      };
      
    } catch (error) {
      this.logger.warn('Token validation failed', { error: error.message });
      return {
        isValid: false,
        error: error.message
      };
    }
  }
  
  async revokeToken(tokenId: string): Promise<void> {
    await this.tokenBlacklist.addToBlacklist(tokenId);
    this.logger.info('Token revoked', { tokenId });
  }
  
  private getExpirationTime(role: UserRole): number {
    const expirationTimes = {
      customer: 24 * 60 * 60 * 1000, // 24 hours
      artisan: 7 * 24 * 60 * 60 * 1000, // 7 days
      admin: 8 * 60 * 60 * 1000 // 8 hours
    };
    
    return expirationTimes[role] || expirationTimes.customer;
  }
  
  private async validateCustomClaims(claims: TokenClaims): Promise<void> {
    // Custom validation logic
    if (!claims.sub || !claims.role || !claims.email) {
      throw new TokenError('Missing required claims');
    }
    
    // Validate role is still valid
    const user = await this.userRepository.findById(claims.sub);
    if (!user || user.role !== claims.role) {
      throw new TokenError('User role has changed');
    }
  }
}
```

### **Role-Based Authorization** 👤

```typescript
// Use Case Layer - Authorization Service
class AuthorizationService implements IAuthorizationService {
  constructor(
    private rolePermissions: IRolePermissionStore,
    private logger: ILogger
  ) {}
  
  async authorizeAccess(user: User, resource: string, action: string): Promise<boolean> {
    try {
      // 1. Get user permissions
      const permissions = await this.rolePermissions.getPermissions(user.role);
      
      // 2. Check resource-specific permissions
      const hasPermission = this.checkPermission(permissions, resource, action);
      
      // 3. Apply attribute-based access control (ABAC)
      const contextualAccess = await this.checkContextualAccess(user, resource, action);
      
      const isAuthorized = hasPermission && contextualAccess;
      
      this.logger.info('Authorization check', {
        userId: user.id,
        resource,
        action,
        authorized: isAuthorized
      });
      
      return isAuthorized;
      
    } catch (error) {
      this.logger.error('Authorization error', { 
        userId: user.id, 
        resource, 
        action, 
        error: error.message 
      });
      return false; // Deny access on error
    }
  }
  
  private checkPermission(permissions: Permission[], resource: string, action: string): boolean {
    return permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action)
    );
  }
  
  private async checkContextualAccess(user: User, resource: string, action: string): Promise<boolean> {
    // Attribute-based access control logic
    switch (resource) {
      case 'craft-listing':
        return this.checkCraftListingAccess(user, action);
      case 'user-profile':
        return this.checkProfileAccess(user, action);
      case 'admin-panel':
        return this.checkAdminAccess(user, action);
      default:
        return true; // Allow by default for unknown resources
    }
  }
  
  private checkCraftListingAccess(user: User, action: string): boolean {
    switch (action) {
      case 'create':
      case 'edit':
        return user.role === 'artisan' || user.role === 'admin';
      case 'view':
        return true; // Anyone can view public listings
      case 'delete':
        return user.role === 'admin'; // Only admins can delete
      default:
        return false;
    }
  }
}
```

### **Session Management** 🔄

```typescript
// Interface Adapter Layer - Session Store
class RedisSessionStore implements ISessionStore {
  constructor(
    private redisClient: Redis,
    private logger: ILogger,
    private defaultTTL: number = 24 * 60 * 60 // 24 hours
  ) {}
  
  async createSession(userId: string, token: JWTToken): Promise<Session> {
    const sessionId = crypto.randomUUID();
    const session: Session = {
      id: sessionId,
      userId,
      tokenId: token.getClaims().jti,
      createdAt: new Date(),
      lastAccessAt: new Date(),
      expiresAt: token.expiresAt,
      isActive: true
    };
    
    const key = this.getSessionKey(sessionId);
    await this.redisClient.setex(
      key, 
      this.defaultTTL, 
      JSON.stringify(session)
    );
    
    // Also store user's active sessions for management
    await this.addToUserSessions(userId, sessionId);
    
    this.logger.info('Session created', { sessionId, userId });
    return session;
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    const key = this.getSessionKey(sessionId);
    const sessionData = await this.redisClient.get(key);
    
    if (!sessionData) {
      return null;
    }
    
    const session: Session = JSON.parse(sessionData);
    
    // Update last access time
    session.lastAccessAt = new Date();
    await this.redisClient.setex(key, this.defaultTTL, JSON.stringify(session));
    
    return session;
  }
  
  async invalidateSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.removeFromUserSessions(session.userId, sessionId);
    }
    
    const key = this.getSessionKey(sessionId);
    await this.redisClient.del(key);
    
    this.logger.info('Session invalidated', { sessionId });
  }
  
  async invalidateAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionIds = await this.redisClient.smembers(userSessionsKey);
    
    // Invalidate all sessions
    const pipeline = this.redisClient.pipeline();
    sessionIds.forEach(sessionId => {
      pipeline.del(this.getSessionKey(sessionId));
    });
    pipeline.del(userSessionsKey);
    await pipeline.exec();
    
    this.logger.info('All user sessions invalidated', { userId, count: sessionIds.length });
  }
  
  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }
  
  private getUserSessionsKey(userId: string): string {
    return `user:${userId}:sessions`;
  }
  
  private async addToUserSessions(userId: string, sessionId: string): Promise<void> {
    const key = this.getUserSessionsKey(userId);
    await this.redisClient.sadd(key, sessionId);
    await this.redisClient.expire(key, this.defaultTTL);
  }
  
  private async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    const key = this.getUserSessionsKey(userId);
    await this.redisClient.srem(key, sessionId);
  }
}
```

### **Rate Limiting & Security** 🛡️

```typescript
// Security Layer - Rate Limiter
class RateLimiter implements IRateLimiter {
  constructor(
    private redisClient: Redis,
    private logger: ILogger
  ) {}
  
  async checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`;
    const window = Math.floor(Date.now() / windowMs);
    const windowKey = `${key}:${window}`;
    
    const current = await this.redisClient.incr(windowKey);
    
    if (current === 1) {
      await this.redisClient.expire(windowKey, Math.ceil(windowMs / 1000));
    }
    
    const isRateLimited = current > limit;
    const remainingRequests = Math.max(0, limit - current);
    const resetTime = (window + 1) * windowMs;
    
    if (isRateLimited) {
      this.logger.warn('Rate limit exceeded', { 
        identifier, 
        current, 
        limit, 
        window 
      });
    }
    
    return {
      isRateLimited,
      remainingRequests,
      resetTime,
      current,
      limit
    };
  }
  
  async applyAuthenticationRateLimit(req: Request): Promise<void> {
    const clientIP = req.ip;
    const email = req.body.email;
    
    // Rate limit by IP address (5 attempts per 15 minutes)
    const ipResult = await this.checkRateLimit(
      `auth:ip:${clientIP}`, 
      5, 
      15 * 60 * 1000
    );
    
    if (ipResult.isRateLimited) {
      throw new RateLimitError('Too many authentication attempts from this IP');
    }
    
    // Rate limit by email (3 attempts per 15 minutes)
    if (email) {
      const emailResult = await this.checkRateLimit(
        `auth:email:${email}`, 
        3, 
        15 * 60 * 1000
      );
      
      if (emailResult.isRateLimited) {
        throw new RateLimitError('Too many authentication attempts for this account');
      }
    }
  }
}

// Security Middleware
class SecurityMiddleware {
  constructor(
    private rateLimiter: IRateLimiter,
    private logger: ILogger
  ) {}
  
  authenticationRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.rateLimiter.applyAuthenticationRateLimit(req);
        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: error.message,
            retryAfter: 900 // 15 minutes
          });
        }
        next(error);
      }
    };
  }
  
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // HTTPS enforcement
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // XSS protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Content type sniffing protection
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // CSP for authentication pages
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      );
      
      next();
    };
  }
  
  jwtValidation() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
        
        const validationResult = await this.tokenValidator.validateToken(token);
        if (!validationResult.isValid) {
          return res.status(401).json({ 
            error: 'Invalid token',
            details: validationResult.error 
          });
        }
        
        // Add user info to request
        req.user = {
          id: validationResult.userId,
          role: validationResult.role,
          claims: validationResult.claims
        };
        
        next();
      } catch (error) {
        this.logger.error('JWT validation error', { error: error.message });
        return res.status(401).json({ error: 'Token validation failed' });
      }
    };
  }
  
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
```

---

## 🔧 **Database Design**

### **PostgreSQL Schema Design** 🗄️

```sql
-- Users table with security considerations
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'artisan', 'admin')),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  deleted_at TIMESTAMP -- Soft delete for GDPR
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User profiles table (separate for normalization)
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  bio TEXT,
  avatar_url VARCHAR(500),
  preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth integrations table
CREATE TABLE oauth_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', etc.
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  access_token_encrypted TEXT, -- Encrypted storage
  refresh_token_encrypted TEXT, -- Encrypted storage
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);

-- Audit log for security events
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'failed_login', etc.
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  failure_reason VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit log
CREATE INDEX idx_auth_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_event_type ON auth_audit_log(event_type);
CREATE INDEX idx_auth_audit_created_at ON auth_audit_log(created_at);
CREATE INDEX idx_auth_audit_ip_address ON auth_audit_log(ip_address);

-- Token blacklist table (for revoked JWTs)
CREATE TABLE token_blacklist (
  jti VARCHAR(255) PRIMARY KEY, -- JWT ID
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL -- For automatic cleanup
);

-- Index for blacklist lookups
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oauth_integrations_updated_at BEFORE UPDATE ON oauth_integrations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **Redis Data Structures** 📊

```typescript
interface RedisDataStructures {
  // Session storage
  sessions: {
    key: 'session:{sessionId}',
    type: 'string',
    value: 'JSON serialized session object',
    ttl: '24 hours (configurable by role)'
  };
  
  // User active sessions
  userSessions: {
    key: 'user:{userId}:sessions',
    type: 'set',
    value: 'Set of active session IDs',
    ttl: '24 hours'
  };
  
  // Rate limiting
  rateLimitIP: {
    key: 'rate_limit:auth:ip:{ip}:{window}',
    type: 'string',
    value: 'Request count for time window',
    ttl: 'Window duration (15 minutes)'
  };
  
  rateLimitEmail: {
    key: 'rate_limit:auth:email:{email}:{window}',
    type: 'string', 
    value: 'Request count for time window',
    ttl: 'Window duration (15 minutes)'
  };
  
  // Token blacklist cache
  tokenBlacklist: {
    key: 'blacklist:{jti}',
    type: 'string',
    value: 'Revocation timestamp',
    ttl: 'Token expiration time'
  };
  
  // Email verification codes
  emailVerification: {
    key: 'email_verify:{token}',
    type: 'string',
    value: 'User ID and verification data',
    ttl: '24 hours'
  };
  
  // Password reset tokens
  passwordReset: {
    key: 'password_reset:{token}',
    type: 'string',
    value: 'User ID and reset data',
    ttl: '1 hour'
  };
}
```

---

## 🔄 **API Design**

### **Authentication Endpoints** 🌐

```typescript
interface AuthenticationAPI {
  // User Registration
  'POST /api/auth/register': {
    request: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: 'customer' | 'artisan';
      acceptTerms: boolean;
    };
    response: {
      message: string;
      userId: string;
      emailVerificationSent: boolean;
    };
    errors: [400, 409, 422, 500];
  };
  
  // Email Verification
  'POST /api/auth/verify-email': {
    request: {
      token: string;
    };
    response: {
      message: string;
      emailVerified: boolean;
    };
    errors: [400, 404, 410, 500];
  };
  
  // User Login
  'POST /api/auth/login': {
    request: {
      email: string;
      password: string;
      rememberMe?: boolean;
    };
    response: {
      token: string;
      refreshToken?: string;
      user: UserProfile;
      expiresAt: string;
    };
    errors: [400, 401, 423, 429, 500];
  };
  
  // Token Refresh
  'POST /api/auth/refresh': {
    request: {
      refreshToken: string;
    };
    response: {
      token: string;
      expiresAt: string;
    };
    errors: [400, 401, 500];
  };
  
  // User Logout
  'POST /api/auth/logout': {
    headers: {
      Authorization: 'Bearer {token}';
    };
    response: {
      message: string;
    };
    errors: [401, 500];
  };
  
  // Password Reset Request
  'POST /api/auth/forgot-password': {
    request: {
      email: string;
    };
    response: {
      message: string;
      resetEmailSent: boolean;
    };
    errors: [400, 429, 500];
  };
  
  // Password Reset
  'POST /api/auth/reset-password': {
    request: {
      token: string;
      newPassword: string;
    };
    response: {
      message: string;
      passwordReset: boolean;
    };
    errors: [400, 404, 410, 422, 500];
  };
  
  // OAuth Login
  'POST /api/auth/oauth/{provider}': {
    request: {
      accessToken: string;
      provider: 'google' | 'facebook';
    };
    response: {
      token: string;
      user: UserProfile;
      isNewUser: boolean;
      expiresAt: string;
    };
    errors: [400, 401, 422, 500];
  };
  
  // Get Current User
  'GET /api/auth/me': {
    headers: {
      Authorization: 'Bearer {token}';
    };
    response: {
      user: UserProfile;
      permissions: string[];
    };
    errors: [401, 500];
  };
}
```

### **Express Route Implementation** 🛤️

```typescript
// Routes Configuration
class AuthenticationRoutes {
  constructor(
    private authController: AuthController,
    private securityMiddleware: SecurityMiddleware
  ) {}
  
  configureRoutes(app: Express): void {
    const router = Router();
    
    // Apply security middleware to all auth routes
    router.use(this.securityMiddleware.securityHeaders());
    
    // Public routes (with rate limiting)
    router.post('/register', 
      this.securityMiddleware.authenticationRateLimit(),
      this.authController.register.bind(this.authController)
    );
    
    router.post('/login',
      this.securityMiddleware.authenticationRateLimit(), 
      this.authController.login.bind(this.authController)
    );
    
    router.post('/verify-email',
      this.authController.verifyEmail.bind(this.authController)
    );
    
    router.post('/forgot-password',
      this.securityMiddleware.authenticationRateLimit(),
      this.authController.forgotPassword.bind(this.authController)
    );
    
    router.post('/reset-password',
      this.authController.resetPassword.bind(this.authController)
    );
    
    router.post('/oauth/:provider',
      this.securityMiddleware.authenticationRateLimit(),
      this.authController.oauthLogin.bind(this.authController)
    );
    
    // Protected routes (require valid JWT)
    router.post('/logout',
      this.securityMiddleware.jwtValidation(),
      this.authController.logout.bind(this.authController)
    );
    
    router.post('/refresh',
      this.securityMiddleware.jwtValidation(),
      this.authController.refreshToken.bind(this.authController)
    );
    
    router.get('/me',
      this.securityMiddleware.jwtValidation(),
      this.authController.getCurrentUser.bind(this.authController)
    );
    
    app.use('/api/auth', router);
  }
}
```

---

## 📊 **Performance Optimization**

### **Caching Strategy** ⚡

```typescript
interface CachingStrategy {
  // User data caching
  userCache: {
    storage: 'Redis',
    keyPattern: 'user:{userId}',
    ttl: '15 minutes',
    invalidation: 'On user update or role change',
    warmup: 'On first access'
  };
  
  // Permission caching
  permissionCache: {
    storage: 'Redis',
    keyPattern: 'permissions:{role}',
    ttl: '1 hour',
    invalidation: 'On role permission update',
    preload: 'All roles on startup'
  };
  
  // Rate limiting cache
  rateLimitCache: {
    storage: 'Redis',
    keyPattern: 'rate_limit:{type}:{identifier}:{window}',
    ttl: 'Window duration',
    cleanup: 'Automatic expiration'
  };
  
  // Token blacklist cache
  blacklistCache: {
    storage: 'Redis',
    keyPattern: 'blacklist:{jti}',
    ttl: 'Token expiration time',
    synchronization: 'Real-time with database'
  };
}
```

### **Database Optimization** 🗄️

```sql
-- Optimized queries with proper indexing
-- Fast user lookup by email
EXPLAIN ANALYZE SELECT id, email, password_hash, role, email_verified 
FROM users 
WHERE email = $1 AND deleted_at IS NULL;

-- Efficient role-based queries
EXPLAIN ANALYZE SELECT u.*, up.first_name, up.last_name 
FROM users u 
LEFT JOIN user_profiles up ON u.id = up.user_id 
WHERE u.role = $1 AND u.email_verified = true 
ORDER BY u.created_at DESC 
LIMIT 50;

-- Audit log queries with date range
EXPLAIN ANALYZE SELECT * FROM auth_audit_log 
WHERE user_id = $1 
AND created_at >= $2 
AND created_at <= $3 
ORDER BY created_at DESC;

-- Token blacklist cleanup job
DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP;

-- Performance monitoring queries
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename IN ('users', 'auth_audit_log', 'token_blacklist');
```

---

## 🛡️ **Security Implementation**

### **Security Layers** 🔒

```typescript
interface SecurityImplementation {
  // Transport Security
  transportSecurity: {
    https: 'TLS 1.3 with strong cipher suites',
    hsts: 'Strict-Transport-Security header',
    certificatePinning: 'HPKP for critical connections'
  };
  
  // Input Validation
  inputValidation: {
    sanitization: 'XSS prevention with DOMPurify',
    validation: 'Joi schema validation',
    parameterization: 'SQL injection prevention',
    rateLimiting: 'DoS protection'
  };
  
  // Authentication Security
  authenticationSecurity: {
    passwordHashing: 'bcrypt with salt rounds >= 12',
    tokenSigning: 'RS256 with 2048-bit keys',
    sessionSecurity: 'Secure, HttpOnly, SameSite cookies',
    mfa: 'TOTP for admin accounts'
  };
  
  // Authorization Security
  authorizationSecurity: {
    principleOfLeastPrivilege: 'Minimal necessary permissions',
    rbac: 'Role-based access control',
    abac: 'Attribute-based access control',
    tokenValidation: 'Comprehensive token verification'
  };
  
  // Data Protection
  dataProtection: {
    encryptionAtRest: 'AES-256 for sensitive data',
    encryptionInTransit: 'TLS 1.3 for all communications',
    keyManagement: 'HSM or secure key vault',
    dataMinimization: 'GDPR compliance'
  };
}
```

### **Security Monitoring** 👁️

```typescript
class SecurityMonitoring {
  constructor(
    private logger: ILogger,
    private alertingService: IAlertingService
  ) {}
  
  logSecurityEvent(event: SecurityEvent): void {
    this.logger.security(event.type, {
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: event.timestamp,
      success: event.success,
      details: event.details
    });
    
    // Check for suspicious patterns
    this.analyzeSecurityEvent(event);
  }
  
  private analyzeSecurityEvent(event: SecurityEvent): void {
    // Multiple failed logins
    if (event.type === 'failed_login') {
      this.checkFailedLoginPattern(event);
    }
    
    // Unusual access patterns
    if (event.type === 'successful_login') {
      this.checkUnusualAccess(event);
    }
    
    // Privilege escalation attempts
    if (event.type === 'authorization_failure') {
      this.checkPrivilegeEscalation(event);
    }
  }
  
  private async checkFailedLoginPattern(event: SecurityEvent): Promise<void> {
    // Check for brute force attacks
    const recentFailures = await this.getRecentFailedLogins(event.ipAddress, 15); // 15 minutes
    
    if (recentFailures.length > 10) {
      await this.alertingService.sendAlert({
        type: 'security',
        severity: 'high',
        message: 'Potential brute force attack detected',
        details: { ipAddress: event.ipAddress, attempts: recentFailures.length }
      });
    }
  }
}
```

---

## 🎯 **Testing Strategy**

### **Comprehensive Testing Framework** 🧪

```typescript
interface TestingStrategy {
  // Unit Testing
  unitTests: {
    coverage: '>95% for all authentication components',
    framework: 'Jest with TypeScript support',
    mocking: 'Comprehensive mocking of external dependencies',
    testCases: [
      'Password hashing and verification',
      'JWT token generation and validation', 
      'Role-based authorization logic',
      'Session management operations',
      'Input validation and sanitization'
    ]
  };
  
  // Integration Testing
  integrationTests: {
    scope: 'End-to-end authentication workflows',
    database: 'Test database with realistic data',
    external: 'Mock OAuth providers and email services',
    testCases: [
      'Complete registration workflow',
      'Login with various user types',
      'Password reset flow',
      'Token refresh mechanism',
      'Session management'
    ]
  };
  
  // Security Testing
  securityTests: {
    penetrationTesting: 'OWASP ZAP automated security scanning',
    vulnerabilityAssessment: 'Regular vulnerability scans',
    cryptographicTesting: 'Validate encryption implementations',
    testCases: [
      'SQL injection prevention',
      'XSS protection validation',
      'CSRF token validation',
      'Rate limiting effectiveness',
      'Token security validation'
    ]
  };
  
  // Performance Testing
  performanceTests: {
    loadTesting: 'Artillery.js for realistic load simulation',
    stressTesting: 'High concurrency authentication scenarios',
    enduranceTesting: 'Long-running authentication operations',
    testCases: [
      '1000 concurrent logins',
      'Password hashing performance',
      'Token validation throughput',
      'Session cleanup efficiency',
      'Rate limiting accuracy'
    ]
  };
}
```

---

## 🔄 **Deployment Architecture**

### **Production Deployment** 🚀

```typescript
interface ProductionDeployment {
  // High Availability Setup
  highAvailability: {
    loadBalancer: 'NGINX with SSL termination',
    applicationServers: 'Multiple Node.js instances behind load balancer',
    database: 'PostgreSQL with read replicas and failover',
    cache: 'Redis cluster with sentinel for high availability',
    monitoring: 'Comprehensive health checks and alerting'
  };
  
  // Security Configuration
  securityConfiguration: {
    firewall: 'WAF with DDoS protection',
    secrets: 'HashiCorp Vault for key management',
    certificates: 'Let\'s Encrypt with auto-renewal',
    access: 'VPN access for administrative functions',
    compliance: 'SOC 2 Type II compliance monitoring'
  };
  
  // Monitoring and Alerting
  monitoring: {
    applicationMetrics: 'Prometheus with Grafana dashboards',
    securityMonitoring: 'ELK stack for security event analysis',
    performanceMonitoring: 'New Relic for application performance',
    uptimeMonitoring: 'Pingdom for external monitoring',
    alerting: 'PagerDuty for critical incident response'
  };
}
```

---

*Authentication System Technical Design*  
**Status**: 🟢 **Complete and Production-Ready**  
**Next Phase**: Implementation Tasks (see `tasks.md`)  
**Architecture**: Clean Architecture + SOLID + Security-First  
**Global Context**: Fully integrated with E-Commerce Craft Marketplace architecture  

**Ready for secure, scalable authentication development!** 🔐🏗️⚡