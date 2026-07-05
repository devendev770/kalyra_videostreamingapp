import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { logger } from './logger.js';

export const configurePassport = () => {
  const hasGoogleCreds =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id' &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_SECRET !== 'your_google_client_secret';

  if (hasGoogleCreds) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
              return done(null, user);
            }

            // Check if user with same email exists
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
              // Link Google account
              user.googleId = profile.id;
              if (!user.avatar) {
                user.avatar = profile.photos?.[0]?.value || '';
              }
              await user.save();
              return done(null, user);
            }

            // Create new user
            const username = `${profile.displayName.replace(/\s+/g, '').toLowerCase()}_${Date.now().toString(36)}`;
            user = await User.create({
              googleId: profile.id,
              email: profile.emails[0].value,
              username,
              displayName: profile.displayName,
              avatar: profile.photos?.[0]?.value || '',
              isVerified: true,
              role: 'user',
            });

            logger.info(`New Google OAuth user: ${user.email}`);
            done(null, user);
          } catch (error) {
            logger.error('Google OAuth error:', error);
            done(error, null);
          }
        }
      )
    );
  } else {
    logger.warn('Google OAuth credentials not configured. Using MockGoogleStrategy for development.');
    
    class MockGoogleStrategy extends passport.Strategy {
      constructor(verify) {
        super();
        this.name = 'google';
        this.verify = verify;
      }
      authenticate(req, options) {
        // On initial /api/auth/google request, redirect to callback (like real Google does)
        if (!req.path.includes('callback')) {
          return this.redirect('/api/auth/google/callback');
        }
        // On /api/auth/google/callback, authenticate the mock user
        const profile = {
          id: 'mock_google_id_12345',
          displayName: 'Mock Google User',
          emails: [{ value: 'mock.google.user@example.com' }],
          photos: [{ value: 'https://api.dicebear.com/7.x/adventurer/svg?seed=mockgoogle' }]
        };
        this.verify('mock_access_token', 'mock_refresh_token', profile, (err, user) => {
          if (err) return this.error(err);
          if (!user) return this.fail(401);
          this.success(user);
        });
      }
    }

    passport.use(
      new MockGoogleStrategy(async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (user) return done(null, user);

          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }

          const username = `mockgoogle_${Date.now().toString(36)}`;
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            username,
            displayName: profile.displayName,
            avatar: profile.photos[0].value,
            isVerified: true,
            role: 'user'
          });
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      })
    );
  }

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default passport;
