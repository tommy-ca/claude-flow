# Authentication System - Implementation Tasks

**Feature**: JWT-based Authentication System  
**Status**: 🟢 **Ready for Implementation**  
**Methodology**: Kiro-Enhanced SPARC with Security-First Development  
**Timeline**: 8 weeks (4 phases × 2 weeks each)  

---

## 📋 **Phase 1: Foundation & Core Security (Weeks 1-2)**

### **Task T-001: Core Authentication Entities** 🏗️
**Priority**: 🔴 **Critical**  
**Duration**: 1 week  
**Assignee**: Lead Developer  
**Dependencies**: None  

#### **Implementation Steps**
```typescript
// 1. Create User entity with domain logic
class User {
  constructor(
    private readonly id: UserId,
    private readonly email: EmailAddress,
    private readonly passwordHash: HashedPassword,
    private readonly role: UserRole,
    private readonly emailVerified: boolean,
    private readonly createdAt: Date,
    private lastLoginAt: Date | null
  ) {}
  
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash.value);
  }
  
  updateLastLogin(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.role,
      this.emailVerified,
      this.createdAt,
      new Date()
    );
  }
  
  isActive(): boolean {
    return this.emailVerified && this.deletedAt === null;
  }
}

// 2. Create JWT Token entity
class JWTToken {
  constructor(
    private readonly payload: TokenPayload,
    private readonly signature: string,
    private readonly expiresAt: Date,
    private readonly issuedAt: Date
  ) {}
  
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
  
  getClaims(): TokenClaims {
    return jwt.decode(this.signature) as TokenClaims;
  }
}

// 3. Create value objects for type safety
class EmailAddress {
  constructor(private readonly value: string) {
    if (!this.isValidEmail(value)) {
      throw new ValidationError('Invalid email address');
    }
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

#### **Acceptance Criteria**
- [ ] User entity with complete domain logic and validation
- [ ] JWT token entity with expiration and claims handling
- [ ] Type-safe value objects for email, password, and user ID
- [ ] Comprehensive unit tests with >95% coverage
- [ ] Domain logic isolated from infrastructure concerns

---

### **Task T-002: Password Security Implementation** 🔐
**Priority**: 🔴 **Critical**  
**Duration**: 1 week  
**Assignee**: Security Engineer  
**Dependencies**: T-001  

#### **Implementation Steps**
```typescript
// 1. Implement secure password hashing
class PasswordHasher implements IPasswordHasher {
  private readonly saltRounds = 12; // Configurable, minimum 12
  
  async hashPassword(plainPassword: string): Promise<HashedPassword> {
    // Validate password complexity
    this.validatePasswordComplexity(plainPassword);
    
    // Generate salt and hash
    const salt = await bcrypt.genSalt(this.saltRounds);
    const hash = await bcrypt.hash(plainPassword, salt);
    
    return new HashedPassword(hash);
  }
  
  async verifyPassword(plainPassword: string, hashedPassword: HashedPassword): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword.value);
  }
  
  private validatePasswordComplexity(password: string): void {
    const schema = Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
      });
    
    const { error } = schema.validate(password);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
  }
}

// 2. Implement password policy enforcement
class PasswordPolicy {
  validateNewPassword(password: string, userEmail: string): PasswordValidationResult {
    const checks: PasswordCheck[] = [
      this.checkLength(password),
      this.checkComplexity(password),
      this.checkCommonPasswords(password),
      this.checkPersonalInfo(password, userEmail)
    ];
    
    const failedChecks = checks.filter(check => !check.passed);
    
    return {
      isValid: failedChecks.length === 0,
      score: this.calculateStrengthScore(password),
      failedChecks: failedChecks.map(check => check.message)
    };
  }
  
  private checkCommonPasswords(password: string): PasswordCheck {
    // Check against common password list
    const commonPasswords = this.loadCommonPasswordList();
    const isCommon = commonPasswords.includes(password.toLowerCase());
    
    return {
      passed: !isCommon,
      message: isCommon ? 'Password is too common' : ''
    };
  }
}
```

#### **Acceptance Criteria**
- [ ] bcrypt hashing with configurable salt rounds (minimum 12)
- [ ] Password complexity validation (8+ chars, mixed case, numbers, symbols)
- [ ] Common password detection and prevention
- [ ] Password strength scoring algorithm
- [ ] Performance: <200ms per password hash operation

---

### **Task T-003: JWT Token Management** 🎫
**Priority**: 🔴 **Critical**  
**Duration**: 1 week  
**Assignee**: Backend Developer  
**Dependencies**: T-001  

#### **Implementation Steps**
```typescript
// 1. Implement JWT token service with RS256
class JWTTokenService implements ITokenGenerator, ITokenValidator {
  constructor(
    private readonly privateKey: string,
    private readonly publicKey: string,
    private readonly issuer: string,
    private readonly tokenBlacklist: ITokenBlacklist
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
      jti: crypto.randomUUID()
    };
    
