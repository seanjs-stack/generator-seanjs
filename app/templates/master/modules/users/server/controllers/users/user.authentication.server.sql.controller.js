'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  passport = require('passport'),
  db = require(path.resolve('./config/lib/sequelize')).models,
  User = db.user;

// URLs for which user can't be redirected on signin
var noReturnUrls = [
  '/authentication/signin',
  '/authentication/signup'
];

/**
 * Signup
 */
exports.signup = function(req, res) {
  // For security measurement we remove the roles from the req.body object
  delete req.body.roles;

  var message = null;

  var user = User.build(req.body);

  user.provider = 'local';
  user.salt = user.makeSalt();
  user.hashedPassword = user.encryptPassword(req.body.password, user.salt);
  user.displayName = user.firstName + ' ' + user.lastName;

  //MUST DELETE THIS WHEN PRODUCTION
  if (req.body.is_admin === true) {
    user.roles = ["admin", "user"];
  } else {
    user.roles = ["user"];
  }

  user.save().then(function() {
    req.login(user, function(err) {
      if (err)
        res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      res.json(user);
    });
  }).catch(function(err) {
    res.status(400).send({
      message: errorHandler.getErrorMessage(err)
    });
  });
};

/**
 * Signin after passport authentication
 */
exports.signin = function(req, res, next) {

  passport.authenticate('local', function(err, user, info) {

    if (err || !user) {
      res.status(400).send({
        message: err
      });
    } else {
      // Remove sensitive data before login
      user.password = undefined;
      user.salt = undefined;

      req.login(user, function(err) {
        if (err) {
          res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } else {
          res.json(user);
        }
      });
    }
  })(req, res, next);
};

/**
 * Signout
 */
exports.signout = function(req, res) {
  req.logout();
  res.redirect('/');
};

/**
 * OAuth provider call
 */
exports.oauthCall = function(strategy, scope) {
  return function(req, res, next) {
    // Set redirection path on session.
    // Do not redirect to a signin or signup page
    if (noReturnUrls.indexOf(req.query.redirect_to) === -1) {
      req.session.redirect_to = req.query.redirect_to;
    }
    // Authenticate
    passport.authenticate(strategy, scope)(req, res, next);
  };
};

/**
 * OAuth callback
 */
exports.oauthCallback = function(strategy) {
  return function(req, res, next) {
    // Pop redirect URL from session
    var sessionRedirectURL = req.session.redirect_to;
    delete req.session.redirect_to;

    passport.authenticate(strategy, function(err, user, redirectURL) {
      if (err) {
        return res.redirect('/authentication/signin?err=' + encodeURIComponent(errorHandler.getErrorMessage(err)));
      }
      if (!user) {
        return res.redirect('/authentication/signin');
      }
      req.login(user, function(err) {
        if (err) {
          return res.redirect('/authentication/signin');
        }

        return res.redirect(redirectURL || sessionRedirectURL || '/');
      });
    })(req, res, next);
  };
};

/**
 * Helper function to save or update a OAuth user profile
 */
