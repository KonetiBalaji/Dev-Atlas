// DevAtlas SSO Integration
// Created by Balaji Koneti

import { Strategy as SamlStrategy } from 'passport-saml';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { SSOConfig, SSOProvider } from './types';

export class SSOService {
  private providers: Map<string, SSOProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize SSO providers
   */
  private initializeProviders(): void {
    // SAML provider
    this.providers.set('saml', {
      name: 'SAML',
      type: 'saml',
      config: {
        entryPoint: process.env.SAML_ENTRY_POINT,
        issuer: process.env.SAML_ISSUER,
        cert: process.env.SAML_CERT,
        callbackUrl: process.env.SAML_CALLBACK_URL,
      },
      enabled: !!process.env.SAML_ENTRY_POINT,
    });

    // OIDC provider
    this.providers.set('oidc', {
      name: 'OpenID Connect',
      type: 'oidc',
      config: {
        issuer: process.env.OIDC_ISSUER,
        clientId: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
        callbackUrl: process.env.OIDC_CALLBACK_URL,
      },
      enabled: !!process.env.OIDC_ISSUER,
    });

    // OAuth2 provider
    this.providers.set('oauth2', {
      name: 'OAuth2',
      type: 'oauth2',
      config: {
        authorizationURL: process.env.OAUTH2_AUTH_URL,
        tokenURL: process.env.OAUTH2_TOKEN_URL,
        clientID: process.env.OAUTH2_CLIENT_ID,
        clientSecret: process.env.OAUTH2_CLIENT_SECRET,
        callbackURL: process.env.OAUTH2_CALLBACK_URL,
      },
      enabled: !!process.env.OAUTH2_AUTH_URL,
    });
  }

  /**
   * Get available SSO providers
   */
  getAvailableProviders(): SSOProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.enabled);
  }

  /**
   * Get SSO provider by name
   */
  getProvider(name: string): SSOProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Create SAML strategy
   */
  createSamlStrategy(config: any): SamlStrategy {
    return new SamlStrategy({
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      cert: config.cert,
      callbackUrl: config.callbackUrl,
      passReqToCallback: true,
    }, (req, profile, done) => {
      // Handle SAML authentication
      const user = {
        id: profile.nameID || profile.email,
        email: profile.email,
        name: profile.displayName || profile.firstName + ' ' + profile.lastName,
        provider: 'saml',
        orgId: this.extractOrgId(profile),
      };
      return done(null, user);
    });
  }

  /**
   * Create OAuth2 strategy
   */
  createOAuth2Strategy(config: any): OAuth2Strategy {
    return new OAuth2Strategy({
      authorizationURL: config.authorizationURL,
      tokenURL: config.tokenURL,
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
    }, (accessToken, refreshToken, profile, done) => {
      // Handle OAuth2 authentication
      const user = {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        provider: 'oauth2',
        orgId: this.extractOrgId(profile),
      };
      return done(null, user);
    });
  }

  /**
   * Extract organization ID from SSO profile
   */
  private extractOrgId(profile: any): string {
    // Try to extract org ID from various profile fields
    return profile.orgId || 
           profile.organization || 
           profile.department || 
           profile.groups?.[0] || 
           'default';
  }

  /**
   * Validate SSO configuration
   */
  validateConfig(config: SSOConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name) {
      errors.push('Provider name is required');
    }

    if (!config.enabled) {
      return { valid: true, errors: [] };
    }

    switch (config.provider) {
      case 'saml':
        if (!config.config.entryPoint) errors.push('SAML entry point is required');
        if (!config.config.issuer) errors.push('SAML issuer is required');
        if (!config.config.cert) errors.push('SAML certificate is required');
        break;
      case 'oidc':
        if (!config.config.issuer) errors.push('OIDC issuer is required');
        if (!config.config.clientId) errors.push('OIDC client ID is required');
        if (!config.config.clientSecret) errors.push('OIDC client secret is required');
        break;
      case 'oauth2':
        if (!config.config.authorizationURL) errors.push('OAuth2 authorization URL is required');
        if (!config.config.tokenURL) errors.push('OAuth2 token URL is required');
        if (!config.config.clientID) errors.push('OAuth2 client ID is required');
        if (!config.config.clientSecret) errors.push('OAuth2 client secret is required');
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Test SSO connection
   */
  async testConnection(provider: string): Promise<{ success: boolean; error?: string }> {
    try {
      const ssoProvider = this.getProvider(provider);
      if (!ssoProvider) {
        return { success: false, error: 'Provider not found' };
      }

      // Test connection based on provider type
      switch (ssoProvider.type) {
        case 'saml':
          return await this.testSamlConnection(ssoProvider.config);
        case 'oidc':
          return await this.testOidcConnection(ssoProvider.config);
        case 'oauth2':
          return await this.testOAuth2Connection(ssoProvider.config);
        default:
          return { success: false, error: 'Unsupported provider type' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Test SAML connection
   */
  private async testSamlConnection(config: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Test SAML metadata endpoint
      const response = await fetch(config.entryPoint);
      if (!response.ok) {
        return { success: false, error: 'SAML entry point not accessible' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'SAML connection test failed' };
    }
  }

  /**
   * Test OIDC connection
   */
  private async testOidcConnection(config: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Test OIDC discovery endpoint
      const discoveryUrl = `${config.issuer}/.well-known/openid_configuration`;
      const response = await fetch(discoveryUrl);
      if (!response.ok) {
        return { success: false, error: 'OIDC discovery endpoint not accessible' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'OIDC connection test failed' };
    }
  }

  /**
   * Test OAuth2 connection
   */
  private async testOAuth2Connection(config: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Test OAuth2 authorization endpoint
      const response = await fetch(config.authorizationURL);
      if (!response.ok) {
        return { success: false, error: 'OAuth2 authorization endpoint not accessible' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'OAuth2 connection test failed' };
    }
  }
}

