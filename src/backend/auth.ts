/**
 * auth.ts - authentication setup using Google OAuth 2.0
 * configures passport.js with Google strategy and session management
 */

import { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// session configuration constants
const SESSION_CONFIG = {
  secret: "secret", // todo: use environment variable for production
  resave: false,
  saveUninitialized: true,
} as const;

// google OAuth scopes for user data access
const GOOGLE_SCOPES = ["profile", "email"];

// authentication routes
const AUTH_ROUTES = {
  GOOGLE_LOGIN: "/auth/google",
  GOOGLE_CALLBACK: "/auth/google/callback",
  USER_INFO: "/auth/user",
  LOGOUT: "/auth/logout",
  LEGACY_LOGOUT: "/logout",
} as const;

/**
 * extracts user information from Google profile
 */
function extractUserInfo(profile: any) {
  return {
    id: profile.id,
    name: profile.displayName,
    email: profile.emails?.[0]?.value,
    picture: profile.photos?.[0]?.value,
  };
}

/**
 * configures authentication middleware and routes for the express app
 */
export function setupAuth(app: Express): void {
  // configure session middleware
  app.use(session(SESSION_CONFIG));

  // initialize passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // configure Google OAuth strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://foodwars.vihdutta.com" + AUTH_ROUTES.GOOGLE_CALLBACK,
      },
      function (accessToken, refreshToken, profile, done) {
        // todo: implement user lookup/creation in database
        return done(null, profile);
      }
    )
  );

  // serialize user for session storage
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // deserialize user from session storage
  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // google OAuth login initiation route
  app.get(
    AUTH_ROUTES.GOOGLE_LOGIN,
    passport.authenticate("google", { scope: GOOGLE_SCOPES })
  );

  // google OAuth callback route
  app.get(
    AUTH_ROUTES.GOOGLE_CALLBACK,
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      // redirect with hash to signal successful authentication
      res.redirect("/#authenticated");
    }
  );

  // get current authenticated user information
  app.get(AUTH_ROUTES.USER_INFO, (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const userInfo = extractUserInfo(req.user as any);
      res.json(userInfo);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // logout endpoint (JSON response for frontend)
  app.get(AUTH_ROUTES.LOGOUT, (req, res) => {
    req.logOut((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // legacy logout endpoint (redirect response)
  app.get(AUTH_ROUTES.LEGACY_LOGOUT, (req, res) => {
    req.logOut((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.redirect("/");
    });
  });
}
