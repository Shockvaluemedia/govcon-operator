import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import prisma from "./prisma";
import { resolveEffectiveRole } from "./authorization";

// ============================================================
// AWS Cognito Configuration
// ============================================================

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";
const COGNITO_DOMAIN = `https://cognito-idp.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${USER_POOL_ID}`;
const DEMO_TOKEN_PREFIX = "demo-access:";
const DEMO_ID_TOKEN_PREFIX = "demo-id:";
const DEMO_REFRESH_PREFIX = "demo-refresh:";

// JWKS for token verification
const JWKS = createRemoteJWKSet(
  new URL(`${COGNITO_DOMAIN}/.well-known/jwks.json`)
);

function hasConfiguredCognito(): boolean {
  return Boolean(
    USER_POOL_ID &&
      CLIENT_ID &&
      !USER_POOL_ID.includes("XXXXXXXXX") &&
      !CLIENT_ID.includes("your-")
  );
}

export function isDemoAuthEnabled(): boolean {
  if (process.env.GOVCON_DEMO_AUTH === "true") {
    return (
      process.env.NODE_ENV !== "production" ||
      process.env.GOVCON_DEMO_AUTH_ALLOW_PRODUCTION_BUILD === "true"
    );
  }
  if (process.env.GOVCON_DEMO_AUTH === "false") return false;
  return process.env.NODE_ENV !== "production" && !hasConfiguredCognito();
}

function createDemoTokens(email: string): AuthTokens {
  const encodedEmail = encodeURIComponent(email.toLowerCase());

  return {
    accessToken: `${DEMO_TOKEN_PREFIX}${encodedEmail}`,
    idToken: `${DEMO_ID_TOKEN_PREFIX}${encodedEmail}`,
    refreshToken: `${DEMO_REFRESH_PREFIX}${encodedEmail}`,
    expiresIn: 60 * 60 * 8,
  };
}

function emailFromDemoToken(token: string, prefix: string): string | null {
  if (!token.startsWith(prefix)) return null;

  try {
    return decodeURIComponent(token.slice(prefix.length));
  } catch {
    return null;
  }
}

async function authUserFromEmail(email: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      userRoles: true,
      organization: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    cognitoId: user.cognitoId || `demo-cognito:${user.email}`,
    organizationId: user.organizationId,
    role: resolveEffectiveRole(
      user.userRoles
        .filter((role) => role.organizationId === user.organizationId)
        .map((role) => role.role)
    ),
  };
}

// ============================================================
// Auth Functions
// ============================================================

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cognitoId: string;
  organizationId: string;
  role: Role;
}

/**
 * Register a new user with Cognito and create database records
 */
export async function signUp(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}): Promise<{ userSub: string }> {
  const { email, password, firstName, lastName, organizationName } = params;
  const normalizedEmail = email.toLowerCase();

  if (isDemoAuthEnabled()) {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return { userSub: existingUser.cognitoId || `demo-cognito:${normalizedEmail}` };
    }

    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        naicsCodes: [],
        pscCodes: [],
      },
    });

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName,
        lastName,
        cognitoId: `demo-cognito:${normalizedEmail}`,
        organizationId: organization.id,
        userRoles: {
          create: {
            organizationId: organization.id,
            role: "owner",
          },
        },
      },
    });

    await prisma.complianceProfile.create({
      data: {
        organizationId: organization.id,
        readinessScore: 0,
        certifications: [],
        setAsideEligibility: [],
      },
    });

    return { userSub: user.cognitoId! };
  }

  // Register with Cognito
  const command = new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: normalizedEmail,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: normalizedEmail },
      { Name: "given_name", Value: firstName },
      { Name: "family_name", Value: lastName },
    ],
  });

  const response = await cognitoClient.send(command);
  const cognitoId = response.UserSub!;

  // Create organization and user in database
  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      naicsCodes: [],
      pscCodes: [],
    },
  });

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      firstName,
      lastName,
      cognitoId,
      organizationId: organization.id,
      userRoles: {
        create: {
          organizationId: organization.id,
          role: "owner",
        },
      },
    },
  });

  // Create default compliance profile
  await prisma.complianceProfile.create({
    data: {
      organizationId: organization.id,
      readinessScore: 0,
      certifications: [],
      setAsideEligibility: [],
    },
  });

  return { userSub: cognitoId };
}

