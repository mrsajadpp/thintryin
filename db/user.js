let db = require('./config.js')
let COLLECTIONS = require('./cls.js')
const ObjectId = require('mongodb').ObjectID;
var bcrypt = require('bcrypt');
const schedule = require('node-schedule');
const saltRounds = 10;
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

// ...

function findUniqueValues(arr) {
    const uniqueValues = [];
    const seenValues = {};

    for (const value of arr) {
        if (!seenValues[value]) {
            uniqueValues.push(value);
            seenValues[value] = true;
        }
    }

    return uniqueValues;
}

const removeDuplicateFollowersAndFollowings = async () => {
    try {
        const users = await db.get().collection(COLLECTIONS.USERS).find({}).toArray();

        for (const user of users) {
            const uniqueFollowers = await findUniqueValues(user.followers);
            const uniqueFollowings = await findUniqueValues(user.followings);

            await db.get().collection(COLLECTIONS.USERS).updateOne(
                { _id: user._id },
                { $set: { followers: uniqueFollowers, followings: uniqueFollowings } }
            );
        }

        console.log("Duplicate followers and followings removed successfully.");
    } catch (error) {
        console.error("Error removing duplicate followers and followings:", error);
    }
};

schedule.scheduleJob('*/7 * * * *', () => {
    try {
        removeDuplicateFollowersAndFollowings();
    } catch (error) {
        console.log(error);
    }
});

// ...


const delUn = () => {
    setTimeout(async () => {
        try {
            let users = await db.get().collection(COLLECTIONS.USERS).find({ status: false }).toArray();
            for (const user of users) {
                await db.get().collection(COLLECTIONS.USERS).deleteOne({ _id: user._id });
            }
        } catch (error) {
            console.error("Error in delUn:", error);
        }
    }, 1000);
}

const updateOtp = () => {
    setTimeout(async () => {
        try {
            let users = await db.get().collection(COLLECTIONS.USERS).find({ status: false }).toArray();
            for (const user of users) {
                let verification_code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                    { _id: user._id },
                    { $set: { verification_code: verification_code, encrypted_verification_code: await bcrypt.hash(verification_code, saltRounds) } }
                );
            }
        } catch (error) {
            console.error("Error in updateOtp:", error);
        }
    }, 1000);
}

schedule.scheduleJob('*/7 * * * *', () => {
    delUn();
});

schedule.scheduleJob('*/7 * * * *', () => {
    updateOtp();
});

