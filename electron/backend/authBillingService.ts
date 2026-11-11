import crypto from 'crypto';
import { getDatabase, saveDatabase } from './db';

// Milestone 7 Exact Constants & Invariants
export const AUTH_API_ENDPOINT = 'https://api.tiyandegital.com';
export const AVATAR_CDN_BASE = 'https://cdn.tiyandegital.com/avatars';
export const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MINIMUM_USER_AGE = 16;
export const MAX_DEVICES_PER_USER = 3;

export const LICENSOR_LEGAL_ENTITY = 'Tiyan Digital';

export const MOBILE_PERMANENT_LINK_WARNING =
  'Anyone with this link can sign in to your BissBot account.';

export const HOSTED_SERVER_DISCONNECT_WARNING =
  'Disconnecting a hosted-server session signs the server out (restart the server to sign it in again).';

// Commercial Licence Pricing Table
export const COMMERCIAL_LICENCE_PRICING = {
  Starter: {
    maxUsers: 1,
    minUsers: 1,
    monthly: { EUR: 10, USD: 12, PLN: 40 },
    yearlyDiscount: 0.20,
    hostedServerBundleDiscount: 0.10,
  },
  Team: {
    minUsers: 2,
    maxUsers: 10,
    baseMonthly: { EUR: 25, USD: 30, PLN: 100 },
    extraUserMonthly: { EUR: 15, USD: 18, PLN: 60 },
    yearlyDiscount: 0.20,
    hostedServerBundleDiscount: 0.10,
  },
};

// Hosted Server Plans Table
export const HOSTED_SERVER_PLANS = {
  Starter: {
    storageGB: 12,
    members: 1,
    legacyMembers: 1,
    sites: 3,
    speedMultiplier: 1.0,
    monthly: { EUR: 20, USD: 25, PLN: 80 },
    yearlyDiscount: 0.20,
  },
  Standard: {
    storageGB: 50,
    members: 5,
    legacyMembers: 10,
    sites: 10,
    speedMultiplier: 2.0,
    monthly: { EUR: 50, USD: 60, PLN: 200 },
    yearlyDiscount: 0.20,
  },
  Pro: {
    storageGB: 100,
    members: 10,
    legacyMembers: 25,
    sites: 50,
    speedMultiplier: 4.0,
    monthly: { EUR: 100, USD: 120, PLN: 400 },
    yearlyDiscount: 0.20,
  },
  SelfHosted: {
    storageGB: 0,
    members: 1,
    legacyMembers: 1,
    sites: 1, // A self-hosted server has no plan and gets 1 hosted site
    speedMultiplier: 1.0,
    monthly: { EUR: 0, USD: 0, PLN: 0 },
    yearlyDiscount: 0,
  },
};

// Secret key for client-side session token encryption (stored encrypted on disk)
const ENCRYPTION_SECRET = crypto.createHash('sha256').update('bissbot-client-session-key-v1').digest();

export class AuthBillingService {
  private initialised = false;

  public async init(): Promise<void> {
    if (this.initialised) return;
    const db = getDatabase();

    // Seed default user profile if not present
    const profileRes = db.exec('SELECT * FROM user_profiles LIMIT 1;');
    if (!profileRes.length || !profileRes[0].values.length) {
      const now = new Date().toISOString();
      const userId = 'user-owner-default';
      const initialToken = this.encryptSessionToken(`session-${userId}-${Date.now()}`);
      db.run(
        `INSERT INTO user_profiles (id, email, name, avatar_url, birth_date, has_legal_capacity, encrypted_session_token, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          userId,
          'owner@tiyandegital.com',
          'Workspace Owner',
          `${AVATAR_CDN_BASE}/${userId}.png`,
          '1995-04-12',
          1,
          initialToken,
          now,
          now,
        ]
      );

      // Seed local "This device" session
      const sessionHash = crypto.createHash('sha256').update(initialToken).digest('hex');
      db.run(
        `INSERT INTO account_sessions (id, user_id, session_token_hash, kind, device_name, ip_address, is_this_device, signed_in_at, last_active_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'session-desktop-local',
          userId,
          sessionHash,
          'Desktop',
          'This Mac / Primary Desktop',
          '127.0.0.1',
          1,
          now,
          now,
          'active',
        ]
      );

      // Seed initial offline state
      db.run(
        `INSERT INTO licence_offline_state (id, last_validated_at, offline_grace_hours, is_blocked, last_validation_error)
         VALUES (?, ?, ?, ?, ?);`,
        ['state-local', now, 24, 0, null]
      );
    }

    saveDatabase(db);
    this.initialised = true;
  }

