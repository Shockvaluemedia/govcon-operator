import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { jwtVerify, createRemoteJWKSet, SignJWT } from "jose";
import { cookies } from "next/headers";
import prisma from "./prisma";

// ============================================================
// AWS Cognito Configuration
// ============================================================

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";
const COGNITO_DOMAIN = `https://cognito-idp.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${USER_POOL_ID}`;

// JWKS for token verification
const JWKS = createRemoteJWKSet(
  new URL(`${COGNITO_DOMAIN}/.well-known/jwks.json`)
);

// ============================================================
// Demo / Mock Auth (zero-config: no Cognito or database required)
// ============================================================

/**
 * Whether to use the built-in demo auth instead of AWS Cognito.
 * Defaults to demo mode unless a Cognito user pool + client are configured.
 * Force either mode explicitly with AUTH_PROVIDER=cognito | mock.
 */
export function isMockAuth(): boolean {
  const provider = process.env.AUTH_PROVIDER;
  if (provider === "cognito") return false;
  if (provider === "mock") return true;
  return !USER_POOL_ID || !CLIENT_ID;
}

const DEMO_AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "govcon-operator-demo-secret-not-for-production"
);

const DEMO_TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 hours

/** In-memory demo identity. Mirrors prisma/seed.ts so DB and no-DB demos line up. */
export const DEMO_USER: AuthUser = {
  id: "user-demo-001",
  email: "demo@govcon-operator.com",
  firstName: "Jane",
  lastName: "Doe",
  cognitoId: "demo-cognito-id",
  organizationId: "org-demo-001",
  role: "owner",
};

/** Demo organization profile served when no database is connected. */
export const DEMO_ORGANIZATION = {
  id: "org-demo-001",
  name: "Acme Government Solutions LLC",
  uei: "ABC123DEF456",
  cageCode: "1A2B3",
  samRegistered: true,
  naicsCodes: ["424120", "423430", "424690", "423840"],
  pscCodes: ["7510", "7021", "7930", "4240"],
};

async function issueDemoToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(DEMO_USER.cognitoId)
    .setIssuedAt()
    .setExpirationTime(`${DEMO_TOKEN_TTL_SECONDS}s`)
    .sign(DEMO_AUTH_SECRET);
}

async function verifyDemoToken(token: string): Promise<AuthUser | null> {
  try {
    await jwtVerify(token, DEMO_AUTH_SECRET);
  } catch {
    return null;
  }

  // Prefer the seeded database record when a DB is available so IDs line up,
  // but fall back to the in-memory identity so the demo works with no DB.
  try {
    const user = await prisma.user.findUnique({
      where: { cognitoId: DEMO_USER.cognitoId },
      include: { userRoles: true },
    });
    if (user) {
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        cognitoId: user.cognitoId!,
        organizationId: user.organizationId,
        role: user.userRoles[0]?.role || "owner",
      };
    }
  } catch {
    // Database unavailable — fall through to the in-memory demo identity.
  }

  return DEMO_USER;
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
  role: string;
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

  // Demo mode: registration is a no-op that leads to the shared demo account.
  if (isMockAuth()) {
    return { userSub: DEMO_USER.cognitoId };
  }

  // Register with Cognito
  const command = new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
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
      email,
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
  if (isMockAuth()) return;

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
  // Demo mode: accept any credentials and issue a signed demo token.
  if (isMockAuth()) {
    const token = await issueDemoToken(email);
    return {
      accessToken: token,
      idToken: token,
      refreshToken: token,
      expiresIn: DEMO_TOKEN_TTL_SECONDS,
    };
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
  if (isMockAuth()) {
    const token = await issueDemoToken(DEMO_USER.email);
    return {
      accessToken: token,
      idToken: token,
      refreshToken: token,
      expiresIn: DEMO_TOKEN_TTL_SECONDS,
    };
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
  if (isMockAuth()) return;

  const command = new GlobalSignOutCommand({
    AccessToken: accessToken,
  });

  await cognitoClient.send(command);
}

/**
 * Initiate forgot password flow
 */
export async function forgotPassword(email: string): Promise<void> {
  if (isMockAuth()) return;

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
  if (isMockAuth()) return;

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
  if (isMockAuth()) {
    return verifyDemoToken(token);
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: COGNITO_DOMAIN,
    });

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
      role: user.userRoles[0]?.role || "viewer",
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
export function hasRole(user: AuthUser, requiredRoles: string[]): boolean {
  return requiredRoles.includes(user.role);
}

/**
 * Require specific role(s)
 */
export async function requireRole(requiredRoles: string[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasRole(user, requiredRoles)) {
    throw new Error("Forbidden: insufficient permissions");
  }
  return user;
}