/**
 * Confirm user registration with verification code
 */
export async function confirmSignUp(email: string, code: string): Promise<void> {
  if (isDemoAuthEnabled()) {
    return;
  }

  const command = new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  });

  await cognitoClient.send(command);
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthTokens> {
  if (isDemoAuthEnabled()) {
    if (!password) {
      throw new Error("Password is required");
    }

    const user = await authUserFromEmail(email);
    if (!user) {
      throw new Error("Demo user not found. Run npm run db:seed first.");
    }

    return createDemoTokens(user.email);
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const response = await cognitoClient.send(command);
  const result = response.AuthenticationResult!;

  const tokens: AuthTokens = {
    accessToken: result.AccessToken!,
    idToken: result.IdToken!,
    refreshToken: result.RefreshToken!,
    expiresIn: result.ExpiresIn!,
  };

  return tokens;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  if (isDemoAuthEnabled()) {
    const email = emailFromDemoToken(refreshToken, DEMO_REFRESH_PREFIX);
    if (!email) {
      throw new Error("Invalid demo refresh token");
    }

    const user = await authUserFromEmail(email);
    if (!user) {
      throw new Error("Demo user not found");
    }

    return createDemoTokens(user.email);
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  const response = await cognitoClient.send(command);
  const result = response.AuthenticationResult!;

  return {
    accessToken: result.AccessToken!,
    idToken: result.IdToken!,
    refreshToken: refreshToken, // Refresh token stays the same
    expiresIn: result.ExpiresIn!,
  };
}

/**
 * Sign out user globally
 */
export async function signOut(accessToken: string): Promise<void> {
  if (isDemoAuthEnabled() && accessToken.startsWith(DEMO_TOKEN_PREFIX)) {
    return;
  }

  const command = new GlobalSignOutCommand({
    AccessToken: accessToken,
  });

  await cognitoClient.send(command);
}

/**
 * Initiate forgot password flow
 */
export async function forgotPassword(email: string): Promise<void> {
  if (isDemoAuthEnabled()) {
    return;
  }

  const command = new ForgotPasswordCommand({
    ClientId: CLIENT_ID,
    Username: email,
  });

  await cognitoClient.send(command);
}

/**
 * Confirm new password with verification code
 */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  if (isDemoAuthEnabled()) {
    return;
  }

  const command = new ConfirmForgotPasswordCommand({
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });

  await cognitoClient.send(command);
}

/**
 * Verify JWT token and return user data
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    if (isDemoAuthEnabled()) {
      const email = emailFromDemoToken(token, DEMO_TOKEN_PREFIX);
      if (email) {
        return authUserFromEmail(email);
      }
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: COGNITO_DOMAIN,
    });

    if (payload.token_use !== "access" || payload.client_id !== CLIENT_ID) {
      return null;
    }

    const cognitoId = payload.sub as string;

    // Look up user in database
    const user = await prisma.user.findUnique({
      where: { cognitoId },
      include: {
        userRoles: true,
        organization: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      cognitoId: user.cognitoId!,
      organizationId: user.organizationId,
      role: resolveEffectiveRole(
        user.userRoles
          .filter((role) => role.organizationId === user.organizationId)
          .map((role) => role.role)
      ),
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Get current authenticated user from request cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return null;

  return verifyToken(token);
}

/**
 * Middleware helper to require authentication
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(user.role);
}

/**
 * Require specific role(s)
 */
export async function requireRole(requiredRoles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasRole(user, requiredRoles)) {
    throw new Error("Forbidden: insufficient permissions");
  }
  return user;
}