    const signature = jwt.sign(claims, this.privateKey, { algorithm: 'RS256' });
    
    return new JWTToken({ payload, signature, expiresAt, issuedAt: now });
  }
  
  async validateToken(tokenString: string): Promise<TokenValidationResult> {
    try {
      // Verify signature and decode
      const decoded = jwt.verify(tokenString, this.publicKey, {
        algorithm: 'RS256',
        issuer: this.issuer,
        audience: 'craft-marketplace'
      }) as TokenClaims;
      
      // Check blacklist
      const isBlacklisted = await this.tokenBlacklist.isBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new TokenError('Token has been revoked');
      }
      
      return {
        isValid: true,
        claims: decoded,
        userId: decoded.sub,
        role: decoded.role
      };
      
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

// 2. Implement token blacklist for revocation
class RedisTokenBlacklist implements ITokenBlacklist {
  constructor(private readonly redisClient: Redis) {}
  
  async addToBlacklist(tokenId: string, expiresAt: Date): Promise<void> {
    const key = `blacklist:${tokenId}`;
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    
    if (ttl > 0) {
      await this.redisClient.setex(key, ttl, '1');
    }
  }
  
  async isBlacklisted(tokenId: string): Promise<boolean> {
    const key = `blacklist:${tokenId}`;
    const result = await this.redisClient.get(key);
    return result !== null;
  }
}
```

#### **Acceptance Criteria**
- [ ] RS256 algorithm with 2048-bit key pairs
- [ ] Configurable token expiration by role (customer: 24h, artisan: 7d, admin: 8h)
- [ ] Token blacklist for immediate revocation
- [ ] Comprehensive token validation with security checks
- [ ] Performance: <50ms token generation, <100ms validation

---

## 📋 **Phase 2: Authentication Services (Weeks 3-4)**

### **Task T-004: Core Authentication Service** 🔑
**Priority**: 🔴 **Critical**  
**Duration**: 1.5 weeks  
**Assignee**: Backend Developer  
**Dependencies**: T-001, T-002, T-003  

#### **Implementation Steps**
```typescript
// 1. Implement authentication service with clean architecture
class AuthenticationService implements IAuthenticationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenGenerator: ITokenGenerator,
    private readonly sessionManager: ISessionManager,
    private readonly auditLogger: IAuditLogger,
    private readonly rateLimiter: IRateLimiter
  ) {}
  
  async authenticateUser(credentials: UserCredentials, context: AuthContext): Promise<AuthenticationResult> {
    const { email, password } = credentials;
    const { ipAddress, userAgent } = context;
    
    // Apply rate limiting
    await this.rateLimiter.checkAuthenticationRateLimit(ipAddress, email);
    
    try {
      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        await this.logAuthAttempt(null, false, 'user_not_found', context);
        throw new AuthenticationError('Invalid credentials');
      }
      
      // Verify password
      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        await this.incrementFailedAttempts(user.id);
        await this.logAuthAttempt(user.id, false, 'invalid_password', context);
        throw new AuthenticationError('Invalid credentials');
      }
      
      // Check account status
      if (!user.isActive()) {
        await this.logAuthAttempt(user.id, false, 'account_inactive', context);
        throw new AuthenticationError('Account is not active');
      }
      
      // Generate token and session
      const token = await this.tokenGenerator.generateToken({
        userId: user.id,
        role: user.role,
        email: user.email
      });
      
      const session = await this.sessionManager.createSession(user.id, token);
      
      // Update user login info
      const updatedUser = user.updateLastLogin();
      await this.userRepository.save(updatedUser);
      await this.resetFailedAttempts(user.id);
      
      await this.logAuthAttempt(user.id, true, 'success', context);
      
      return {
        user: updatedUser,
        token,
        session,
        expiresAt: token.expiresAt
      };
      
    } catch (error) {
      if (!(error instanceof AuthenticationError)) {
        await this.logAuthAttempt(null, false, 'system_error', context);
      }
      throw error;
    }
  }
  
  async registerUser(registration: UserRegistration): Promise<RegistrationResult> {
    // Validate registration data
    await this.validateRegistration(registration);
    
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(registration.email);
    if (existingUser) {
      throw new RegistrationError('Email already registered');
    }
    
    // Hash password
    const passwordHash = await this.passwordHasher.hashPassword(registration.password);
    
    // Create user
    const user = new User({
      id: new UserId(crypto.randomUUID()),
      email: new EmailAddress(registration.email),
      passwordHash,
      role: registration.role,
      emailVerified: false,
      createdAt: new Date(),
      lastLoginAt: null
    });
    
    // Save user
    await this.userRepository.save(user);
    
    // Send verification email
    const verificationToken = await this.generateEmailVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(user.email, verificationToken);
    
    return {
      userId: user.id,
      emailVerificationSent: true,
      message: 'Registration successful. Please check your email for verification.'
    };
  }
}
```

#### **Acceptance Criteria**
- [ ] Complete user authentication with comprehensive error handling
- [ ] User registration with email verification workflow
- [ ] Rate limiting for authentication attempts (5 per 15 minutes per IP)
- [ ] Comprehensive audit logging for all authentication events
- [ ] Failed login attempt tracking and account locking

---

### **Task T-005: Session Management** 🔄
**Priority**: 🟡 **High**  
**Duration**: 1 week  
**Assignee**: Backend Developer  
**Dependencies**: T-003, T-004  

#### **Implementation Steps**
```typescript
// 1. Implement session management with Redis
class SessionManager implements ISessionManager {
  constructor(
    private readonly redisClient: Redis,
    private readonly logger: ILogger,
    private readonly defaultTTL: number = 24 * 60 * 60 // 24 hours
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
      isActive: true,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIPAddress()
      }
    };
    
    // Store session in Redis
    const key = this.getSessionKey(sessionId);
    const ttl = this.calculateTTL(token.expiresAt);
    await this.redisClient.setex(key, ttl, JSON.stringify(session));
    
    // Add to user's active sessions
    await this.addToUserSessions(userId, sessionId);
    
    this.logger.info('Session created', { sessionId, userId });
    return session;
  }
  
  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return { isValid: false, reason: 'session_not_found' };
    }
    
    if (!session.isActive) {
      return { isValid: false, reason: 'session_inactive' };
    }
    
    if (new Date() > session.expiresAt) {
      await this.invalidateSession(sessionId);
      return { isValid: false, reason: 'session_expired' };
    }
    
    // Update last access time
    await this.updateLastAccess(sessionId);
    
    return {
      isValid: true,
      session,
      userId: session.userId
    };
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
    
    // Delete all sessions
    const pipeline = this.redisClient.pipeline();
    sessionIds.forEach(sessionId => {
      pipeline.del(this.getSessionKey(sessionId));
    });
    pipeline.del(userSessionsKey);
    await pipeline.exec();
    
    this.logger.info('All user sessions invalidated', { userId, count: sessionIds.length });
  }
}

