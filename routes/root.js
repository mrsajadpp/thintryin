var express = require('express');
var router = express.Router();
let userData = require('../db/user.js')
let postData = require('../db/post.js')
const { SitemapStream, streamToPromise } = require('sitemap')
const { createGzip } = require('zlib')
const { Readable } = require('stream')
const ObjectId = require('mongodb').ObjectID;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });
let sitemap;

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

router.get('/', (req, res, next) => {
  if (req.session.user) {
    postData.findTodayPosts().then((posts) => {
      res.render('home', { title: 'Thintry - Microblog', description: "Thintry's microblogging platform to share, discover, and connect with a community of thinkers. Unleash your ideas and explore intriguing conversations on Thintry's homepage. Sign up now and embark on a journey of meaningful engagement!", keywords: 'home', page: 'home', posts, style: 'home', user: req.session.user });
    })
      .catch((error) => {
        //console.error(error);
        // Handle the error, such as rendering an error page or sending an error response
        res.render('error', { message: 'An error occurred while fetching trending posts.' });
      });
  } else {
    postData.findTodayPosts()
      .then((posts) => {
        res.render('home', { title: 'Thintry', description: 'Discover a vibrant online community where you can connect with friends, share your thoughts, and explore exciting content. Join Thintry today and experience social networking like never before.', keywords: 'home', page: 'home', posts, style: 'home' });
      })
      .catch((error) => {
        console.error(error);
        // Handle the error, such as rendering an error page or sending an error response
        res.render('error', { message: 'An error occurred while fetching trending posts.' });
      });
  }
});


router.get('/messages', ifLogIn, (req, res, next) => {
  res.render('messages', { title: 'Messages - Thintry', page: 'messages', style: 'messages' });
});

router.get('/notifications', ifLogIn, (req, res, next) => {
  // userData.getNotifications(req.session.user._id)
  //   .then((not) => {
      res.render('notifications', { title: 'Notifications - Thintry', page: 'notifications', style: 'notifications' });
    // })
    // .catch((error) => {
    //   console.error("Error fetching notifications:", error);
    //   // Handle the error appropriately, such as sending an error response or rendering an error page.
    // });
})

router.get('/user/:username', (req, res, next) => {
  userData.fetchProfile(req.params.username.toLowerCase())
    .then((profile) => {
      if (req.session.user) {
        if (req.params.username.toLowerCase() == req.session.user.username) {
          res.redirect('/profile')
        } else {
          if (profile) {
            userData.ifFollowing(req.session.user._id, profile._id).then((isFollowing) => {
              userData.isFollowingBack(req.session.user._id, profile._id).then((isFollowingBack) => {
                if (req.query.type == 'about') {
                  res.render('user', {
                    title: profile.firstname + ' ' + profile.lastname + ' @' + profile.username + ' - Thintry',
                    description: profile.about,
                    keywords: `${profile.username}, ${profile.firstname}, ${profile.lastname}`,
                    page: 'user',
                    profile: profile,
                    type: 'about',
                    style: 'profile',
                    ogimage: profile.profile,
                    user: req.session.user,
                    isFollowing,
                    isFollowingBack
                  });
                } else {
                  postData.findUserPosts(profile._id)
                    .then((posts) => {
                      res.render('user', {
                        title: profile.firstname + ' ' + profile.lastname + ' @' + profile.username + ' - Thintry',
                        description: profile.about,
                        keywords: `${profile.username}, ${profile.firstname}, ${profile.lastname}`,
                        page: 'user',
                        profile: profile,
                        type: 'posts',
                        style: 'profile',
                        ogimage: profile.profile,
                        posts,
                        user: req.session.user,
                        isFollowing,
                        isFollowingBack
                      });
                    })
                }
              })
            })
          } else {
            res.render('user', {
              title: 'No profile found - Thintry',
              description: 'No profile found.',
              page: 'user',
              type: 'posts',
              style: 'profile',
              user: req.session.user
            });
          }
        }
      } else {
        if (profile) {
          if (req.query.type == 'about') {
            res.render('user', {
              title: profile.firstname + ' ' + profile.lastname + ' @' + profile.username + ' - Thintry',
              description: profile.about,
              keywords: `${profile.username}, ${profile.firstname}, ${profile.lastname}`,
              page: 'user',
              profile: profile,
              type: 'about',
              style: 'profile',
              ogimage: profile.profile
            });
          } else {
            postData.findUserPosts(profile._id)
              .then((posts) => {
                res.render('user', {
                  title: profile.firstname + ' ' + profile.lastname + ' @' + profile.username + ' - Thintry',
                  description: profile.about,
                  keywords: `${profile.username}, ${profile.firstname}, ${profile.lastname}`,
                  page: 'user',
                  profile: profile,
                  type: 'posts',
                  style: 'profile',
                  ogimage: profile.profile,
                  posts
                });
              })
          }
        } else {
          res.render('user', {
            title: 'No profile found - Thintry',
            description: 'No profile found.',
            page: 'user',
            type: 'posts',
            style: 'profile',
            user: req.session.user
          });
        }
      }
    })
    .catch((error) => {
      console.error('Error fetching profile:', error);
      res.render('error', { message: 'An error occurred while fetching trending posts.' });
    });
});