exports.saveOAuthUserProfile = function(req, providerUserProfile, done) {
  if (!req.user) {

    //check if the email exists, add the provider data to it and login
    User.find({
      where: {
        email: providerUserProfile.email
      }
    }).then(function(user) {
      if (user) {

        //Update their info
        user.firstName = providerUserProfile.firstName;
        user.lastName = providerUserProfile.lastName;
        user.displayName = providerUserProfile.displayName;
        user.profileImageURL = providerUserProfile.profileImageURL;
        user.provider = providerUserProfile.provider;
        user.providerData = JSON.stringify(providerUserProfile.providerData);

        // And save the user
        user.save().then(function() {
          req.login(user, function(err) {
            if (err)
              return done(new Error(err), user);
            return done(false, user);
          });
        }).catch(function(err) {
          return done(false, err);
        });

      } else {
        //A new user...

        // Define a search query fields
        var searchMainProviderIdentifierField = providerUserProfile.provider + "UserId";

        // Define main provider search query
        var mainProviderSearchQuery = {};
        mainProviderSearchQuery.provider = providerUserProfile.provider;
        mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

        User.find({
          where: {
            $or: [mainProviderSearchQuery],
          }
        }).then(function(user) {
          if (user) { //The user already have the providerIdentifierField

            //Update their info
            user.firstName = providerUserProfile.firstName;
            user.lastName = providerUserProfile.lastName;
            user.displayName = providerUserProfile.displayName;
            user.profileImageURL = providerUserProfile.profileImageURL;
            user.provider = providerUserProfile.provider;
            user.providerData = JSON.stringify(providerUserProfile.providerData);

            user.save().then(function() {
              req.login(user, function(err) {
                if (err)
                  return done(false, user);
                return done(null, user);
              });
            }).catch(function(err) {
              return done(false, err);
            });

          } else {
            var possibleUsername = providerUserProfile.username || ((providerUserProfile.email) ? providerUserProfile.email.split('@')[0] : '');

            User.findUniqueUsername(possibleUsername, null, function(availableUsername) {

              var newUser = {};

              newUser.firstName = providerUserProfile.firstName;
              newUser.lastName = providerUserProfile.lastName;
              newUser.username = availableUsername;
              newUser.displayName = providerUserProfile.displayName;
              newUser.email = providerUserProfile.email;
              newUser.profileImageURL = providerUserProfile.profileImageURL;
              newUser.provider = providerUserProfile.provider;
              newUser.providerData = JSON.stringify(providerUserProfile.providerData);

              if (providerUserProfile.provider === 'facebook') {
                newUser.facebookUserId = providerUserProfile.providerData.id;
              } else if (providerUserProfile.provider === 'twitter') {
                newUser.twitterUserId = providerUserProfile.providerData.id;
              } else if (providerUserProfile.provider === 'github') {
                newUser.githubUserId = providerUserProfile.providerData.id;
              } else if (providerUserProfile.provider === 'linkedin') {
                newUser.linkedinUserId = providerUserProfile.providerData.id;
              } else if (providerUserProfile.provider === 'paypal') {
                newUser.paypalUserId = providerUserProfile.providerData.user_id;
              } else if (providerUserProfile.provider === 'google') {
                newUser.googleUserId = providerUserProfile.providerData.id;
              }

              newUser.roles = ["user"];

              User.create(newUser).then(function(user) {
                if (!user) {
                  return done(false, user);
                } else {
                  req.login(user, function(err) {
                    if (err)
                      return done(new Error(err), user);
                    return done(null, user);
                  });
                }
              }).catch(function(err) {
                return done(false, err);
              });

            });

          }
        }).catch(function(err) {
          return done(false, err);
        });

      }

    }).catch(function(err) {
      return done(false, err);
    });
  } else {
    // User is already logged in, join the provider data to the existing user
    var user = req.user;

    // Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
    if (user.provider !== providerUserProfile.provider && (!user.additionalProvidersData || !user.additionalProvidersData[providerUserProfile.provider])) {
      // Add the provider data to the additional provider data field
      if (!user.additionalProvidersData) {
        user.additionalProvidersData = {};
      }

      user.additionalProvidersData[providerUserProfile.provider] = providerUserProfile.providerData;

      user.additionalProvidersData = JSON.stringify(user.additionalProvidersData);

      if (providerUserProfile.provider === 'facebook') {
        user.facebookUserId = providerUserProfile.providerData.id;
      } else if (providerUserProfile.provider === 'twitter') {
        user.twitterUserId = providerUserProfile.providerData.id;
      } else if (providerUserProfile.provider === 'github') {
        user.githubUserId = providerUserProfile.providerData.id;
      } else if (providerUserProfile.provider === 'linkedin') {
        user.linkedinUserId = providerUserProfile.providerData.id;
      } else if (providerUserProfile.provider === 'paypal') {
        user.paypalUserId = providerUserProfile.providerData.user_id;
      } else if (providerUserProfile.provider === 'google') {
        user.googleUserId = providerUserProfile.providerData.id;
      }

      // And save the user
      user.save().then(function(saved) {
        return done((!saved) ? true : false, user, '/settings/accounts');
      }).catch(function(error) {
        return done(false, error);
      });

    } else {
      return done(new Error('User is already connected using this provider'), user);
    }
  }
};

/**
 * Remove OAuth provider
 */
exports.removeOAuthProvider = function(req, res, next) {
  var user = req.user;
  var provider = req.query.provider;

  if (!user) {
    return res.status(401).json({
      message: 'User is not authenticated'
    });
  } else if (!provider) {
    return res.status(400).send();
  }

  // Delete the additional provider
  if (user.additionalProvidersData[provider]) {
    delete user.additionalProvidersData[provider];
    user.additionalProvidersData = JSON.stringify(user.additionalProvidersData);
  }

  user.save().then(function(user) {
    req.login(user, function(err) {
      if (err) {
        return res.status(400).send(err);
      } else {
        return res.json(user);
      }
    });
  }).catch(function(err) {
    return res.status(400).send({
      message: errorHandler.getErrorMessage(err)
    });
  });

};