/**
 * auth.ts - authentication setup using Google OAuth 2.0
 * configures passport.js with Google strategy and session management
 */

import { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { createOrUpdateUser, updateUserUsername, getUser, checkUsernameAvailability } from "../services/supabase.js";

// Type imports
import type { UserInfo } from "../types/game.js";
import type { Request, Response } from "express";

// Constants import
import { AUTH_CONFIG } from "../constants.js";

/**
 * extracts user information from Google profile
 */
function extractUserInfo(profile: any): UserInfo {
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
  app.use(session(AUTH_CONFIG.SESSION));

  // initialize passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // configure Google OAuth strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://foodwars.vihdutta.com" + AUTH_CONFIG.ROUTES.GOOGLE_CALLBACK,
      },
      async function (accessToken, refreshToken, profile, done) {
        try {
          const userInfo = extractUserInfo(profile);
          
          // Create or update user in database
          const { username, wasUsernameModified } = await createOrUpdateUser(userInfo);
          
          // Store additional info in session
          const sessionUser = {
            ...userInfo,
            username,
            wasUsernameModified
          };
          
          return done(null, sessionUser);
        } catch (error) {
          console.error('❌ Error during Google OAuth callback:', error);
          return done(error, null);
        }
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
    AUTH_CONFIG.ROUTES.GOOGLE_LOGIN,
    passport.authenticate("google", { scope: [...AUTH_CONFIG.GOOGLE_SCOPES] })
  );

  // google OAuth callback route
  app.get(
    AUTH_CONFIG.ROUTES.GOOGLE_CALLBACK,
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      // redirect with hash to signal successful authentication
      res.redirect("/#authenticated");
    }
  );

  // get current authenticated user information
  app.get(AUTH_CONFIG.ROUTES.USER_INFO, async (req, res) => {
    if (req.isAuthenticated() && req.user) {
      try {
        const userInfo = extractUserInfo(req.user as any);
        const sessionUser = req.user as any;
        
        // Get the most up-to-date user info from database
        const dbUser = await getUser(userInfo.id);
        
        const response = {
          ...userInfo,
          username: dbUser?.username || sessionUser.username || userInfo.name,
          wasUsernameModified: sessionUser.wasUsernameModified || false
        };
        
        res.json(response);
      } catch (error) {
        console.error('❌ Error fetching user info:', error);
        res.status(500).json({ error: "Failed to fetch user information" });
      }
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // logout endpoint (JSON response for frontend)
  app.get(AUTH_CONFIG.ROUTES.LOGOUT, (req, res) => {
    req.logOut((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // username update endpoint
  app.post("/auth/update-username", async (req: Request, res: Response): Promise<void> => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { newUsername } = req.body;
    if (!newUsername || typeof newUsername !== 'string') {
      res.status(400).json({ error: "Invalid username" });
      return;
    }

    try {
      const userInfo = extractUserInfo(req.user as any);
      const result = await updateUserUsername(userInfo.id, newUsername);
      
      if (result.success) {
        res.json({ success: true, username: result.username });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('❌ Username update error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // username availability check endpoint
  app.post("/auth/check-username-availability", async (req: Request, res: Response): Promise<void> => {
    const { username } = req.body;
    
    if (!username || typeof username !== 'string') {
      res.status(400).json({ available: false, error: "Invalid username" });
      return;
    }

    try {
      // If user is authenticated, exclude their current user ID from the check
      // This allows them to check availability for their own username changes
      let excludeGoogleUserId: string | undefined;
      if (req.isAuthenticated() && req.user) {
        const userInfo = extractUserInfo(req.user as any);
        excludeGoogleUserId = userInfo.id;
      }

      const result = await checkUsernameAvailability(username, excludeGoogleUserId);
      res.json(result);
    } catch (error) {
      console.error('❌ Username availability check error:', error);
      res.status(500).json({ available: false, error: "Internal server error" });
    }
  });

  // legacy logout route for backwards compatibility
  app.get(AUTH_CONFIG.ROUTES.LEGACY_LOGOUT, (req, res) => {
    req.logOut((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.redirect("/");
    });
  });
}