router.get('/profile', ifLogIn, (req, res, next) => {
  userData.fetchProfile(req.session.user.username).then((user) => {
    req.session.user = user;
    req.session.user.logged = true;
    if (req.query.type == 'about') {
      res.render('profile', {
        title: req.session.user.firstname + ' ' + req.session.user.lastname + ' - Thintry',
        description: req.session.user.about,
        page: 'user',
        user: req.session.user,
        type: 'about',
        style: 'profile',
        ogimage: req.session.user.profile
      });
    } else {
      postData.findUserPosts(req.session.user._id)
        .then((posts) => {
          res.render('profile', {
            title: req.session.user.firstname + ' ' + req.session.user.lastname + ' - Thintry',
            description: req.session.user.about,
            page: 'user',
            user: req.session.user,
            type: 'posts',
            posts,
            style: 'profile',
            ogimage: req.session.user.profile
          });
        })
        .catch((error) => {
          console.error('Error fetching posts:', error);
          res.render('error', { message: 'An error occurred while fetching trending posts.' });
        });
    }
  }).catch((error) => {
    console.error('Error fetching posts:', error);
    res.render('error', { message: 'An error occurred while fetching trending posts.' });
  });
});

router.get('/followers/:profileId', ifLogIn, (req, res, next) => {
  userData.findFollowers(req.params.profileId).then((followers) => {
    res.render('followers', {
      title: 'Followers - Thintry',
      page: 'nohead',
      user: req.session.user,
      style: 'home',
      followers
    });
  }).catch((error) => {
    console.error('Error fetching posts:', error);
    res.render('error', { message: 'An error occurred while fetching trending posts.' });
  });
})

router.get('/followings/:profileId', ifLogIn, (req, res, next) => {
  userData.findFollowings(req.params.profileId).then((followings) => {
    res.render('followings', {
      title: 'Followings - Thintry',
      page: 'nohead',
      user: req.session.user,
      style: 'home',
      followings
    });
  }).catch((error) => {
    console.error('Error fetching posts:', error);
    res.render('error', { message: 'An error occurred while fetching trending posts.' });
  });
})

router.get('/search', (req, res, next) => {
  const query = req.query.q; // Get the 'q' query parameter from the URL

  postData.searchPosts(query).then((result) => {
    if (req.session.user) {
      res.render('result', { title: 'Search results for ' + query + ' - Thintry', page: 'nohead', style: 'results', result, query: query, user: req.session.user });
    } else {
      res.render('result', { title: 'Search results for ' + query + ' - Thintry', page: 'nohead', style: 'results', result, query: query });
    }
  }).catch((error) => {
    // Handle errors here
    console.error('Error in search:', error);
    res.status(500).send('An error occurred while searching.');
  });
});

