require('dotenv').config()
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let handlebars = require('express-handlebars');
const Handlebars = require('handlebars')
let session = require('express-session');
var cookieSession = require('cookie-session')
let favicon = require("serve-favicon");
let bodyParser = require('body-parser');
const moment = require('moment');
const fileUpload = require('express-fileupload');
const compression = require('compression');
const oneDay = 1000 * 60 * 60 * 24;

var rootRouter = require('./routes/root');
var usersRouter = require('./routes/auth');
var postRouter = require('./routes/post');
var apiRouter = require('./routes/api');

var app = express();

Handlebars.registerHelper('contains', function (needle, haystack, options) {
  needle = Handlebars.escapeExpression(needle);
  haystack = Handlebars.escapeExpression(haystack);
  return (haystack.indexOf(needle) > -1) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('includes', function (array, value, options) {
  try {
    if (array && value) {
      if (array.map(val => val.toString()).includes(value.toString())) {
        return options.fn(this); // Value is included, execute the content inside the block
      } else {
        return options.inverse(this); // Value is not included, execute the content inside the else block
      }
    } else {
      return options.inverse(this);
    }
  } catch (error) {
    console.log(error)
  }
});


Handlebars.registerHelper('ifEquals', function (a, b, options) {
  if (a == b) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('encodeURIComponent', function (string) {
  return encodeURIComponent(string);
});

Handlebars.registerHelper('formatNumber', function (value) {
  if (value >= 1000000) {
    return (value / 1000000) + 'M';
  } else if (value >= 1000) {
    return (value / 1000) + 'K';
  } else {
    return value;
  }
});

Handlebars.registerHelper('formatTime', function (timestamp) {
  // Assuming timestamp is in Unix timestamp format (seconds since epoch)
  const date = new Date(timestamp); // Convert to milliseconds
  // Now you can use the toDateString method
  const formattedTime = date.toDateString();
  return new Handlebars.SafeString(formattedTime);
});

Handlebars.registerHelper('getPostId', function (post) {
  return post._id;
});

Handlebars.registerHelper('parseContent', function (content, username) {
  if (typeof content !== 'string' || content === '') {
    return new Handlebars.SafeString(''); // Return an empty string if content is not valid
  }

  const hashtagRegex = /#[A-Za-z0-9_-]+/g;
  const urlRegex = /(?<!href=')(?<!src=')(https?:\/\/[^\s]+)/g; // Updated regex to exclude URLs within img src attribute
  const mentionRegex = /@([A-Za-z0-9_.-]+)/g;

  const parsedUrlContent = content.replace(urlRegex, (match) => {
    return `<a href="${match}" style="color: lightblue !important;" target="_blank">${match}</a>`;
  });

  const parsedContentWithMentions = parsedUrlContent.replace(mentionRegex, (match, mention) => {
    return `<a href="/user/${mention}" style="color: lightblue !important;">${match}</a>`;
  });

  const parsedContent = parsedContentWithMentions.replace(hashtagRegex, (match) => {
    const hashtag = match.substring(1);
    return `<a href="/search?q=${hashtag}" style="color: lightblue !important;">${match}</a>`;
  });

  return new Handlebars.SafeString(parsedContent);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', handlebars.engine({
  extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/', partialsDir: __dirname + '/views/partials/', helpers: {
    contains: Handlebars.helpers.contains,
    formatNumber: Handlebars.helpers.formatNumber,
    formatTime: Handlebars.helpers.formatTime,
    getPostId: Handlebars.helpers.getPostId,
    parseContent: Handlebars.helpers.parseContent,
    encodeURIComponent: Handlebars.helpers.encodeURIComponent,
    ifEquals: Handlebars.helpers.ifEquals,
    includes: Handlebars.helpers.includes
  }
}));
app.set('view engine', 'hbs');
app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cookieSession({
  keys: [ "@thtycbskt@#]$" ],
  //saveUninitialized: true,
  maxAge: oneDay 
  //resave: false
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico')))

app.use('/', rootRouter);
app.use('/auth', usersRouter);
app.use('/post', postRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.status = err.status || 500;
  res.locals.title = err.status + ' - Thintry' || 500 + ' - Thintry';
  res.locals.description = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
