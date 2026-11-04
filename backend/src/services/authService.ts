import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export interface AdminSession {
  token: string;
  username: string;
  role: 'administrator';
  createdAt: number;
  expiresAt: number;
}

export interface AdminUserRecord {
  username: string;
  passwordHash: string;
  updatedAt: string;
}

class AuthService {
  private adminUser: AdminUserRecord;
  private activeSessions: Map<string, AdminSession> = new Map();
  private secretKey: string;
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.secretKey = process.env.AUTH_SECRET || process.env.ADMIN_SECRET || 'edupulse-auth-secret-key-2026';

    const defaultUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const defaultPassword = process.env.ADMIN_PASSWORD?.trim() || 'Admin@EduPulse2026!';

    // Compute strong bcrypt hash at startup. Never store plain text password.
    const saltRounds = 10;
    const initialHash = bcrypt.hashSync(defaultPassword, saltRounds);

    this.adminUser = {
      username: defaultUsername,
      passwordHash: initialHash,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify provided administrator credentials using bcrypt constant-time comparison
   */
  public verifyCredentials(username: string, password: string): boolean {
    if (!username || !password) return false;
    if (username.trim().toLowerCase() !== this.adminUser.username.toLowerCase()) {
      return false;
    }
    return bcrypt.compareSync(password, this.adminUser.passwordHash);
  }

  /**
   * Create a new secure session token
   */
  public createSession(username: string): AdminSession {
    const rawId = crypto.randomBytes(32).toString('hex');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${username}:${rawId}`)
      .digest('hex');
    const token = `${rawId}.${signature}`;

    const now = Date.now();
    const session: AdminSession = {
      token,
      username,
      role: 'administrator',
      createdAt: now,
      expiresAt: now + this.SESSION_DURATION_MS,
    };

    this.activeSessions.set(token, session);
    return session;
  }

  /**
   * Validate session token from Authorization: Bearer <token>
   */
  public validateToken(token?: string | null): AdminSession | null {
    if (!token || typeof token !== 'string') return null;

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    if (!cleanToken) return null;

    const session = this.activeSessions.get(cleanToken);
    if (!session) return null;

    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(cleanToken);
      return null;
    }

    return session;
  }

  /**
   * Destroy an active session (logout)
   */
  public destroySession(token?: string | null): boolean {
    if (!token) return false;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    return this.activeSessions.delete(cleanToken);
  }

  /**
   * Update administrator password securely
   */
  public updatePassword(oldPassword: string, newPassword: string): { success: boolean; message: string } {
    if (!this.verifyCredentials(this.adminUser.username, oldPassword)) {
      return { success: false, message: 'Current administrator password is incorrect.' };
    }
    if (!newPassword || newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters long.' };
    }

    this.adminUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    this.adminUser.updatedAt = new Date().toISOString();

    // Invalidate all existing sessions on password change for security
    this.activeSessions.clear();

    return { success: true, message: 'Administrator password updated successfully.' };
  }

  /**
   * Safe status object for frontend setup assistance without exposing secrets
   */
  public getStatus() {
    return {
      username: this.adminUser.username,
      activeSessionsCount: this.activeSessions.size,
      hasCustomPasswordEnv: Boolean(process.env.ADMIN_PASSWORD),
      defaultDemoHint: !process.env.ADMIN_PASSWORD ? 'Admin@EduPulse2026!' : undefined,
    };
  }
}

export const authService = new AuthService();