router.get('/settings', ifLogIn, (req, res, next) => {
  res.render('settings', { title: 'Settings - Thintry', page: 'nohead', style: 'results', user: req.session.user, style: 'settings' });
})

router.get('/logout', ifLogIn, (req, res, next) => {
  req.session = null;
  res.redirect('/auth/login');
})

router.post('/profile/update', ifLogIn, (req, res, next) => {
  userData.checkUsername(req.body.username.replace('@', '').toLowerCase()).then(async (status) => {
    if (status) {
      if (req.files) {
        req.files.profile.mv(__dirname + '/../public/profile/' + req.session.user._id + '.jpeg');
        req.body.profile = await '/profile/' + req.session.user._id + '.jpeg';
      } else {
        req.body.profile = await req.session.user.profile;
      }
      userData.updateUser(req.body, status).then((user) => {
        req.session.user = user;
        req.session.user.logged = true;
        res.redirect('/profile')
      }).catch((error) => {
        console.error('Error in update:', error);
        res.status(500).send('An error occurred while searching.');
      })
    } else {
      if (req.files) {
        req.files.profile.mv(__dirname + '/../public/profile/' + req.session.user._id + '.jpeg');
        req.body.profile = await '/profile/' + req.session.user._id + '.jpeg';
      } else {
        req.body.profile = await req.session.user.profile;
      }
      userData.updateUser(req.body).then((user) => {
        req.session.user = user;
        req.session.user.logged = true;
        res.redirect('/profile')
      }).catch((error) => {
        console.error('Error in update:', error);
        res.status(500).send('An error occurred while searching.');
      })
    }
  })
})

router.get('/pages/privacypolicy', (req, res, next) => {
  res.render('privacypolicy', { title: 'Privacy Policy - Thintry', page: 'nohead', style: 'results', user: req.session.user, style: 'settings' });
})

router.get('/pages/termsandconditions', (req, res, next) => {
  res.render('terms', { title: 'Terms And Conditions - Thintry', page: 'nohead', style: 'results', user: req.session.user, style: 'settings' });
})

router.get('/pages/communityguidelines', (req, res, next) => {
  res.render('guidelines', { title: 'Community Guidelines - Thintry', page: 'nohead', style: 'results', user: req.session.user, style: 'settings' });
})

//SEO
router.get('/robots.txt', (req, res, next) => {
  res.set('Content-Type', 'text/plain')
  res.send('User-agent: *\nAllow: /\nAllow: /user/*\nAllow: /search?q=*\nAllow: /auth/login\nAllow: /auth/signup\nAllow: /pages/privacypolicy\nAllow: /pages/termsandconditions\nAllow: /pages/communityguidelines\n\nSitemap: https://thintry.com/sitemap.xml')
})

router.get('/sitemap.xml', function (req, res) {
  // res.sendFile(__dirname + '/sitemap.xml');
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');
  // if we have a cached entry send it
  if (sitemap) {
    res.send(sitemap)
    return
  }

  try {
    const smStream = new SitemapStream({ hostname: 'https://thintry.com/' })
    const pipeline = smStream.pipe(createGzip())

    // pipe your entries or directly write them.
    smStream.write({ url: '/', changefreq: 'daily', priority: 0.3 })
    smStream.write({ url: '/auth/login', changefreq: 'weekly', priority: 0.7 })
    smStream.write({ url: '/auth/signup', changefreq: 'weekly', priority: 0.7 })
    smStream.write({ url: '/search', changefreq: 'weekly', priority: 0.7 })
    smStream.write({ url: '/pages/termsandconditions', changefreq: 'weekly', priority: 0.7 })
    smStream.write({ url: '/pages/privacypolicy', changefreq: 'weekly', priority: 0.7 })
    smStream.write({ url: '/pages/communityguidelines', changefreq: 'weekly', priority: 0.7 })

    // cache the response
    streamToPromise(pipeline).then(sm => sitemap = sm)
    // make sure to attach a write stream such as streamToPromise before ending
    smStream.end()
    // stream write the response
    pipeline.pipe(res).on('error', (e) => { throw e })
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
});

//require('./sitemap');

module.exports = router;
