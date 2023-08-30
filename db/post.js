const db = require('./config.js');
const COLLECTIONS = require('./cls.js');
var Filter = require('bad-words');
var badFilter = new Filter({ placeHolder: 'x', replaceRegex: /[A-Za-z0-9가-힣_]/g, regex: /\*|\.|$/gi });
var profanity = require("profanity-hindi");
const ObjectId = require('mongodb').ObjectID;
const uuid = require('uuid');

var nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: 'noreply.thintry@gmail.com',
        pass: process.env.SMTP_PASS
    }
});

let sendMail = (data) => {
    setTimeout(() => {
        transporter.sendMail({
            from: '"Thintry" noreply.thintry@gmail.com',
            to: data.email,
            subject: data.subject,
            text: data.text,
            html: data.content
        });
    }, 10);
    return;
}


let notify = async (data) => {

}

module.exports = {
    newPost: (userId, content) => {
        return new Promise((resolve, reject) => {
            const timestamp = new Date(); // Get the current timestamp
            const postData = {
                user: ObjectId(userId), // Assuming userId is the ID of the user creating the post
                content: profanity.maskBadWords(badFilter.clean(content)),
                timestamp: timestamp,
                upvote: [],
                downvote: []
            };

            const regex = /@([a-zA-Z0-9_]+)/g;
            const usernames = content.match(regex);
            if (content.match(regex)) {
                db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(userId) }).then((client) => {
                    usernames.forEach(username => {
                        db.get().collection(COLLECTIONS.USERS).findOne({ username: username.toLowerCase().replace(/@/g, '') }).then((user) => {
                            if (user) {
                                sendMail({
                                    email: user.email,
                                    subject: `${client.firstname} ${client.lastname} mentioned you!`,
                                    text: `Hello ${user.firstname}, ${client.firstname} ${client.lastname} mentioned you!`,
                                    content: `${profanity.maskBadWords(badFilter.clean(content))}\n\n - <a href="https://thintry.com/user/${client.username}">${client.firstname} ${client.lastname}</a>`
                                });
                            }
                        }).catch((error) => {
                            reject(error);
                        });
                    });
                }).catch((error) => {
                    reject(error);
                });
            }

            db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(userId) }).then((client) => {
                if (content.toLowerCase().includes("@everyone") && client.official) {
                    setTimeout(async () => {
                        let users = await db.get().collection(COLLECTIONS.USERS).find().toArray();
                        users.forEach(user => {
                            sendMail({
                                email: user.email,
                                subject: "Something important!",
                                text: `Hello ${user.firstname}, important post by `,
                                content: `${profanity.maskBadWords(badFilter.clean(content))}\n\n - <a href="https://thintry.com/user/${client.username}">${client.firstname} ${client.lastname}</a>`
                            });
                        });
                    }, 1000);
                }
            }).catch((error) => {
                reject(error);
            });

            db.get().collection(COLLECTIONS.POSTS).insertOne(postData)
                .then((post) => {
                    resolve(post);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },

    newReply: (userId, postId, content, user) => {
        return new Promise((resolve, reject) => {
            const timestamp = new Date(); // Get the current timestamp
            const replyData = {
                post_id: ObjectId(postId),
                user_id: ObjectId(userId), // Assuming userId is the ID of the user creating the post
                content: profanity.maskBadWords(badFilter.clean(content)),
                timestamp: timestamp,
                upvote: [],
                downvote: []
            };

            const regex = /@([a-zA-Z0-9_]+)/g;
            const usernames = content.match(regex);
            if (content.match(regex)) {
                db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(userId) }).then((client) => {
                    usernames.forEach(username => {
                        db.get().collection(COLLECTIONS.USERS).findOne({ username: username.toLowerCase().replace(/@/g, '') }).then((user) => {
                            if (user) {
                                sendMail({
                                    email: user.email,
                                    subject: `${client.firstname} ${client.lastname} mentioned you!`,
                                    text: `Hello ${user.firstname}, ${client.firstname} ${client.lastname} mentioned you!`,
                                    content: `${profanity.maskBadWords(badFilter.clean(content))}\n\n - <a href="https://thintry.com/user/${client.username}">${client.firstname} ${client.lastname}</a>`
                                });
                            }
                        }).catch((error) => {
                            reject(error);
                        });
                    });
                }).catch((error) => {
                    reject(error);
                });
            }

            db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(postId) }).then((clientPost) => {
                db.get().collection(COLLECTIONS.REPLIES).insertOne(replyData)
                    .then((reply) => {
                        db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(clientPost.user) }).then((client) => {
                            if (client._id.toString() !== userId.toString()) {
                                sendMail({
                                    email: client.email,
                                    subject: "New Reply Notification",
                                    text: `Hello ${client.firstname},<br><br>We're reaching out to inform you about a new reply to your post.`,
                                    content: `Dear ${client.firstname},<br><br>We wanted to let you know that ${user.firstname} has replied to your post. You can view the reply and the original post <a href='https://thintry.com/post/${postId}'>here</a>.<br><br>Best regards,<br>Thintry`
                                });
                            }
                            resolve(postId);
                        }).catch((error) => {
                            reject(error);
                        });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    findUserPosts: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.POSTS).aggregate([
                {
                    $match: {
                        user: ObjectId(userId)
                    }
                },
                {
                    $sort: {
                        timestamp: -1
                    }
                }
            ]).toArray()
                .then((posts) => {
                    resolve(posts);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },
    delPost: (postId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(userId) }).then((user) => {
                sendMail({
                    email: user.email,
                    subject: "Post Deletion Notification",
                    text: `Hello ${user.firstname},<br><br>We're writing to inform you about the deletion of one of your posts.`,
                    content: `Dear ${user.firstname},<br><br>We wanted to let you know that your post "${postId}" has been successfully deleted. If you have any questions or concerns, feel free to contact us.<br><br>Best regards,<br>Thintry`
                });

                db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(postId), user: ObjectId(userId) }).then((post) => {
                    if (!post) {
                        reject({ status: 404, message: 'Post not found!' })
                    } else {
                        db.get().collection(COLLECTIONS.BIN).insertOne(post).then((binPost) => {
                            db.get().collection(COLLECTIONS.POSTS).deleteOne({ _id: post._id }).then((res) => {
                                resolve(res)
                            }).catch((error) => {
                                reject(error);
                            });
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                })
            }).catch((error) => {
                reject(error);
            });;
        });
    },
    delReply: (replyId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(userId) }).then((user) => {
                sendMail({
                    email: user.email,
                    subject: "Reply Deletion Notification",
                    text: `Hello ${user.firstname},<br><br>We're writing to inform you about the deletion of one of your replies.`,
                    content: `Dear ${user.firstname},<br><br>We wanted to let you know that your reply "${replyId}" has been successfully deleted. If you have any questions or concerns, feel free to reach out to us.<br><br>Best regards,<br>Thintry`
                });
                db.get().collection(COLLECTIONS.REPLIES).findOne({ _id: ObjectId(replyId), user_id: ObjectId(userId) }).then((reply) => {
                    if (!reply) {
                        reject({ status: 404, message: 'Post not found!' })
                    } else {
                        db.get().collection(COLLECTIONS.BIN).insertOne(reply).then((binReply) => {
                            db.get().collection(COLLECTIONS.REPLIES).deleteOne({ _id: reply._id }).then((res) => {
                                resolve(res)
                            }).catch((error) => {
                                reject(error);
                            });
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                })
            }).catch((error) => {
                reject(error);
            });;
        });
    },
    findTodayPosts: () => {
        return new Promise((resolve, reject) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set the time to the beginning of the day

            db.get().collection(COLLECTIONS.POSTS).aggregate([
                {
                    $match: {
                        timestamp: { $gte: today }
                    }
                },
                {
                    $sort: {
                        timestamp: -1
                    }
                },
                {
                    $lookup: {
                        from: COLLECTIONS.USERS, // Replace with the actual collection name for users
                        localField: 'user',
                        foreignField: '_id',
                        as: 'author'
                    }
                },
                {
                    $unwind: {
                        path: '$author',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        author: 1,
                        content: 1,
                        timestamp: 1,
                        upvote: 1,
                        downvote: 1
                    }
                }
            ]).toArray()
                .then((todayPosts) => {
                    resolve(todayPosts);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },
    findPost: (postId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.POSTS).aggregate([
                {
                    $match: { _id: ObjectId(postId) }
                },
                {
                    $lookup: {
                        from: COLLECTIONS.REPLIES,
                        localField: '_id',
                        foreignField: 'post_id',
                        as: 'replies'
                    }
                },
                {
                    $lookup: {
                        from: COLLECTIONS.USERS,
                        localField: 'user',
                        foreignField: '_id',
                        as: 'author'
                    }
                },
                {
                    $unwind: {
                        path: '$author',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$replies',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: COLLECTIONS.USERS,
                        localField: 'replies.user_id',
                        foreignField: '_id',
                        as: 'replies.author'
                    }
                },
                {
                    $addFields: {
                        'replies.author': { $arrayElemAt: ['$replies.author', 0] } // Get the first element as the reply author object
                    }
                },
                {
                    $group: {
                        _id: '$_id',
                        author: { $first: '$author' },
                        content: { $first: '$content' },
                        timestamp: { $first: '$timestamp' },
                        upvote: { $first: '$upvote' },
                        downvote: { $first: '$downvote' },
                        replies: { $push: '$replies' }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        author: 1,
                        content: 1,
                        timestamp: 1,
                        upvote: 1,
                        downvote: 1,
                        replies: 1
                    }
                }
            ]).toArray()
                .then((postsWithReplies) => {
                    if (postsWithReplies.length === 0) {
                        reject({ status: 404, message: 'Post not found!' });
                    } else {
                        resolve(postsWithReplies[0]);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },
    addVote: (postId, voteType, user) => {
        return new Promise((resolve, reject) => {
            const voteData = {
                user: ObjectId(user._id),
                post: ObjectId(postId),
                type: voteType
            };

            if (voteData.type === 'up') {
                db.get().collection(COLLECTIONS.POSTS).findOne({ _id: voteData.post }).then((post) => {
                    if (post.downvote.map(user => user.toString()).includes(voteData.user.toString())) {
                        db.get().collection(COLLECTIONS.POSTS).updateOne(
                            { _id: voteData.post },
                            { $pull: { downvote: voteData.user } }
                        )
                    }
                    if (post.upvote.map(user => user.toString()).includes(voteData.user.toString())) {
                        db.get().collection(COLLECTIONS.POSTS).updateOne(
                            { _id: voteData.post },
                            { $pull: { upvote: voteData.user } }
                        ).then(() => {
                            resolve({ status: 204, message: 'Upvote removed' });
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        db.get().collection(COLLECTIONS.USERS).findOne({ _id: post.user }).then((author) => {
                            if (user._id.toString() !== author._id.toString()) {
                                sendMail({
                                    email: author.email,
                                    subject: "Upvote Notification for Your Post",
                                    text: `Hello ${author.firstname},\n\n${user.username} has upvoted your post.`,
                                    content: `Dear ${author.firstname},\n\nWe're excited to inform you that your <a href='https://thintry.com/post/${postId}'>post</a> has received an upvote from ${user.username}. Your contributions are appreciated! If you have any queries or wish to engage with the community, don't hesitate to get in touch.\n\nBest regards,\nThintry`
                                });
                            }
                        })
                        db.get().collection(COLLECTIONS.POSTS).updateOne(
                            { _id: voteData.post },
                            { $addToSet: { upvote: voteData.user } }
                        ).then(() => {
                            resolve({ status: 203, message: 'Upvoted' });
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } else if (voteData.type === 'down') {
                db.get().collection(COLLECTIONS.POSTS).findOne({ _id: voteData.post }).then((post) => {
                    if (post.upvote.map(user => user.toString()).includes(voteData.user.toString())) {
                        db.get().collection(COLLECTIONS.POSTS).updateOne(
                            { _id: voteData.post },
                            { $pull: { upvote: voteData.user } }
                        )
                    }
                    if (post.downvote.map(user => user.toString()).includes(voteData.user.toString())) {
                        db.get().collection(COLLECTIONS.POSTS).updateOne(
                            { _id: voteData.post },
                            { $pull: { downvote: voteData.user } }
                        ).then(() => {
                            resolve({ status: 206, message: 'Downvote removed' });
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        db.get().collection(COLLECTIONS.USERS).findOne({ _id: post.user }).then((author) => {
                            if (user._id.toString() !== author._id.toString()) {
                                sendMail({
                                    email: author.email,
                                    subject: "Downvote Notification for Your Post",
                                    text: `Hello ${author.firstname},\n\n${user.username} has downvoted your post.`,
                                    content: `Dear ${author.firstname},\n\nWe wanted to inform you that your <a href='https://thintry.com/post/${postId}'>post</a> has received a downvote from ${user.username}. Your contributions are valued, and we encourage you to continue engaging with the community. If you have any questions or feedback, feel free to reach out.\n\nBest regards,\nThintry`
                                });
                            }
                        })
                        db.get().collection(COLLECTIONS.POSTS).updateOne(
                            { _id: voteData.post },
                            { $addToSet: { downvote: voteData.user } }
                        ).then(() => {
                            resolve({ status: 205, message: 'Downvoted' });
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject({ status: 400, message: 'Invalid vote type.' });
            }
        });
    },
    addReplyVote: (postId, voteType, user, replyId) => {
        return new Promise((resolve, reject) => {
            const voteData = {
                user: ObjectId(user._id),
                post: ObjectId(postId),
                type: voteType
            };

            if (voteData.type === 'up') {
                db.get().collection(COLLECTIONS.REPLIES).findOne({ _id: voteData.post }).then((post) => {
                    if (post.downvote.map(user => user.toString()).includes(voteData.user.toString())) {
                        db.get().collection(COLLECTIONS.REPLIES).updateOne(
                            { _id: voteData.post },
                            { $pull: { downvote: voteData.user } }
                        )
                    }
                    if (post.upvote.map(user => user.toString()).includes(voteData.user.toString())) {
                        db.get().collection(COLLECTIONS.REPLIES).updateOne(
                            { _id: voteData.post },
                            { $pull: { upvote: voteData.user } }
                        ).then(() => {
                            resolve({ status: 204, message: 'Upvote removed' });
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        db.get().collection(COLLECTIONS.USERS).findOne({ _id: post.user_id }).then((author) => {
                            if (user._id.toString() !== author._id.toString()) {
                                sendMail({
                                    email: author.email,
                                    subject: "Upvote Notification for Your Reply",
                                    text: `Hello ${author.firstname},\n\n${user.username} has upvoted your reply.`,
                                    content: `Dear ${author.firstname},\n\nWe're excited to inform you that your <a href='https://thintry.com/post/${replyId}'>reply</a> has received an upvote from ${user.username}. Your contributions are appreciated! If you have any queries or wish to engage with the community, don't hesitate to get in touch.\n\nBest regards,\nThintry`
                                });
                            }
                        })
                        db.get().collection(COLLECTIONS.REPLIES).updateOne(
                            { _id: voteData.post },
                            { $addToSet: { upvote: voteData.user } }
                        ).then(() => {
                            resolve({ status: 203, message: 'Upvoted' });
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } else if (voteData.type === 'down') {
                db.get().collection(COLLECTIONS.REPLIES).findOne({ _id: voteData.post }).then((post) => {
                    if (post.upvote.map(user => user.toString()).includes(voteData.user.toString())) {
                        db.get().collection(COLLECTIONS.REPLIES).updateOne(
                            { _id: voteData.post },
                            { $pull: { upvote: voteData.user } }
                        )
                    }
                    if (post.downvote.map(user => user.toString()).includes(voteData.user.toString())) {
                        db.get().collection(COLLECTIONS.REPLIES).updateOne(
                            { _id: voteData.post },
                            { $pull: { downvote: voteData.user } }
                        ).then(() => {
                            resolve({ status: 206, message: 'Downvote removed' });
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        db.get().collection(COLLECTIONS.USERS).findOne({ _id: post.user_id }).then((author) => {
                            if (user._id.toString() !== author._id.toString()) {
                                sendMail({
                                    email: author.email,
                                    subject: "Downvote Notification for Your Reply",
                                    text: `Hello ${author.firstname},\n\n${user.username} has downvoted your reply.`,
                                    content: `Dear ${author.firstname},\n\nWe wanted to inform you that your <a href='https://thintry.com/post/${replyId}'>reply</a> has received a downvote from ${user.username}. Your contributions are valued, and we encourage you to continue engaging with the community. If you have any questions or feedback, feel free to reach out.\n\nBest regards,\nThintry`
                                });
                            }
                        })
                        db.get().collection(COLLECTIONS.REPLIES).updateOne(
                            { _id: voteData.post },
                            { $addToSet: { downvote: voteData.user } }
                        ).then(() => {
                            resolve({ status: 205, message: 'Downvoted' });
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject({ status: 400, message: 'Invalid vote type.' });
            }
        });
    },
    searchPosts: (query) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.POSTS).aggregate([
                {
                    $match: {
                        content: {
                            $regex: query,
                            $options: 'i' // Case-insensitive search
                        }
                    }
                },
                {
                    $sort: {
                        timestamp: -1
                    }
                },
                {
                    $lookup: {
                        from: COLLECTIONS.USERS,
                        localField: 'user',
                        foreignField: '_id',
                        as: 'author'
                    }
                },
                {
                    $unwind: {
                        path: '$author',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        author: 1,
                        content: 1,
                        timestamp: 1,
                        upvote: 1,
                        downvote: 1
                    }
                }
            ]).toArray()
                .then((posts) => {
                    resolve(posts);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }
};