// 2. Implement session cleanup job
class SessionCleanupJob {
  constructor(
    private readonly sessionManager: ISessionManager,
    private readonly logger: ILogger
  ) {}
  
  async runCleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    let cleaned = 0;
    
    try {
      // Clean expired sessions
      cleaned = await this.sessionManager.cleanupExpiredSessions();
      
      const duration = Date.now() - startTime;
      this.logger.info('Session cleanup completed', { cleaned, duration });
      
      return { success: true, cleaned, duration };
      
    } catch (error) {
      this.logger.error('Session cleanup failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
  
  scheduleRegularCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.runCleanup();
    }, 60 * 60 * 1000);
  }
}
```

#### **Acceptance Criteria**
- [ ] Redis-based session storage with configurable TTL
- [ ] Session validation with expiration checking
- [ ] User session management (view all, invalidate specific/all)
- [ ] Automatic session cleanup job for expired sessions
- [ ] Session metadata tracking (IP, user agent, timestamps)

---

## 📋 **Phase 3: Authorization & Security (Weeks 5-6)**

### **Task T-006: Role-Based Authorization** 👤
**Priority**: 🟡 **High**  
**Duration**: 1 week  
**Assignee**: Security Engineer  
**Dependencies**: T-004, T-005  

#### **Implementation Steps**
```typescript
// 1. Implement authorization service with RBAC and ABAC
class AuthorizationService implements IAuthorizationService {
  constructor(
    private readonly rolePermissions: IRolePermissionStore,
    private readonly userRepository: IUserRepository,
    private readonly logger: ILogger
  ) {}
  