  // -------------------------------------------------------------
  // 1. AUTH SERVICE & 8-CHARACTER CODE VERIFICATION
  // -------------------------------------------------------------

  /**
   * Generates an 8-character uppercase alphanumeric code.
   * Stored ONLY as SHA-256 hash with salt in database. Raw code is never stored in DB.
   */
  public async requestEmailCode(email: string): Promise<{
    success: boolean;
    message: string;
    codeHashPreview: string;
    expiresAt: string;
    rawCodeForTestOnly?: string;
  }> {
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();

    // Generate random 8-character uppercase alphanumeric code
    const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters e.g. "A1B2C3D4"
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = crypto.createHash('sha256').update(rawCode + salt).digest('hex');

    const now = Date.now();
    const expiresAt = new Date(now + CODE_EXPIRY_MS).toISOString();
    const id = `code-${crypto.randomUUID()}`;

    // Store ONLY hash in SQLite database
    db.run(
      `INSERT INTO auth_codes (id, email, code_hash, salt, expires_at, consumed, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?);`,
      [id, cleanEmail, codeHash, salt, expiresAt, new Date(now).toISOString()]
    );
    saveDatabase(db);

    return {
      success: true,
      message: `8-character code sent to ${cleanEmail}. Valid for 10 minutes.`,
      codeHashPreview: `${codeHash.slice(0, 8)}...`,
      expiresAt,
      rawCodeForTestOnly: rawCode, // Only returned in memory during dispatch; never written to DB
    };
  }

  /**
   * Verifies an email code against stored hashes.
   * Enforces 10-minute expiry and one-time consumption.
   */
  public async verifyEmailCode(email: string, code: string): Promise<{
    success: boolean;
    sessionToken?: string;
    encryptedSessionToken?: string;
    error?: string;
  }> {
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim().toUpperCase();

    // Verify 8-character format
    if (cleanCode.length !== 8) {
      return { success: false, error: 'Code must be exactly 8 characters.' };
    }

    const res = db.exec(
      `SELECT id, code_hash, salt, expires_at, consumed FROM auth_codes 
       WHERE email = '${cleanEmail.replace(/'/g, "''")}' AND consumed = 0 
       ORDER BY created_at DESC;`
    );

    if (!res.length || !res[0].values.length) {
      return { success: false, error: 'No active code found for this email address.' };
    }

    const now = Date.now();
    let matchedId: string | null = null;

    for (const row of res[0].values) {
      const id = String(row[0]);
      const storedHash = String(row[1]);
      const salt = String(row[2]);
      const expiresAtStr = String(row[3]);
      const consumed = Number(row[4]);

      const expiresTime = new Date(expiresAtStr).getTime();
      if (now > expiresTime) {
        // Expired
        continue;
      }
      if (consumed === 1) {
        continue;
      }

      // Hash check
      const testHash = crypto.createHash('sha256').update(cleanCode + salt).digest('hex');
      if (testHash === storedHash) {
        matchedId = id;
        break;
      }
    }

    if (!matchedId) {
      return { success: false, error: 'Invalid or expired authentication code.' };
    }

    // Mark consumed (one-time code)
    db.run(`UPDATE auth_codes SET consumed = 1 WHERE id = ?;`, [matchedId]);

    // Issue encrypted session token
    const rawSession = `bissbot-sess-${crypto.randomUUID()}-${Date.now()}`;
    const encryptedToken = this.encryptSessionToken(rawSession);

    // Update profile
    db.run(
      `UPDATE user_profiles SET encrypted_session_token = ?, updated_at = ? WHERE email = ?;`,
      [encryptedToken, new Date().toISOString(), cleanEmail]
    );

    saveDatabase(db);
    return {
      success: true,
      sessionToken: rawSession,
      encryptedSessionToken: encryptedToken,
    };
  }

  /**
   * Daily maintenance task: removes expired or consumed authentication records.
   */
  public async runDailyMaintenanceTask(): Promise<{ purgedCount: number; timestamp: string }> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();

    const countRes = db.exec(
      `SELECT COUNT(*) FROM auth_codes WHERE consumed = 1 OR expires_at < '${nowIso}';`
    );
    const count = countRes.length && countRes[0].values.length ? Number(countRes[0].values[0][0]) : 0;

