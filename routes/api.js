var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
let userData = require('../db/user.js')
let postData = require('../db/post.js')
const ObjectId = require('mongodb').ObjectID;

function ifLogIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.json({ error: { status: 401, message: 'Unauthorized response.' } });
    }
}

router.get('/check-username', (req, res, next) => {
    userData.checkUsername(req.query.username.replace('@', '').toLowerCase()).then((status) => {
        if (status) {
            res.json({ exist: true })
        } else {
            res.json({ exist: false })
        }
    })
});

router.post('/follow', ifLogIn, (req, res, next) => {
    userData.addFollow(req.session.user._id, req.body.profileId)
        .then((retu) => {
            res.json({ error: { status: 200, message: 'Succesfullly Followed' } });
        })
        .catch((error) => {
            console.error('Error following user:', error);
            res.json({ error: { status: 500, message: 'Internal Server Error!' } });
        });
});

router.post('/unfollow', ifLogIn, (req, res, next) => {
    userData.delFollow(req.session.user._id, req.body.profileId)
        .then((retu) => {
            res.json({ error: { status: 200, message: 'Succesfullly UnFollowed' } });
        })
        .catch((error) => {
            console.error('Error following user:', error);
            res.json({ error: { status: 500, message: 'Internal Server Error!' } });
        });
});

router.post('/post/delete', ifLogIn, (req, res, next) => {
    postData.delPost(req.body.postId, req.session.user._id).then(() => {
        res.json({ error: { status: 200, message: 'Succesfullly deleted post' } });
    }).catch((error) => {
        console.error('Error deleting post:', error);
        res.json({ error: { status: 500, message: 'Internal Server Error!' } });
    });
})

router.post('/reply/delete', ifLogIn, (req, res, next) => {
    postData.delReply(req.body.replyId, req.session.user._id).then(() => {
        res.json({ error: { status: 200, message: 'Succesfullly deleted reply' } });
    }).catch((error) => {
        console.error('Error deleting post:', error);
        res.json({ error: { status: 500, message: 'Internal Server Error!' } });
    });
})

router.post('/vote', ifLogIn, (req, res, next) => {
    if (req.body.ifreply) {
        postData.addReplyVote(req.body.postId, req.body.voteType, req.session.user, req.body.reply).then((re) => {
            res.json({ error: { status: re.status, message: re.message } });
        }).catch((error) => {
            console.error('Error deleting post:', error);
            res.json({ error: { status: 500, message: 'Internal Server Error!' } });
        });
    } else {
        postData.addVote(req.body.postId, req.body.voteType, req.session.user).then((re) => {
            res.json({ error: { status: re.status, message: re.message } });
        }).catch((error) => {
            console.error('Error deleting post:', error);
            res.json({ error: { status: 500, message: 'Internal Server Error!' } });
        });
    }
})

module.exports = router;