  async authorizeAccess(userId: string, resource: string, action: string, context?: AuthzContext): Promise<AuthorizationResult> {
    try {
      // Get user with current role
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return this.denyAccess('user_not_found');
      }
      
      // Check basic role permissions
      const hasRolePermission = await this.checkRolePermission(user.role, resource, action);
      if (!hasRolePermission) {
        return this.denyAccess('insufficient_role_permissions');
      }
      
      // Apply attribute-based access control
      const contextualAccess = await this.checkContextualAccess(user, resource, action, context);
      if (!contextualAccess.allowed) {
        return this.denyAccess(contextualAccess.reason);
      }
      
      this.logger.info('Access authorized', { userId, resource, action });
      
      return {
        authorized: true,
        permissions: await this.getUserPermissions(user),
        context: contextualAccess.context
      };
      
    } catch (error) {
      this.logger.error('Authorization error', { userId, resource, action, error: error.message });
      return this.denyAccess('system_error');
    }
  }
  
  private async checkContextualAccess(user: User, resource: string, action: string, context?: AuthzContext): Promise<ContextualAccessResult> {
    switch (resource) {
      case 'craft-listing':
        return this.checkCraftListingAccess(user, action, context);
      case 'user-profile':
        return this.checkProfileAccess(user, action, context);
      case 'admin-panel':
        return this.checkAdminAccess(user, action, context);
      case 'order-management':
        return this.checkOrderAccess(user, action, context);
      default:
        return { allowed: true, context: {} };
    }
  }
  
  private async checkCraftListingAccess(user: User, action: string, context?: AuthzContext): Promise<ContextualAccessResult> {
    switch (action) {
      case 'create':
        // Only artisans can create listings
        if (user.role !== 'artisan') {
          return { allowed: false, reason: 'only_artisans_can_create_listings' };
        }
        // Check if artisan has verified profile
        const profile = await this.userRepository.getProfile(user.id);
        if (!profile?.verified) {
          return { allowed: false, reason: 'profile_not_verified' };
        }
        return { allowed: true, context: { verified: true } };
        
      case 'edit':
      case 'delete':
        // Can edit/delete own listings or admin can do anything
        if (user.role === 'admin') {
          return { allowed: true, context: { adminAccess: true } };
        }
        if (user.role === 'artisan' && context?.ownerId === user.id) {
          return { allowed: true, context: { ownerAccess: true } };
        }
        return { allowed: false, reason: 'not_owner_or_admin' };
        
      case 'view':
        // Anyone can view public listings
        return { allowed: true, context: { publicAccess: true } };
        
      default:
        return { allowed: false, reason: 'unknown_action' };
    }
  }
}

// 2. Implement role permission store
class RolePermissionStore implements IRolePermissionStore {
  private readonly rolePermissions: Map<UserRole, Permission[]> = new Map();
  
  constructor() {
    this.initializePermissions();
  }
  
  private initializePermissions(): void {
    // Customer permissions
    this.rolePermissions.set('customer', [
      { resource: 'craft-listing', actions: ['view', 'search'] },
      { resource: 'user-profile', actions: ['view', 'edit'] },
      { resource: 'order', actions: ['create', 'view'] },
      { resource: 'review', actions: ['create', 'view', 'edit'] },
      { resource: 'cart', actions: ['create', 'view', 'edit', 'delete'] }
    ]);
    
    // Artisan permissions
    this.rolePermissions.set('artisan', [
      { resource: 'craft-listing', actions: ['create', 'view', 'edit', 'delete', 'search'] },
      { resource: 'user-profile', actions: ['view', 'edit'] },
      { resource: 'order', actions: ['view', 'update'] },
      { resource: 'analytics', actions: ['view'] },
      { resource: 'inventory', actions: ['create', 'view', 'edit', 'delete'] }
    ]);
    
    // Admin permissions (inherits all)
    this.rolePermissions.set('admin', [
      { resource: '*', actions: ['*'] } // Admin has access to everything
    ]);
  }
  
  async getPermissions(role: UserRole): Promise<Permission[]> {
    return this.rolePermissions.get(role) || [];
  }
  
  async hasPermission(role: UserRole, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getPermissions(role);
    
    return permissions.some(permission => 
      (permission.resource === '*' || permission.resource === resource) &&
      (permission.actions.includes('*') || permission.actions.includes(action))
    );
  }
}
```

#### **Acceptance Criteria**
- [ ] Role-based access control (RBAC) with customer, artisan, and admin roles
- [ ] Attribute-based access control (ABAC) for resource-specific permissions
- [ ] Contextual authorization (own resources, verified profiles, etc.)
- [ ] Comprehensive permission system with inheritance
- [ ] Authorization audit logging for security monitoring

---

### **Task T-007: Rate Limiting & Security Middleware** 🛡️
**Priority**: 🟡 **High**  
**Duration**: 1 week  
**Assignee**: Security Engineer  
**Dependencies**: T-004  

#### **Implementation Steps**
```typescript
// 1. Implement comprehensive rate limiting
class RateLimiter implements IRateLimiter {
  constructor(
    private readonly redisClient: Redis,
    private readonly logger: ILogger
  ) {}
  
