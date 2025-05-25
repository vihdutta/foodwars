import { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

export function setupAuth(app: Express) {
  app.use(
    session({
      secret: "secret",
      resave: false,
      saveUninitialized: true,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:8080/auth/google/callback",
      },
      function (accessToken, refreshToken, profile, done) {
        // You should implement user lookup/creation here
        return done(null, profile);
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("/#authenticated"); // Add hash to signal successful auth
    }
  );

  app.get("/logout", (req, res) => {
    req.logOut((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.redirect("/");
    });
  });

  // Add endpoint to get current user info
  app.get("/auth/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      // Extract relevant user info from Google profile
      const user = req.user as any;
      res.json({
        id: user.id,
        name: user.displayName,
        email: user.emails?.[0]?.value,
        picture: user.photos?.[0]?.value
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Add logout endpoint that matches frontend expectation
  app.get("/auth/logout", (req, res) => {
    req.logOut((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ success: true });
    });
  });
}