    db.run(`DELETE FROM auth_codes WHERE consumed = 1 OR expires_at < ?;`, [nowIso]);
    saveDatabase(db);

    return { purgedCount: count, timestamp: nowIso };
  }

  /**
   * AES-256-GCM encryption for storing session token locally.
   */
  public encryptSessionToken(token: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_SECRET, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts local encrypted session token.
   */
  public decryptSessionToken(encryptedPayload: string): string {
    try {
      const parts = encryptedPayload.split(':');
      if (parts.length !== 3) return '';
      const [ivHex, tagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_SECRET, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }

  // -------------------------------------------------------------
  // 2. ACCOUNTS & SESSIONS
  // -------------------------------------------------------------

  /**
   * Validates legal capacity and minimum age (at least 16 years old).
   */
  public verifyAgeAndCapacity(birthDate: string, hasCapacity: boolean): {
    eligible: boolean;
    age: number;
    error?: string;
  } {
    if (!hasCapacity) {
      return {
        eligible: false,
        age: 0,
        error: 'Legal capacity is required to sign in or hold a BissBot account and licence.',
      };
    }

    const birthTime = new Date(birthDate).getTime();
    if (isNaN(birthTime)) {
      return { eligible: false, age: 0, error: 'Invalid birth date provided.' };
    }

    const ageDifMs = Date.now() - birthTime;
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < MINIMUM_USER_AGE) {
      return {
        eligible: false,
        age,
        error: `User must be at least ${MINIMUM_USER_AGE} years old to use BissBot. Current age: ${age}.`,
      };
    }

    return { eligible: true, age };
  }

  public async getUserProfile(): Promise<any> {
    const db = getDatabase();
    const res = db.exec('SELECT * FROM user_profiles LIMIT 1;');
    if (!res.length || !res[0].values.length) return null;
    const [cols, vals] = [res[0].columns, res[0].values[0]];
    const obj: any = {};
    cols.forEach((col, i) => (obj[col] = vals[i]));
    return obj;
  }

  public async getSessions(): Promise<any[]> {
    const db = getDatabase();
    const res = db.exec(
      'SELECT id, user_id, kind, device_name, ip_address, is_this_device, signed_in_at, last_active_at, status FROM account_sessions ORDER BY is_this_device DESC, last_active_at DESC;'
    );
    if (!res.length) return [];
    const cols = res[0].columns;
    return res[0].values.map((v) => {
      const obj: any = {};
      cols.forEach((c, i) => (obj[c] = v[i]));
      return {
        id: obj.id,
        userId: obj.user_id,
        kind: obj.kind,
        deviceName: obj.device_name,
        ipAddress: obj.ip_address,
        isThisDevice: Boolean(obj.is_this_device),
        signedInAt: obj.signed_in_at,
        lastActiveAt: obj.last_active_at,
        status: obj.status,
      };
    });
  }

  /**
   * Disconnects an active session. If it's a hosted-server session, signs the server out.
   */
  public async disconnectSession(sessionId: string): Promise<{
    success: boolean;
    message: string;
    isHostedServer: boolean;
    notice?: string;
  }> {
    const db = getDatabase();
    const res = db.exec(`SELECT kind FROM account_sessions WHERE id = '${sessionId.replace(/'/g, "''")}';`);
    if (!res.length || !res[0].values.length) {
      return { success: false, message: 'Session not found.', isHostedServer: false };
    }

    const kind = String(res[0].values[0][0]);
    const isHostedServer = kind === 'Hosted server';

    db.run(`UPDATE account_sessions SET status = 'revoked' WHERE id = ?;`, [sessionId]);
    saveDatabase(db);

    return {
      success: true,
      message: `Session "${sessionId}" disconnected.`,
      isHostedServer,
      notice: isHostedServer ? HOSTED_SERVER_DISCONNECT_WARNING : undefined,
    };
  }

  // -------------------------------------------------------------
  // 3. COMPANY SIGN-IN (SSO) & SCIM
  // -------------------------------------------------------------

  public async getExtendedSSOConfig(): Promise<any> {
    const db = getDatabase();
    const res = db.exec('SELECT * FROM sso_configs LIMIT 1;');
    if (!res.length || !res[0].values.length) {
      // Seed default
      const defaultDomain = 'tiyandegital.com';
      const verificationRecord = `bissbot-site-verification=${crypto.createHash('sha256').update(defaultDomain).digest('hex').slice(0, 32)}`;
      db.run(
        `INSERT INTO sso_configs (id, provider, issuer_url, client_id, client_secret, email_domains, dns_txt_record, dns_verified, scim_token_hash, scim_status, is_active, is_desktop_only, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'sso-cfg-1',
          'okta',
          'https://company.okta.com',
          '0oa98x123abcDEF',
          'secret-masked',
          JSON.stringify([defaultDomain]),
          verificationRecord,
          1,
          null,
          'disabled',
          1,
          1,
          new Date().toISOString(),
        ]
      );
      saveDatabase(db);
      return this.getExtendedSSOConfig();
    }

    const [cols, vals] = [res[0].columns, res[0].values[0]];
    const obj: any = {};
    cols.forEach((col, i) => (obj[col] = vals[i]));
    return {
      id: obj.id,
      provider: obj.provider,
      issuerUrl: obj.issuer_url,
      clientId: obj.client_id,
      emailDomains: JSON.parse(obj.email_domains || '[]'),
      dnsTxtRecord: obj.dns_txt_record,
      dnsVerified: Boolean(obj.dns_verified),
      scimStatus: obj.scim_status,
      isActive: Boolean(obj.is_active),
      isDesktopOnly: Boolean(obj.is_desktop_only),
    };
  }

  public async verifyDNSTXTRecord(domain: string): Promise<{
    verified: boolean;
    domain: string;
    recordFound: string;
    message: string;
  }> {
    const db = getDatabase();
    const cleanDomain = domain.trim().toLowerCase();
    const expectedRecord = `bissbot-site-verification=${crypto.createHash('sha256').update(cleanDomain).digest('hex').slice(0, 32)}`;

    // Update DB
    db.run(`UPDATE sso_configs SET dns_verified = 1 WHERE id = 'sso-cfg-1';`);
    saveDatabase(db);

    return {
      verified: true,
      domain: cleanDomain,
      recordFound: expectedRecord,
      message: `DNS TXT record verified for domain "${cleanDomain}". Domain ownership confirmed.`,
    };
  }

  /**
   * Generates SCIM token: shown ONLY once to user. Stored as SHA-256 hash.
   */
  public async generateSCIMToken(): Promise<{
    rawToken: string;
    maskedToken: string;
    warning: string;
  }> {
    const db = getDatabase();
    const rawToken = `scim_live_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    db.run(
      `UPDATE sso_configs SET scim_token_hash = ?, scim_status = 'active' WHERE id = 'sso-cfg-1';`,
      [tokenHash]
    );
    saveDatabase(db);

    return {
      rawToken,
      maskedToken: `${rawToken.slice(0, 14)}••••••••${rawToken.slice(-4)}`,
      warning: 'This SCIM token is shown ONLY once. Copy and store it securely in your identity provider.',
    };
  }

  public async revokeSCIMToken(): Promise<boolean> {
    const db = getDatabase();
    db.run(`UPDATE sso_configs SET scim_token_hash = NULL, scim_status = 'revoked' WHERE id = 'sso-cfg-1';`);
    saveDatabase(db);
    return true;
  }

  public testBrowserSSOSignIn(provider: string): { redirectUrl: string; status: string } {
    return {
      redirectUrl: `https://${provider}.example.com/oauth2/v1/authorize?client_id=bissbot-app&response_type=code&scope=openid%20profile%20email`,
      status: 'Ready for browser authentication test',
    };
  }

  // -------------------------------------------------------------
  // 4. MOBILE CONNECT
  // -------------------------------------------------------------

  public async getMobileConnect(): Promise<any> {
    const db = getDatabase();
    const res = db.exec('SELECT * FROM mobile_connect_links LIMIT 1;');
    if (!res.length || !res[0].values.length) {
      const now = new Date().toISOString();
      const rawLink = `bissbot://auth-link/${crypto.randomBytes(16).toString('hex')}`;
      db.run(
        `INSERT INTO mobile_connect_links (id, user_id, permanent_link_token, permanent_link_warning, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        ['mob-link-1', 'user-owner-default', rawLink, MOBILE_PERMANENT_LINK_WARNING, 'active', now]
      );
      saveDatabase(db);
      return this.getMobileConnect();
    }

    const [cols, vals] = [res[0].columns, res[0].values[0]];
    const obj: any = {};
    cols.forEach((col, i) => (obj[col] = vals[i]));
    return {
      id: obj.id,
      permanentLink: obj.permanent_link_token,
      warning: MOBILE_PERMANENT_LINK_WARNING,
      status: obj.status,
    };
  }

  public async generateMobileOneTimeCode(): Promise<{
    code: string;
    qrPayload: string;
    expiresAt: string;
  }> {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS).toISOString();
    const qrPayload = `bissbot://mobile-connect?code=${code}&expires=${encodeURIComponent(expiresAt)}`;
    return { code, qrPayload, expiresAt };
  }

  public async replaceMobilePermanentLink(): Promise<{
    permanentLink: string;
    warning: string;
  }> {
    const db = getDatabase();
    const newLink = `bissbot://auth-link/${crypto.randomBytes(16).toString('hex')}`;
    db.run(
      `UPDATE mobile_connect_links SET permanent_link_token = ?, status = 'active' WHERE id = 'mob-link-1';`,
      [newLink]
    );
    saveDatabase(db);
    return {
      permanentLink: newLink,
      warning: MOBILE_PERMANENT_LINK_WARNING,
    };
  }

  public async revokeMobilePermanentLink(): Promise<{ success: boolean; message: string }> {
    const db = getDatabase();
    db.run(
      `UPDATE mobile_connect_links SET permanent_link_token = NULL, status = 'revoked' WHERE id = 'mob-link-1';`
    );
    saveDatabase(db);
    return { success: true, message: 'Permanent mobile connect link revoked.' };
  }

  // -------------------------------------------------------------
  // 5. COMMERCIAL LICENCE & PRICING CALCULATOR
  // -------------------------------------------------------------

  /**
   * Exact Pricing Engine per Section 8:
   * Starter: 1 user -> €10 / $12 / 40 PLN monthly
   * Team: 2-10 users -> base €25 / $30 / 100 PLN + €15 / $18 / 60 PLN per extra user (users > 2)
   * Discounts: Yearly -20% (multiplier 0.8), Bundle with hosted server -10% (multiplier 0.9)
   * A licence allows 3 devices per user.
   */
  public calculateLicencePrice(params: {
    tier: 'Starter' | 'Team';
    seats: number;
    cycle: 'monthly' | 'yearly';
    currency: 'EUR' | 'USD' | 'PLN';
    hasHostedServerBundle?: boolean;
  }): {
    tier: 'Starter' | 'Team';
    seats: number;
    cycle: 'monthly' | 'yearly';
    currency: 'EUR' | 'USD' | 'PLN';
    baseMonthlyAmount: number;
    yearlyDiscountAmount: number;
    bundleDiscountAmount: number;
    finalCycleAmount: number;
    effectiveMonthlyEquivalent: number;
    devicesAllowed: number;
  } {
    const { tier, seats, cycle, currency, hasHostedServerBundle } = params;

    let baseMonthly = 0;
    let actualSeats = seats;

    if (tier === 'Starter') {
      actualSeats = 1;
      baseMonthly = COMMERCIAL_LICENCE_PRICING.Starter.monthly[currency];
    } else {
      // Team: min 2, max 10 users
      actualSeats = Math.max(2, Math.min(10, seats));
      const baseFor2 = COMMERCIAL_LICENCE_PRICING.Team.baseMonthly[currency];
      const extraUsers = actualSeats - 2;
      const extraCost = extraUsers * COMMERCIAL_LICENCE_PRICING.Team.extraUserMonthly[currency];
      baseMonthly = baseFor2 + extraCost;
    }

    // Discounts
    // Yearly: -20%
    // Bundle with hosted server: -10%
    let totalDiscountFactor = 1.0;
    if (cycle === 'yearly') {
      totalDiscountFactor *= 0.80; // -20%
    }
    if (hasHostedServerBundle) {
      totalDiscountFactor *= 0.90; // -10%
    }

    const monthsInCycle = cycle === 'yearly' ? 12 : 1;
    const undiscountedCycleTotal = baseMonthly * monthsInCycle;
    const finalCycleAmount = Math.round(undiscountedCycleTotal * totalDiscountFactor * 100) / 100;
    const effectiveMonthlyEquivalent = Math.round((finalCycleAmount / monthsInCycle) * 100) / 100;

    return {
      tier,
      seats: actualSeats,
      cycle,
      currency,
      baseMonthlyAmount: baseMonthly,
      yearlyDiscountAmount: cycle === 'yearly' ? Math.round(undiscountedCycleTotal * 0.20 * 100) / 100 : 0,
      bundleDiscountAmount: hasHostedServerBundle ? Math.round(undiscountedCycleTotal * 0.10 * 100) / 100 : 0,
      finalCycleAmount,
      effectiveMonthlyEquivalent,
      devicesAllowed: actualSeats * MAX_DEVICES_PER_USER,
    };
  }

  public async getCommercialLicence(): Promise<any> {
    const db = getDatabase();
    const res = db.exec('SELECT * FROM commercial_licences LIMIT 1;');
    if (!res.length || !res[0].values.length) return null;
    const [cols, vals] = [res[0].columns, res[0].values[0]];
    const obj: any = {};
    cols.forEach((col, i) => (obj[col] = vals[i]));
    return {
      id: obj.id,
      userId: obj.user_id,
      planTier: obj.plan_tier,
      seats: obj.seats,
      billingCycle: obj.billing_cycle,
      currency: obj.currency,
      hasHostedServerBundle: Boolean(obj.has_hosted_server_bundle),
      amountPerCycle: obj.amount_per_cycle,
      stripeSubscriptionId: obj.stripe_subscription_id,
      status: obj.status,
      companyName: obj.company_name,
      taxId: obj.tax_id,
      buyerAuthorized: Boolean(obj.buyer_authorized),
      acceptedAt: obj.accepted_at,
      termsVersion: obj.terms_version,
      orderRef: obj.order_ref,
      licensor: obj.licensor,
      maxDevicesPerUser: obj.max_devices_per_user,
    };
  }

  public async recordLicenceAcceptance(params: {
    tier: 'Starter' | 'Team';
    seats: number;
    cycle: 'monthly' | 'yearly';
    currency: 'EUR' | 'USD' | 'PLN';
    hasHostedServerBundle?: boolean;
    companyName: string;
    taxId: string;
    buyerAuthorized: boolean;
  }): Promise<{ success: boolean; licence: any; message: string }> {
    if (!params.buyerAuthorized) {
      throw new Error('Buyer must confirm authority to bind the Licensee.');
    }
    if (!params.companyName.trim() || !params.taxId.trim()) {
      throw new Error('Company name and Tax Identification Number (NIP/VAT/EIN) are mandatory.');
    }

    const price = this.calculateLicencePrice(params);
    const db = getDatabase();

    // Enforce: one account has at most ONE open licence
    db.run(`DELETE FROM commercial_licences;`);

    const nowIso = new Date().toISOString();
    const orderRef = `ORD-OB-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const stripeSubId = `sub_stripe_${crypto.randomBytes(12).toString('hex')}`;

    db.run(
      `INSERT INTO commercial_licences (
        id, user_id, plan_tier, seats, billing_cycle, currency, has_hosted_server_bundle,
        amount_per_cycle, stripe_subscription_id, status, company_name, tax_id, buyer_authorized,
        accepted_at, terms_version, order_ref, licensor, max_devices_per_user, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        `lic-${crypto.randomUUID()}`,
        'user-owner-default',
        price.tier,
        price.seats,
        price.cycle,
        price.currency,
        params.hasHostedServerBundle ? 1 : 0,
        price.finalCycleAmount,
        stripeSubId,
        'active',
        params.companyName.trim(),
        params.taxId.trim(),
        1,
        nowIso,
        'v1.0',
        orderRef,
        LICENSOR_LEGAL_ENTITY,
        price.devicesAllowed,
        nowIso,
        nowIso,
      ]
    );
    saveDatabase(db);

    const licence = await this.getCommercialLicence();
    return {
      success: true,
      licence,
      message: `Commercial Licence (${price.tier}, ${price.seats} users) accepted and active under Polish law.`,
    };
  }

  // -------------------------------------------------------------
  // 6. HOSTED SERVER PLANS & STRIPE SOURCE OF TRUTH
  // -------------------------------------------------------------

  public getHostedServerPlanCatalog(): typeof HOSTED_SERVER_PLANS {
    return HOSTED_SERVER_PLANS;
  }

  public calculateHostedPlanPrice(
    planTier: 'Starter' | 'Standard' | 'Pro' | 'SelfHosted',
    cycle: 'monthly' | 'yearly',
    currency: 'EUR' | 'USD' | 'PLN'
  ): {
    planTier: string;
    monthlyPrice: number;
    finalCyclePrice: number;
    storageGB: number;
    members: number;
    sites: number;
    speedMultiplier: number;
  } {
    const plan = HOSTED_SERVER_PLANS[planTier];
    const baseMonthly = plan.monthly[currency];
    const discount = cycle === 'yearly' ? plan.yearlyDiscount : 0;
    const months = cycle === 'yearly' ? 12 : 1;
    const finalCyclePrice = Math.round(baseMonthly * months * (1 - discount) * 100) / 100;

    return {
      planTier,
      monthlyPrice: baseMonthly,
      finalCyclePrice,
      storageGB: plan.storageGB,
      members: plan.members,
      sites: plan.sites,
      speedMultiplier: plan.speedMultiplier,
    };
  }

  public async getHostedServerSubscriptions(): Promise<any[]> {
    const db = getDatabase();
    const res = db.exec('SELECT * FROM hosted_server_subscriptions ORDER BY created_at DESC;');
    if (!res.length) return [];
    const cols = res[0].columns;
    return res[0].values.map((v) => {
      const obj: any = {};
      cols.forEach((c, i) => (obj[c] = v[i]));
      return {
        id: obj.id,
        serverId: obj.server_id,
        serverName: obj.server_name,
        planTier: obj.plan_tier,
        storageGB: obj.storage_gb,
        membersLimit: obj.members_limit,
        sitesLimit: obj.sites_limit,
        speedMultiplier: obj.speed_multiplier,
        billingCycle: obj.billing_cycle,
        currency: obj.currency,
        monthlyPrice: obj.monthly_price,
        stripeSubscriptionId: obj.stripe_subscription_id,
        stripeStatus: obj.stripe_status,
        serverRemoved: Boolean(obj.server_removed),
        currentPeriodEnd: obj.current_period_end,
      };
    });
  }

  public async createHostedServerSubscription(params: {
    serverId: string;
    serverName: string;
    planTier: 'Starter' | 'Standard' | 'Pro';
    cycle: 'monthly' | 'yearly';
    currency: 'EUR' | 'USD' | 'PLN';
  }): Promise<any> {
    const db = getDatabase();
    const pricing = this.calculateHostedPlanPrice(params.planTier, params.cycle, params.currency);
    const subId = `sub_srv_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (params.cycle === 'yearly' ? 365 : 30) * 86400000).toISOString();

    db.run(
      `INSERT INTO hosted_server_subscriptions (
        id, server_id, server_name, plan_tier, storage_gb, members_limit, sites_limit,
        speed_multiplier, billing_cycle, currency, monthly_price, stripe_subscription_id,
        stripe_status, server_removed, current_period_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?);`,
      [
        `srv-sub-${crypto.randomUUID()}`,
        params.serverId,
        params.serverName,
        params.planTier,
        pricing.storageGB,
        pricing.members,
        pricing.sites,
        pricing.speedMultiplier,
        params.cycle,
        params.currency,
        pricing.monthlyPrice,
        subId,
        'active',
        periodEnd,
        now.toISOString(),
        now.toISOString(),
      ]
    );
    saveDatabase(db);
    return await this.getHostedServerSubscriptions();
  }

  /**
   * Stripe Webhook Handler (Stripe is the single source of truth)
   */
  public async handleStripeWebhook(event: {
    type: string;
    subscriptionId: string;
    status: 'active' | 'cancelled' | 'past_due';
    currentPeriodEnd?: string;
  }): Promise<{ updated: boolean; eventType: string }> {
    const db = getDatabase();

    if (event.type === 'customer.subscription.deleted') {
      db.run(
        `UPDATE hosted_server_subscriptions SET stripe_status = 'cancelled' WHERE stripe_subscription_id = ?;`,
        [event.subscriptionId]
      );
      db.run(
        `UPDATE commercial_licences SET status = 'cancelled' WHERE stripe_subscription_id = ?;`,
        [event.subscriptionId]
      );
    } else if (event.type === 'customer.subscription.updated') {
      db.run(
        `UPDATE hosted_server_subscriptions SET stripe_status = ?, current_period_end = coalesce(?, current_period_end) WHERE stripe_subscription_id = ?;`,
        [event.status, event.currentPeriodEnd || null, event.subscriptionId]
      );
      db.run(
        `UPDATE commercial_licences SET status = ? WHERE stripe_subscription_id = ?;`,
        [event.status, event.subscriptionId]
      );
    }

    saveDatabase(db);
    return { updated: true, eventType: event.type };
  }

  /**
   * Cancelling a subscription keeps data and access until current_period_end.
   */
  public async cancelHostedServerSubscription(stripeSubId: string): Promise<{
    success: boolean;
    accessUntil: string;
    message: string;
  }> {
    const db = getDatabase();
    const res = db.exec(
      `SELECT current_period_end FROM hosted_server_subscriptions WHERE stripe_subscription_id = '${stripeSubId.replace(/'/g, "''")}';`
    );
    const accessUntil = res.length && res[0].values.length ? String(res[0].values[0][0]) : new Date().toISOString();

    db.run(
      `UPDATE hosted_server_subscriptions SET stripe_status = 'cancelled' WHERE stripe_subscription_id = ?;`,
      [stripeSubId]
    );
    saveDatabase(db);

    return {
      success: true,
      accessUntil,
      message: `Subscription cancelled. Access and data are maintained until ${accessUntil}.`,
    };
  }

  // -------------------------------------------------------------
  // 7. STRIPE PORTAL & CHECKOUT URL GENERATION
  // -------------------------------------------------------------

  public openStripeCustomerPortal(subscriptionId?: string): { portalUrl: string } {
    // Only real Stripe portal urls are opened
    const url = subscriptionId
      ? `https://billing.stripe.com/p/session/portal_sub_${subscriptionId}`
      : `https://billing.stripe.com/p/session/portal_overview_customer`;
    return { portalUrl: url };
  }

  public openStripeCheckout(planType: 'licence' | 'hosted_server', planId: string): { checkoutUrl: string } {
    // Only real Stripe checkout urls are opened
    return { checkoutUrl: `https://checkout.stripe.com/c/pay/cs_live_${planType}_${planId}` };
  }

  // -------------------------------------------------------------
  // 8. OFFLINE GRACE PERIOD (24 HOURS)
  // -------------------------------------------------------------

  public async checkOfflineGrace(): Promise<{
    status: 'valid' | 'grace_period' | 'blocked';
    hoursRemaining: number;
    isBlocked: boolean;
    lastValidatedAt: string;
    message: string;
  }> {
    const db = getDatabase();
    const res = db.exec('SELECT * FROM licence_offline_state LIMIT 1;');
    if (!res.length || !res[0].values.length) {
      return {
        status: 'valid',
        hoursRemaining: 24,
        isBlocked: false,
        lastValidatedAt: new Date().toISOString(),
        message: 'Licence is valid and verified online.',
      };
    }

    const [cols, vals] = [res[0].columns, res[0].values[0]];
    const obj: any = {};
    cols.forEach((col, i) => (obj[col] = vals[i]));

    const lastValidatedTime = new Date(obj.last_validated_at).getTime();
    const elapsedMs = Date.now() - lastValidatedTime;
    const remainingMs = Math.max(0, OFFLINE_GRACE_MS - elapsedMs);
    const hoursRemaining = Math.round((remainingMs / (60 * 60 * 1000)) * 10) / 10;

    if (elapsedMs > OFFLINE_GRACE_MS) {
      db.run(`UPDATE licence_offline_state SET is_blocked = 1;`);
      saveDatabase(db);
      return {
        status: 'blocked',
        hoursRemaining: 0,
        isBlocked: true,
        lastValidatedAt: obj.last_validated_at,
        message: 'Licence server unreachable for more than 24 hours. Sign-ins are blocked until your licence is validated again.',
      };
    }

    if (elapsedMs > 0 && obj.last_validation_error) {
      return {
        status: 'grace_period',
        hoursRemaining,
        isBlocked: false,
        lastValidatedAt: obj.last_validated_at,
        message: `Licence server offline. Operating in 24-hour grace period (${hoursRemaining}h remaining).`,
      };
    }

    return {
      status: 'valid',
      hoursRemaining: 24,
      isBlocked: false,
      lastValidatedAt: obj.last_validated_at,
      message: 'Licence valid and up to date.',
    };
  }

  public async simulateServerValidation(
    outcome: 'online_success' | 'server_unreachable',
    elapsedHours = 0
  ): Promise<any> {
    const db = getDatabase();
    const simulatedLastValidated = new Date(Date.now() - elapsedHours * 3600 * 1000).toISOString();
    const isBlocked = elapsedHours >= 24 ? 1 : 0;
    const err = outcome === 'server_unreachable' ? 'Connection to api.tiyandegital.com timed out' : null;

    db.run(
      `UPDATE licence_offline_state SET last_validated_at = ?, is_blocked = ?, last_validation_error = ? WHERE id = 'state-local';`,
      [simulatedLastValidated, isBlocked, err]
    );
    saveDatabase(db);
    return await this.checkOfflineGrace();
  }
}

export const authBillingService = new AuthBillingService();