  async checkAuthenticationRateLimit(ipAddress: string, email?: string): Promise<void> {
    // Rate limit by IP address (5 attempts per 15 minutes)
    const ipKey = `rate_limit:auth:ip:${ipAddress}`;
    const ipCount = await this.incrementCounter(ipKey, 15 * 60); // 15 minutes
    
    if (ipCount > 5) {
      this.logger.warn('IP rate limit exceeded', { ipAddress, attempts: ipCount });
      throw new RateLimitError('Too many authentication attempts from this IP', {
        retryAfter: 900, // 15 minutes
        type: 'ip_limit'
      });
    }
    
    // Rate limit by email (3 attempts per 15 minutes)
    if (email) {
      const emailKey = `rate_limit:auth:email:${email}`;
      const emailCount = await this.incrementCounter(emailKey, 15 * 60);
      
      if (emailCount > 3) {
        this.logger.warn('Email rate limit exceeded', { email, attempts: emailCount });
        throw new RateLimitError('Too many authentication attempts for this account', {
          retryAfter: 900,
          type: 'email_limit'
        });
      }
    }
  }
  
  async checkAPIRateLimit(userId: string, endpoint: string): Promise<void> {
    // General API rate limiting (100 requests per hour per user)
    const key = `rate_limit:api:${userId}:${endpoint}`;
    const count = await this.incrementCounter(key, 60 * 60); // 1 hour
    
    if (count > 100) {
      this.logger.warn('API rate limit exceeded', { userId, endpoint, requests: count });
      throw new RateLimitError('API rate limit exceeded', {
        retryAfter: 3600,
        type: 'api_limit'
      });
    }
  }
  
  private async incrementCounter(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redisClient.incr(key);
    
    if (count === 1) {
      await this.redisClient.expire(key, ttlSeconds);
    }
    
    return count;
  }
}

// 2. Implement security middleware
class SecurityMiddleware {
  constructor(
    private readonly rateLimiter: IRateLimiter,
    private readonly tokenValidator: ITokenValidator,
    private readonly sessionManager: ISessionManager,
    private readonly logger: ILogger
  ) {}
  
  securityHeaders(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      // HTTPS enforcement
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // XSS protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Content type sniffing protection
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Referrer policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self';"
      );
      
      next();
    };
  }
  
  authenticationRateLimit(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientIP = this.getClientIP(req);
        const email = req.body?.email;
        
        await this.rateLimiter.checkAuthenticationRateLimit(clientIP, email);
        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: error.message,
            retryAfter: error.retryAfter,
            type: error.type
          });
        }
        next(error);
      }
    };
  }
  
  jwtAuthentication(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({ 
            error: 'Authentication required',
            message: 'No token provided' 
          });
        }
        
        // Validate token
        const validationResult = await this.tokenValidator.validateToken(token);
        if (!validationResult.isValid) {
          return res.status(401).json({
            error: 'Invalid token',
            message: validationResult.error
          });
        }
        
        // Validate session
        const sessionResult = await this.sessionManager.validateSession(validationResult.claims.jti);
        if (!sessionResult.isValid) {
          return res.status(401).json({
            error: 'Invalid session',
            message: sessionResult.reason
          });
        }
        
        // Add user info to request
        req.user = {
          id: validationResult.userId,
          role: validationResult.role,
          claims: validationResult.claims,
          session: sessionResult.session
        };
        
        next();
        
      } catch (error) {
        this.logger.error('Authentication middleware error', { error: error.message });
        return res.status(500).json({ 
          error: 'Authentication error',
          message: 'Internal server error' 
        });
      }
    };
  }
  
  requireRole(allowedRoles: UserRole[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        this.logger.warn('Insufficient permissions', { 
          userId: req.user.id, 
          userRole: req.user.role, 
          requiredRoles: allowedRoles 
        });
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `Requires one of: ${allowedRoles.join(', ')}` 
        });
      }
      
      next();
    };
  }
  
  private getClientIP(req: Request): string {
    return req.headers['x-forwarded-for'] as string || 
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           'unknown';
  }
  
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check for token in cookies (for web app)
    return req.cookies?.token || null;
  }
}
```

#### **Acceptance Criteria**
- [ ] Comprehensive rate limiting (IP: 5/15min, email: 3/15min, API: 100/hour)
- [ ] Security headers middleware (HSTS, CSP, XSS protection, etc.)
- [ ] JWT authentication middleware with session validation
- [ ] Role-based authorization middleware
- [ ] Request logging and security event monitoring

---

## 📋 **Phase 4: Integration & Testing (Weeks 7-8)**

### **Task T-008: API Routes & Controllers** 🌐
**Priority**: 🟡 **High**  
**Duration**: 1 week  
**Assignee**: API Developer  
**Dependencies**: T-004, T-005, T-006, T-007  

#### **Implementation Steps**
```typescript
// 1. Implement authentication controller
class AuthController {
  constructor(
    private readonly authService: IAuthenticationService,
    private readonly authzService: IAuthorizationService,
    private readonly sessionManager: ISessionManager,
    private readonly logger: ILogger
  ) {}
  
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      // Validate input
      const validation = this.validateRegistrationInput(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }
      