module.exports = {
    createUser: (userData, locationData) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.USERS).findOne({ username: userData.username })
                .then(async (user) => {
                    try {
                        if (!user) {
                            let verification_code = await Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                            let newUserData = await {
                                username: userData.username.toLowerCase(),
                                firstname: userData.firstname,
                                lastname: userData.lastname,
                                email: userData.email,
                                about: 'Iam a Thintry user!',
                                password: await bcrypt.hash(userData.password, saltRounds),
                                verified: false,
                                official: false,
                                status: false,
                                profile: 'https://i.postimg.cc/6qBY4CDQ/unknown.jpg',
                                created: {
                                    timestamp: new Date(),
                                    location: {
                                        region: locationData.region || 'Kerala',
                                        country: locationData.country || 'IN'
                                    }
                                },
                                followers: [],
                                followings: [],
                                verification_code: verification_code,
                                encrypted_verification_code: bcrypt.hash(verification_code, saltRounds)
                            }

                            db.get().collection(COLLECTIONS.USERS).insertOne(newUserData)
                                .then((user) => {
                                    db.get().collection(COLLECTIONS.USERS).findOne({ _id: user.insertedId })
                                        .then((user) => {
                                            sendMail({
                                                email: newUserData.email,
                                                subject: "Your Verification Code",
                                                text: "Your Verification Code is " + newUserData.verification_code,
                                                content: `
                                                    <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                                                        style="font-family: 'Open Sans', sans-serif;">
                                                        <tr>
                                                            <td>
                                                                <table style="background-color: #f2f3f8; max-width:670px; margin:0 auto;" width="100%" border="0"
                                                                    align="center" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td style="height:80px;">&nbsp;</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="text-align:center;">
                                                                            <a href="https://thintry.com/" title="logo" target="_blank">
                                                                                <img width="200" src="https://i.postimg.cc/SsgJL0SN/thintry-logo.png"
                                                                                    title="logo" alt="logo">
                                                                            </a>
                                                                            <br>
                                                                            <h1 style="color:#1e1e2d; font-weight:500; margin:0; font-size:22px; font-family:'Rubik',sans-serif; margin-top: 30px;">
                                                                                Your Verification Code is Ready</h1>
                                                                            <span style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                                                            <p style="color:#455056; font-size:15px; line-height:24px; margin:0;">
                                                                                Thank you for choosing Thintry. Your verification code is valid for 7 minutes. Please do not share it with anyone.
                                                                            </p>
                                                                            <a href="javascript:void(0);"
                                                                                style="background:#6fbf7e; text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff; text-transform:uppercase; font-size:14px; padding:10px 24px; display:inline-block; border-radius:50px;">
                                                                                CODE : ${newUserData.verification_code}</a>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>`
                                            });
                                            resolve(user);
                                        })
                                        .catch((error) => {
                                            reject(error);
                                        });
                                })
                                .catch((error) => {
                                    reject(error);
                                });
                        } else {
                            if (user.status) {
                                reject({ message: 'User already exist!', status: 403 });
                            } else {
                                sendMail({
                                    email: user.email,
                                    title: "Your Verification Code!",
                                    text: "Your Verification Code is " + user.verification_code,
                                    content: `<table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                                style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
                                <tr>
                                    <td>
                                        <table style="background-color: #f2f3f8; max-width:670px;  margin:0 auto;" width="100%" border="0"
                                            align="center" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="height:80px;">&nbsp;</td>
                                            </tr>
                                            <tr>
                                                <td style="text-align:center;">
                            
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="height:20px;">&nbsp;</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                                                        style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);">
                                                        <tr>
                                                            <td style="height:40px;">&nbsp;</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:0 35px;"> 
                                                                <a href="https://thintry.com/" title="logo" target="_blank">
                                                                    <img width="200" src="https://i.postimg.cc/SsgJL0SN/thintry-logo.png"
                                                                        title="logo" alt="logo">
                                                                </a>
                                                                <br>
                                                                <h1
                                                                    style="color:#1e1e2d; font-weight:500; margin:0;font-size:22px;font-family:'Rubik',sans-serif; margin-top: 30px;">
                                                                    Your verification code is Ready</h1>
                                                                <span
                                                                    style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                                                <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                                                    Thank you for choosing Thintry, Your verification code is valid for 7 minutes, Don't share with anyone.
                                                                </p>
                                                                <a href="javascript:void(0);"
                                                                    style="background:#6fbf7e;text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;">CODE : ${user.verification_code}</a>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="height:40px;">&nbsp;</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            <tr>
                                                <td style="height:20px;">&nbsp;</td>
                                            </tr>
                                            <tr>
                                                <td style="text-align:center;">
                                                    <p
                                                        style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">
                                                        <strong>https://thintry.com/</strong></p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="height:80px;">&nbsp;</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>`
                                })
                                resolve(user);
                            }
                        }
                    } catch (error) {
                        reject(error);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },
    verify: (data) => {
        return new Promise(async (resolve, reject) => {
            try {
                let isValidOtp = await bcrypt.compare(data.otp, data.encrypted);
                if (isValidOtp) {
                    db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                        { _id: ObjectId(data.uid) },
                        { $set: { status: true }, $unset: { verification_code: '', encrypted_verification_code: '' } },
                        { returnOriginal: false }
                    ).then((result) => {
                        sendMail({
                            email: result.value.email,
                            subject: "Account Created Successfully",
                            text: `Dear ${result.value.firstname} ${result.value.lastname},\n\nYour account was successfully created.`,
                            content: `
                                <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                                    style="font-family: 'Open Sans', sans-serif;">
                                    <tr>
                                        <td>
                                            <table style="background-color: #f2f3f8; max-width:670px; margin:0 auto;" width="100%" border="0"
                                                align="center" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="height:80px;">&nbsp;</td>
                                                </tr>
                                                <tr>
                                                    <td style="text-align:center;">
                                                        <a href="https://thintry.com/" title="logo" target="_blank">
                                                            <img width="200" src="https://i.postimg.cc/SsgJL0SN/thintry-logo.png"
                                                                title="logo" alt="logo">
                                                        </a>
                                                        <br>
                                                        <h1 style="color:#1e1e2d; font-weight:500; margin:0; font-size:22px; font-family:'Rubik',sans-serif; margin-top: 30px;">
                                                            Your Account Has Been Created</h1>
                                                        <span style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                                        <p style="color:#455056; font-size:15px; line-height:24px; margin:0;">
                                                            Dear ${result.value.firstname} ${result.value.lastname},<br>
                                                            Thank you for choosing Thintry. Your account has been successfully created.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>`
                        });
                        resolve(result.value);
                    }).catch((error) => {
                        console.error("Error updating user document:", error);
                        reject(error);
                    });
                } else {
                    reject({ message: "Invalid OTP", status: 404, encrypted_verification_code: data.encrypted });
                }
            } catch (error) {
                console.error("Error comparing OTP:", error);
                reject(error);
            }
        });
    },
    findUser: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.USERS).findOne({ username: data.username.toLowerCase(), status: true }).then(async (user) => {
                let isValidPass = await bcrypt.compare(data.password, user.password);
                if (isValidPass) {
                    sendMail({
                        email: user.email,
                        subject: "New Login Notification",
                        text: `Hello ${user.firstname},<br><br>We wanted to inform you about a recent login activity on your account.`,
                        content: `Dear ${user.firstname},<br><br>We have detected a login attempt on your account at ${new Date().toLocaleString()}. If this was you, you can disregard this message. If you suspect unauthorized access, please take necessary actions to secure your account.<br><br>Best regards,<br>Thintry`
                    });
                    resolve(user);
                } else {
                    reject({ message: "Invalid Password", status: 404 });
                }
            }).catch((error) => {
                console.error("Error finding user:", error);
                reject(error);
            });
        });
    },
    fetchProfile: (username) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.USERS).findOne({ username: username, status: true }).then((user) => {
                resolve(user);
            }).catch((error) => {
                console.error("Error fetching user profile:", error);
                reject(error);
            });
        });
    },
    addFollow: (followerId, followingId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const followerUser = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(followerId) });
                const followingUser = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(followingId) });

                if (!followerUser || !followingUser) {
                    reject({ message: 'Invalid follower or following user', status: 404 });
                    return;
                }

                sendMail({
                    email: followingUser.email,
                    subject: "New Follower Notification",
                    text: `Hello ${followingUser.firstname},<br><br>We're excited to let you know that ${followerUser.username} is now following you.`,
                    content: `Dear ${followingUser.firstname},<br><br>You have a new follower! ${followerUser.username} is now following your updates. You can check out their profile <a href='https://thintry.com/user/${followerUser.username}'>here</a>.<br><br>Best regards,<br>Thintry`
                });

                // Check if the follower is already following the following user
                if (followerUser.followings.includes(ObjectId(followingId)) && followingUser.followers.includes(ObjectId(followerId))) {
                    resolve({ message: 'Already following', status: 200 });
                    return;
                }

                // Update the follower's followings array and the following user's followers array
                const updatedFollower = await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                    { _id: ObjectId(followerId) },
                    { $push: { followings: ObjectId(followingId) } },
                    { returnOriginal: false }
                );

                const updatedFollowingUser = await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                    { _id: ObjectId(followingId) },
                    { $push: { followers: ObjectId(followerId) } },
                    { returnOriginal: false }
                );

                resolve({ message: 'Followed successfully', status: 200 });
            } catch (error) {
                reject(error);
            }
        });
    },
    ifFollowing: (followerId, followingId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.USERS).findOne(
                { _id: ObjectId(followerId), followings: ObjectId(followingId), status: true }
            ).then((follower) => {
                if (follower) {
                    resolve(true); // Follower is following the given user
                } else {
                    resolve(false); // Follower is not following the given user
                }
            }).catch((error) => {
                console.error("Error checking if following:", error);
                reject("Error checking if following.");
            });
        });
    },
    isFollowingBack: (followerId, followingId) => {
        return new Promise((resolve, reject) => {
            // Check if the followed user is also following back
            db.get().collection(COLLECTIONS.USERS).findOne(
                { _id: ObjectId(followingId), followings: ObjectId(followerId), status: true }
            ).then((followingBack) => {
                if (followingBack) {
                    resolve(true); // Follower and followed user are following each other
                } else {
                    resolve(false); // Followed user is not following back
                }
            }).catch((error) => {
                console.error("Error checking if following back:", error);
                reject("Error checking if following back.");
            });
        });
    },
    delFollow: (followerId, followingId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const followerUser = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(followerId) });
                const followingUser = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(followingId) });

                if (!followerUser || !followingUser) {
                    reject({ message: 'Invalid follower or following user', status: 404 });
                    return;
                }

                sendMail({
                    email: followingUser.email,
                    subject: "Update on Follower Status",
                    text: `Hello ${followingUser.firstname},<br><br>We wanted to inform you about a recent change in your follower list.`,
                    content: `Dear ${followingUser.firstname},<br><br>We're reaching out to let you know that ${followerUser.username} has unfollowed you. If you have any questions or concerns, feel free to reach out to us.<br><br>Best regards,<br>Thintry`
                });

                followerUser.followings.forEach(async element => {
                    const isFollowing = element.toString() === followingId.toString();
                    // // Check if the follower is already following the following user
                    if (isFollowing) {
                        // Update the follower's followings array and the following user's followers array
                        const updatedFollower = await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                            { _id: ObjectId(followerId) },
                            { $pull: { followings: ObjectId(followingId) } },
                            { returnOriginal: false }
                        );

                        const updatedFollowingUser = await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                            { _id: ObjectId(followingId) },
                            { $pull: { followers: ObjectId(followerId) } },
                            { returnOriginal: false }
                        );

                        resolve({ message: 'Unfollowed successfully', status: 200 });
                    } else {
                        resolve({ message: 'Not following', status: 200 });
                        return;
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    checkUsername: async (username) => {
        let user = await db.get().collection(COLLECTIONS.USERS).findOne({ username: username });
        if (user) {
            return true;
        } else {
            return false;
        }
    },
    updateUser: async (userData, status) => {
        try {
            if (status) {
                const user = await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                    { _id: ObjectId(userData._id) },
                    {
                        $set: {
                            firstname: userData.firstname,
                            lastname: userData.lastname,
                            profile: userData.profile,
                            about: userData.about
                        }
                    },
                    { returnOriginal: false }
                );

                const updatedUser = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(user.value._id) });

                return updatedUser; // Return the updated user
            } else {
                const user = await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                    { _id: ObjectId(userData._id) },
                    {
                        $set: {
                            username: userData.username.replace('@', '').toLowerCase(),
                            firstname: userData.firstname,
                            lastname: userData.lastname,
                            profile: userData.profile,
                            about: userData.about
                        }
                    },
                    { returnOriginal: false }
                );

                const updatedUser = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(user.value._id) });

                return updatedUser; // Return the updated user
            }
        } catch (error) {
            console.error('Error updating user:', error);
            return null;
        }
    },
    findFollowers: (profileId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.USERS).aggregate([
                {
                    $match: { _id: ObjectId(profileId) }
                },
                {
                    $lookup: {
                        from: COLLECTIONS.USERS,
                        localField: 'followers',
                        foreignField: '_id',
                        as: 'followerDetails'
                    }
                },
                {
                    $project: {
                        followerDetails: {
                            _id: 1,
                            username: 1,
                            firstname: 1,
                            lastname: 1,
                            profile: 1,
                            verified: 1,
                            official: 1
                            // Add other fields you need to display
                        }
                    }
                },
                {
                    $unwind: '$followerDetails'
                },
                {
                    $sort: {
                        'followerDetails.username': 1 // Sort by username in ascending order
                    }
                }
            ]).toArray()
                .then((result) => {
                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },
    findFollowings: (profileId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.USERS).aggregate([
                {
                    $match: { _id: ObjectId(profileId) }
                },
                {
                    $lookup: {
                        from: COLLECTIONS.USERS,
                        localField: 'followings',
                        foreignField: '_id',
                        as: 'followingDetails'
                    }
                },
                {
                    $project: {
                        followingDetails: {
                            _id: 1,
                            username: 1,
                            firstname: 1,
                            lastname: 1,
                            profile: 1,
                            verified: 1,
                            official: 1
                            // Add other fields you need to display
                        }
                    }
                },
                {
                    $unwind: '$followingDetails'
                },
                {
                    $sort: {
                        'followingDetails.username': 1 // Sort by username in ascending order
                    }
                }
            ]).toArray()
                .then((result) => {
                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }
}