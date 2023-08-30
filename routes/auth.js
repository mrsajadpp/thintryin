var express = require('express');
var router = express.Router();
let userData = require('../db/user.js')
let axios = require('axios');
const requestIP = require('request-ip');

function ifLogIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
}

function notLogIn(req, res, next) {
  if (req.session.user) {
    res.redirect('/');
  } else {
    next();
  }
}

router.get('/login', notLogIn, (req, res, next) => {
  res.render('login', { title: 'Login - Thintry', description: 'Seamless Social Media Login for Instant Access! Join the conversation on our microblog platform with just a click. Hassle-free sign-in, connecting you to a vibrant community of thinkers. Sign up now and start sharing your thoughts!', keywords: 'login, signup, authentication, joine', page: 'nohead', style: 'signup' })
})

router.get('/signup', notLogIn, (req, res, next) => {
  res.render('signup', { title: 'Signup - Thintry', description: 'Sign Up Today! Join our dynamic microblogging community and share your thoughts with like-minded individuals. Quick and easy registration process, empowering you to start posting and engaging in no time. Join us now and be part of the conversation!', keywords: 'login, signup, authentication, joine', page: 'nohead', style: 'signup' })
})

router.post('/signup', notLogIn, async (req, res, next) => {
  try {
    const ipAddress = await req.header('x-forwarded-for') || req.headers['x-real-ip'] || req.headers['cf-connecting-ip'] || req.connection.remoteAddress || requestIP.getClientIp(req);
    axios.get(`https://ipinfo.io/${ipAddress}/json`)
      .then((response) => {
        if (req.body.firstname && req.body.username && req.body.email && req.body.password) {
          userData.createUser(req.body, response.data)
            .then((user) => {
              res.render('otp', { title: 'Verify - Thintry', page: 'nohead', encrypted: user.encrypted_verification_code, uid: user._id, style: 'signup' });
            })
            .catch((error) => {
              if (error.status == 403) {
                res.render('signup', { title: 'SignUp - Thintry', description: 'Sign Up Today! Join our dynamic microblogging community and share your thoughts with like-minded individuals. Quick and easy registration process, empowering you to start posting and engaging in no time. Join us now and be part of the conversation!', keywords: 'login, signup, authentication, joine', page: 'nohead', style: 'signup', error: { status: 403, message: "User already exist!" } });
              } else {
                console.error(error);
                res.render('error', { message: 'Internal Server Down!', status: 500 });
              }
            });
        }
      });
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Internal Server Down!', status: 500 });
  }
});

router.post('/verify', notLogIn, (req, res, next) => {
  userData.verify(req.body)
    .then((user) => {
      req.session.user = user;
      req.session.user.logged = true;
      res.redirect('/profile');
    })
    .catch((error) => {
      if (error.status == 403) {
        res.render('otp', { title: 'Verify - Thintry', page: 'nohead', encrypted: error.encrypted_verification_code, uid: user._id, style: 'signup', error: { status: 403, message: "User already exist!" } });
      } else {
        console.error(error);
        res.render('error', { message: 'Internal Server Down!', status: 500 });
      }
    });
});

router.post('/login', notLogIn, (req, res, next) => {
  if (req.body.username && req.body.password) {
    userData.findUser(req.body)
      .then((user) => {
        req.session.user = user;
        req.session.user.logged = true;
        res.redirect('/profile');
      })
      .catch((error) => {
          res.render('login', { title: 'Login - Thintry', description: 'Seamless Social Media Login for Instant Access! Join the conversation on our microblog platform with just a click. Hassle-free sign-in, connecting you to a vibrant community of thinkers. Sign up now and start sharing your thoughts!', keywords: 'login, signup, authentication, joine', page: 'nohead', style: 'signup', error: { status: 403, message: "Invalid username or password!" } })
      });
  }
});

module.exports = router;