      const result = await this.authService.registerUser({
        email,
        password,
        firstName,
        lastName,
        role: role || 'customer'
      });
      
      res.status(201).json({
        message: 'Registration successful',
        userId: result.userId,
        emailVerificationSent: result.emailVerificationSent
      });
      
    } catch (error) {
      if (error instanceof RegistrationError) {
        return res.status(409).json({
          error: 'Registration failed',
          message: error.message
        });
      }
      next(error);
    }
  }
  
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;
      const context = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown'
      };
      
      const result = await this.authService.authenticateUser(
        { email, password },
        context
      );
      
      // Set secure cookie if remember me
      if (rememberMe) {
        res.cookie('token', result.token.signature, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
      }
      
      res.status(200).json({
        message: 'Login successful',
        token: result.token.signature,
        user: this.sanitizeUser(result.user),
        expiresAt: result.expiresAt.toISOString()
      });
      
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: error.message
        });
      }
      if (error instanceof RateLimitError) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: error.message,
          retryAfter: error.retryAfter
        });
      }
      next(error);
    }
  }
  
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { user } = req;
      const sessionId = user.session.id;
      
      // Invalidate session
      await this.sessionManager.invalidateSession(sessionId);
      
      // Clear cookie
      res.clearCookie('token');
      
      res.status(200).json({
        message: 'Logout successful'
      });
      
    } catch (error) {
      this.logger.error('Logout error', { error: error.message });
      res.status(500).json({
        error: 'Logout failed',
        message: 'Internal server error'
      });
    }
  }
  
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const { user } = req;
      
      // Get user permissions
      const permissions = await this.authzService.getUserPermissions(user.id);
      
      res.status(200).json({
        user: this.sanitizeUser(user),
        permissions: permissions.map(p => `${p.resource}:${p.actions.join(',')}`),
        session: {
          id: user.session.id,
          expiresAt: user.session.expiresAt
        }
      });
      
    } catch (error) {
      this.logger.error('Get current user error', { error: error.message });
      res.status(500).json({
        error: 'Failed to get user info',
        message: 'Internal server error'
      });
    }
  }
  
  private sanitizeUser(user: any): any {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
  
  private validateRegistrationInput(data: any): ValidationResult {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().min(1).max(50).required(),
      lastName: Joi.string().min(1).max(50).required(),
      role: Joi.string().valid('customer', 'artisan').default('customer')
    });
    
    const { error } = schema.validate(data);
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }
    
    return { isValid: true };
  }
}

// 2. Configure routes with middleware
class AuthRoutes {
  constructor(
    private readonly authController: AuthController,
    private readonly securityMiddleware: SecurityMiddleware
  ) {}
  
  configureRoutes(app: Express): void {
    const router = Router();
    
    // Apply security headers to all routes
    router.use(this.securityMiddleware.securityHeaders());
    
    // Public routes with rate limiting
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
    
    // Protected routes
    router.post('/logout',
      this.securityMiddleware.jwtAuthentication(),
      this.authController.logout.bind(this.authController)
    );
    
    router.get('/me',
      this.securityMiddleware.jwtAuthentication(),
      this.authController.getCurrentUser.bind(this.authController)
    );
    
    router.post('/change-password',
      this.securityMiddleware.jwtAuthentication(),
      this.authController.changePassword.bind(this.authController)
    );
    
    // Admin-only routes
    router.get('/users',
      this.securityMiddleware.jwtAuthentication(),
      this.securityMiddleware.requireRole(['admin']),
      this.authController.getUsers.bind(this.authController)
    );
    
    app.use('/api/auth', router);
  }
}
```

#### **Acceptance Criteria**
- [ ] Complete REST API for authentication (register, login, logout, etc.)
- [ ] Proper HTTP status codes and error handling
- [ ] Input validation with detailed error messages
- [ ] Security middleware integration
- [ ] Comprehensive API documentation with examples

---

### **Task T-009: Comprehensive Testing Suite** 🧪
**Priority**: 🟡 **High**  
**Duration**: 1 week  
**Assignee**: QA Engineer  
**Dependencies**: All previous tasks  

#### **Implementation Steps**
```typescript
// 1. Unit tests for core components
describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordHasher: jest.Mocked<IPasswordHasher>;
  let mockTokenGenerator: jest.Mocked<ITokenGenerator>;
  
  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockPasswordHasher = createMockPasswordHasher();
    mockTokenGenerator = createMockTokenGenerator();
    
    authService = new AuthenticationService(
      mockUserRepository,
      mockPasswordHasher,
      mockTokenGenerator,
      mockSessionManager,
      mockAuditLogger,
      mockRateLimiter
    );
  });
  
  describe('authenticateUser', () => {
    it('should authenticate valid user credentials', async () => {
      // Arrange
      const credentials = { email: 'test@example.com', password: 'ValidPass123!' };
      const mockUser = createMockUser({ email: credentials.email, emailVerified: true });
      const mockToken = createMockToken();
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUser.verifyPassword = jest.fn().mockResolvedValue(true);
      mockTokenGenerator.generateToken.mockResolvedValue(mockToken);
      
      // Act
      const result = await authService.authenticateUser(credentials, mockContext);
      
      // Assert
      expect(result.user).toBe(mockUser);
      expect(result.token).toBe(mockToken);
      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));
    });
    
    it('should throw AuthenticationError for invalid credentials', async () => {
      // Arrange
      const credentials = { email: 'test@example.com', password: 'WrongPassword' };
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      // Act & Assert
      await expect(authService.authenticateUser(credentials, mockContext))
        .rejects.toThrow(AuthenticationError);
    });
    
    it('should handle rate limiting', async () => {
      // Arrange
      mockRateLimiter.checkAuthenticationRateLimit.mockRejectedValue(
        new RateLimitError('Rate limit exceeded')
      );
      
      // Act & Assert
      await expect(authService.authenticateUser(mockCredentials, mockContext))
        .rejects.toThrow(RateLimitError);
    });
  });
});

