var express = require('express');
var router = express.Router();
const sanitizeHtml = require('sanitize-html');
let userData = require('../db/user.js')
let postData = require('../db/post.js')
const ObjectId = require('mongodb').ObjectID;

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

router.get('/:postId', (req, res, next) => {
  postData.findPost(req.params.postId).then((post) => {
    if (req.session.user && (post.author._id == req.session.user._id)) {
      res.render('postlist', { title: 'A post by "' + post.author.firstname + ' ' + post.author.lastname + '" - Thintry', description: post.content.replace(/(<([^>]+)>)/gi, ""), keywords: post.content.replace(/(<([^>]+)>)/gi, ""), user: req.session.user, post, page: 'nohead', isOwner: true, style: 'profile', noload: true })
    } else {
      res.render('postlist', { title: 'A post by "' + post.author.firstname + ' ' + post.author.lastname + '" - Thintry', description: post.content.replace(/(<([^>]+)>)/gi, ""), keywords: post.content.replace(/(<([^>]+)>)/gi, ""), user: req.session.user, post, page: 'nohead', style: 'profile', noload: true })
    }
  }).catch((error) => {
    console.error('Error creating new post:', error);
    res.render('error', { message: 'An error occurred while fetching trending posts.' });
  });
})

router.post('/new', ifLogIn, (req, res, next) => {
  const sanitizedContent = sanitizeHtml(req.body.content, {
    allowedTags: [], // Remove all HTML tags
    allowedAttributes: {} // No attributes allowed
  });

  postData.newPost(req.session.user._id, sanitizedContent)
    .then((post) => {
      res.redirect('/post/' + post.insertedId);
    })
    .catch((error) => {
      console.error('Error creating new post:', error);
      res.render('error', { message: 'An error occurred while fetching trending posts.' });
    });
});

router.post('/reply', ifLogIn, (req, res, next) => {
  const sanitizedContent = sanitizeHtml(req.body.content, {
    allowedTags: [], // Remove all HTML tags
    allowedAttributes: {} // No attributes allowed
  });

  postData.newReply(req.session.user._id, req.body.post_id, sanitizedContent, req.session.user)
    .then((postId) => {
      res.redirect('/post/' + postId);
    })
    .catch((error) => {
      console.error('Error deleting post:', error);
      res.render('error', { message: 'An error occurred while deleting posts.', status: 500 });
    });
});

module.exports = router;