// 2. Integration tests
describe('Authentication API Integration', () => {
  let app: Express;
  let testDb: TestDatabase;
  let redisClient: Redis;
  
  beforeAll(async () => {
    testDb = await createTestDatabase();
    redisClient = createTestRedisClient();
    app = createTestApp(testDb, redisClient);
  });
  
  afterAll(async () => {
    await testDb.cleanup();
    await redisClient.quit();
  });
  
  beforeEach(async () => {
    await testDb.clear();
    await redisClient.flushall();
  });
  
  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body).toMatchObject({
        message: 'Registration successful',
        userId: expect.any(String),
        emailVerificationSent: true
      });
      
      // Verify user was created in database
      const user = await testDb.findUserByEmail(userData.email);
      expect(user).toBeTruthy();
      expect(user.emailVerified).toBe(false);
    });
    
    it('should reject duplicate email registration', async () => {
      // Create existing user
      await testDb.createUser({ email: 'test@example.com' });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(409);
      
      expect(response.body.error).toBe('Registration failed');
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create verified user
      const user = await testDb.createVerifiedUser({
        email: 'test@example.com',
        password: 'ValidPass123!'
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!'
        })
        .expect(200);
      
      expect(response.body).toMatchObject({
        message: 'Login successful',
        token: expect.any(String),
        user: expect.objectContaining({
          id: user.id,
          email: user.email
        }),
        expiresAt: expect.any(String)
      });
    });
    
    it('should enforce rate limiting', async () => {
      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword'
          });
      }
      
      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(429);
      
      expect(response.body.error).toBe('Rate limit exceeded');
    });
  });
});

// 3. Security tests
describe('Authentication Security', () => {
  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',
        '12345678',
        'abc123',
        'Password1' // Missing special character
      ];
      
      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password,
            firstName: 'John',
            lastName: 'Doe'
          })
          .expect(400);
        
        expect(response.body.error).toBe('Validation failed');
      }
    });
    
    it('should use secure password hashing', async () => {
      const password = 'ValidPass123!';
      const hasher = new PasswordHasher();
      
      const hash1 = await hasher.hashPassword(password);
      const hash2 = await hasher.hashPassword(password);
      
      // Hashes should be different (due to salt)
      expect(hash1.value).not.toBe(hash2.value);
      
      // Both should verify correctly
      expect(await hasher.verifyPassword(password, hash1)).toBe(true);
      expect(await hasher.verifyPassword(password, hash2)).toBe(true);
    });
  });
  
  describe('JWT Security', () => {
    it('should use RS256 algorithm', () => {
      const tokenService = new JWTTokenService(privateKey, publicKey, 'test-issuer', mockBlacklist);
      
      // Verify algorithm in token header
      const token = jwt.sign({ test: true }, privateKey, { algorithm: 'RS256' });
      const decoded = jwt.decode(token, { complete: true });
      
      expect(decoded.header.alg).toBe('RS256');
    });
    
    it('should reject tampered tokens', async () => {
      const tokenService = new JWTTokenService(privateKey, publicKey, 'test-issuer', mockBlacklist);
      
      // Create valid token
      const validToken = await tokenService.generateToken({
        userId: 'user123',
        role: 'customer',
        email: 'test@example.com'
      });
      
      // Tamper with token
      const tamperedToken = validToken.signature.replace(/.$/, 'X');
      
      // Should reject tampered token
      const result = await tokenService.validateToken(tamperedToken);
      expect(result.isValid).toBe(false);
    });
  });
});

// 4. Performance tests
describe('Authentication Performance', () => {
  it('should handle concurrent authentication requests', async () => {
    const concurrentRequests = 100;
    const user = await testDb.createVerifiedUser({
      email: 'test@example.com',
      password: 'ValidPass123!'
    });
    
    const startTime = Date.now();
    
    const promises = Array(concurrentRequests).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!'
        })
    );
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Should complete within reasonable time (< 5 seconds)
    expect(endTime - startTime).toBeLessThan(5000);
  });
  
  it('should meet password hashing performance requirements', async () => {
    const hasher = new PasswordHasher();
    const password = 'TestPassword123!';
    
    const startTime = Date.now();
    await hasher.hashPassword(password);
    const endTime = Date.now();
    
    // Should complete within 200ms
    expect(endTime - startTime).toBeLessThan(200);
  });
});
```

#### **Acceptance Criteria**
- [ ] >95% unit test coverage for all authentication components
- [ ] Complete integration tests for all API endpoints
- [ ] Security tests for password hashing, JWT tokens, and rate limiting
- [ ] Performance tests meeting latency and throughput requirements
- [ ] Automated test execution in CI/CD pipeline

---

## 🎯 **Success Criteria & Validation**

### **Implementation Success Metrics** 📊

| Category | Metric | Target | Validation Method |
|----------|---------|---------|------------------|
| **Security** | Password hashing | bcrypt, salt ≥12 | Security audit |
| **Performance** | Auth latency | <500ms | Load testing |
| **Reliability** | Success rate | >99.5% | Monitoring |
| **Quality** | Test coverage | >95% | Automated reports |
| **Compliance** | OWASP Top 10 | 100% | Security scanning |

### **Final Validation Checklist** ✅

#### **Functional Validation**
- [ ] User registration with email verification
- [ ] Secure login with JWT token generation
- [ ] Role-based authorization working correctly
- [ ] Session management with Redis
- [ ] Password reset functionality
- [ ] Rate limiting preventing brute force
- [ ] Comprehensive audit logging

#### **Security Validation**
- [ ] bcrypt password hashing with salt rounds ≥12
- [ ] RS256 JWT tokens with proper key management
- [ ] Rate limiting (5 auth attempts per 15 min per IP)
- [ ] Security headers (HSTS, CSP, XSS protection)
- [ ] Input validation preventing injection attacks
- [ ] Token blacklisting for revocation
- [ ] Session security with secure cookies

#### **Performance Validation**
- [ ] Authentication latency <500ms (95th percentile)
- [ ] Password hashing time <200ms
- [ ] JWT token validation <100ms
- [ ] Support 1000+ concurrent auth requests
- [ ] Session cleanup performance optimized

#### **Integration Validation**
- [ ] Database integration with PostgreSQL
- [ ] Redis integration for sessions and rate limiting
- [ ] Email service integration for verification
- [ ] Monitoring and logging integration
- [ ] API documentation complete and accurate

---

## 🚀 **Deployment Preparation**

### **Production Readiness Checklist** 📋

#### **Security Configuration**
- [ ] Generate production RSA key pairs (2048-bit minimum)
- [ ] Configure secure environment variables
- [ ] Set up SSL certificates and HTTPS enforcement
- [ ] Configure firewall and security groups
- [ ] Set up monitoring and alerting for security events

#### **Database Setup**
- [ ] PostgreSQL production database with backups
- [ ] Redis cluster for high availability
- [ ] Database migration scripts tested
- [ ] Connection pooling configured
- [ ] Performance monitoring enabled

#### **Monitoring & Alerting**
- [ ] Application performance monitoring (APM)
- [ ] Security event monitoring and SIEM integration
- [ ] Health check endpoints configured
- [ ] Error tracking and notification setup
- [ ] Performance dashboards and alerts

#### **Documentation**
- [ ] API documentation with examples
- [ ] Security documentation and procedures
- [ ] Deployment and configuration guide
- [ ] Troubleshooting and maintenance procedures
- [ ] User training materials

---

*Authentication System Implementation Tasks*  
**Status**: 🟢 **Ready for Execution**  
**Total Duration**: 8 weeks (4 phases)  
**Security-First**: OWASP compliance and comprehensive security measures  
**Production-Ready**: Complete testing, monitoring, and deployment preparation  

**Let's build secure, scalable authentication!** 🔐🚀⚡