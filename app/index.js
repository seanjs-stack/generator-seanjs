var Promise = require('bluebird'),
  child_process = require('child_process'),
  path = require('path'),
  s = require('underscore.string'),
  generators = require('yeoman-generator'),
  Sequelize = require('sequelize'),
  https = require('https'),
  fs = require('fs'),
  redis = require('redis'),
  chalk = require('chalk')
log = require('./log');

var exec = function(cmd) {
  return new Promise(function(resolve, reject) {
    child_process.exec(cmd, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

var download = function(url, dest, cb) {
  var request = https.get(url, function(response) {
    if (response.statusCode !== 200) {
      log.red('Unable to download: ' + url);
      log.yellow('\nPlease download it manually and place it in ' + dest + '\n\n');
      if (cb) cb(false);
    } else {
      var file = fs.createWriteStream(dest, {
        flags: 'w'
      });
      response.pipe(file);
      file.on('finish', function() {
        log.green('Downloaded: ' + dest + '\n');
        file.close(cb); // close() is async, call cb after close completes.
      });

    }
  }).on('error', function(err) {
    log.red('Unable to download: ' + url);
    log.yellow('\nPlease download it manually and place it in ' + dest + '\n\n');
    if (cb) cb(err.message);
  });
};

// Global Variables
var folder, folderPath, version;

var versions = {
  'master': 'master'
};

module.exports = generators.Base.extend({
  init: function() {

    this.pkg = this.fs.readJSON(path.join(__dirname, '../package.json'));

    this.on('end', function() {
      var done = this.async();
      if (!this.options['skip-install']) {
        log.green('\nRunning the npm install & bower install for you...');
        log.yellow('This may take a couple minutes. Time for coffee maybe?');

        log.white('\n');
        log.white('                     )))');
        log.white('                     (((');
        log.white('                    +-----+');
        log.white('                    |     |]');
        log.white('                    |     |');
        log.white("                    '-----'");

        exec('cd ' + folder + ' && npm install').then(function() {
          exec('cd ' + folder + ' && bower install --alow-root').then(function() {
            log('\n');
            log.white('------------------------------------------');
            log.green('Your SEAN.JS application is ready!');
            log('\n');
            log.white('To Get Started, run the following command:');
            log.yellow('cd ' + folder + ' && node server.js');
            log.white('\nThe default environment configuration are in ' + chalk.magenta(folderPath + 'config/env/development.js'));
            log.cyan('\nHappy Hacking and keep us updated!');
            log.white('------------------------------------------');
            log('\n');
            process.exit();
          });
        });
      }
    });
  },

  checkForGit: function() {
    var done = this.async();

    exec('git --version')
      .then(function() {
        done();
      })
      .catch(function(err) {
        log.red(new Error(err));
        return;
      });
  },

  welcomeMessage: function() {
    log('\n');
    log.white('---------------------------------------------------------------');
    log.white("          ╔═╗  ╔═╗  ╔═╗  ╔╗╔      ╦  ╔═╗");
    log.white("          ╚═╗  ║╣   ╠═╣  ║║║      ║  ╚═╗");
    log.white("          ╚═╝  ╚═╝  ╩ ╩  ╝╚╝  o  ╚╝  ╚═╝");
    log.white('---------------------------------------------------------------');
    log.green('Welcome to the official SEAN.JS Stack generator version ' + chalk.yellow(this.pkg.version));
    log('\n');
  },

  promptForVersion: function() {
    var done = this.async();

    var choices = [];
    for (var v in versions) {
      choices.push(v);
    }

    var prompt = {
      type: 'list',
      name: 'version',
      message: 'What SEAN.JS version would you like to generate?',
      choices: choices,
      default: 1
    };

    this.prompt(prompt, function(props) {
      version = props.version;
      done();
    }.bind(this));
  },

  promptForFolder: function() {
    var done = this.async();
    var prompt = {
      name: 'folder',
      message: 'In which folder would you like the project to be generated? This can be changed later.',
      default: 'seanjs'
    };

    this.prompt(prompt, function(props) {
      folder = props.folder;
      folderPath = './' + folder + '/';
      done();
    }.bind(this));
  },

  cloneRepo: function() {
    var done = this.async();

    log.yellow('Cloning the ' + chalk.green('SEAN.JS') + ' Stack repo...');

    exec('git clone --branch ' + versions[version] + ' https://github.com/seanjs-stack/seanjs.git ' + folder)
      .then(function() {
        done();
      })
      .catch(function(err) {
        log.red("\n" + err);
        return;
      });
  },

  removeFiles: function() {
    var done = this.async();

    var files = [
      'package.json',
      'bower.json',
      'config/env/default.js',
      'config/env/development.js'
    ];

    var remove = [];

    for (var i = 0; i < files.length; i++) {
      remove.push(exec('rm ./' + folder + '/' + files[i]));
    };

    Promise.all(remove)
      .then(function() {
        done();
      })
      .catch(function(err) {
        log.red(err);
        return;
      });
  },

  getPrompts: function() {
    var done = this.async();

    var prompts = [{
      name: 'appName',
      message: 'What would you like to call your application?',
      default: 'SEAN.JS'
    }, {
      name: 'appDescription',
      message: 'How would you describe your application?',
      default: 'Full-Stack Javascript with SequelizeJS, ExpressJS, AngularJS, and NodeJS'
    }, {
      name: 'appKeywords',
      message: 'How would you describe your application in comma seperated key words?',
      default: 'SequelizeJS, ExpressJS, AngularJS, NodeJS'
    }, {
      name: 'appAuthor',
      message: 'What is your company/author name?'
    }, {
      type: 'confirm',
      name: 'addArticleExample',
      message: 'Would you like to generate the article example CRUD module?',
      default: true
    }, {
      type: 'confirm',
      name: 'addChatExample',
      message: 'Would you like to generate the chat example module?',
      default: true
    }];

    this.prompt(prompts, function(props) {
      this.appName = props.appName;
      this.appDescription = props.appDescription;
      this.appKeywords = props.appKeywords;
      this.appAuthor = props.appAuthor;
      this.addArticleExample = props.addArticleExample;
      this.addChatExample = props.addChatExample;

      this.slugifiedAppName = s(this.appName).slugify().value();
      this.humanizedAppName = s(this.appName).humanize().value();
      this.capitalizedAppAuthor = s(this.appAuthor).capitalize().value();

      done();
    }.bind(this));
  },

  promptForDatabaseDialect: function() {
    var done = this.async();

    var prompt = {
      type: 'list',
      name: 'databaseDialect',
      message: 'Which database dialect do you want? (Default PostgreSQL)',
      choices: ['postgres', 'mysql', 'mariadb'],
      default: 'postgres'
    };

    this.prompt(prompt, function(props) {
      this.databaseDialect = props.databaseDialect;
      done();
    }.bind(this));
  },

  promptForQuestionDatabaseSetup: function() {
    var done = this.async();

    var prompt = {
      type: 'confirm',
      name: 'questionDatabaseSetup',
      message: 'Do you want to setup the ' + this.databaseDialect + ' Database now?',
      default: true
    };

    this.prompt(prompt, function(props) {
      this.questionDatabaseSetup = props.questionDatabaseSetup;
      done();
    }.bind(this));
  },

  promptDatabaseSetup: function() {
    var done = this.async();

    if (!this.questionDatabaseSetup) {
      done();
    } else {

      if (this.databaseDialect === 'postgres') {
        log.magenta('Please make sure you that have the Postgres database already set-up');

        log.white('For Fedora:\nhttps://fedoraproject.org/wiki/PostgreSQL');
        log.white('For Ubuntu:\nhttps://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-14-04');
        log.white('For MAC:\nhttp://postgresapp.com');
        log.white('For Windows:\nhttp://www.postgresql.org/download/windows');
        log.white('For Others:\n Google.com :)');
      } else {
        log.magenta('Please make sure you that have the database already set-up');
      }

      var prompts = [{
        name: 'databaseName',
        message: 'What is the database name?',
        default: 'seanjs_dev'
      }, {
        name: 'databaseHost',
        message: 'What is the database host?',
        default: 'localhost'
      }, {
        name: 'databasePort',
        message: 'What is the database port?',
        default: (this.databaseDialect === 'postgres') ? 5432 : 3306
      }, {
        name: 'databaseUsername',
        message: 'What is the database username?',
        default: (this.databaseDialect === 'postgres') ? 'postgres' : 'root'
      }, {
        name: 'databasePassword',
        message: 'What is the database password?',
        default: (this.databaseDialect === 'postgres') ? 'postgres' : 'root'
      }, {
        type: 'confirm',
        name: 'checkDatabaseConnection',
        message: 'Would you like to check the database connection now?',
        default: true
      }];

      this.prompt(prompts, function(props) {
        this.databaseName = props.databaseName;
        this.databaseHost = props.databaseHost;
        this.databasePort = props.databasePort;
        this.databaseUsername = props.databaseUsername;
        this.databasePassword = props.databasePassword;
        this.checkDatabaseConnection = props.checkDatabaseConnection;

        this.slugifiedAppName = s(this.databaseName).slugify().value();
        this.humanizedAppName = s(this.databaseName).humanize().value();

        done();
      }.bind(this));
    }
  },

  promptForDatabaseCheck: function() {
    var done = this.async();
    if (this.checkDatabaseConnection) {
      log.yellow('Checking the database connection...');

      var sequelize = new Sequelize(this.databaseName, this.databaseUsername, this.databasePassword, {
        host: this.databaseHost,
        port: this.databasePort,
        dialect: this.databaseDialect,
        logging: false,
        validateConnection: true
      });

      sequelize.authenticate().then(function(errors) {
        if (!errors) {
          log.green('Databse connection is valid!');
          done();
        }
      }).catch(function(error) {
        log.red('\nDatabse connection is not valid!');
        log.red(error + '\n');
        log.yellow('The generator will continue, please check the database error afterwards');
        done();
      });
    } else {
      done();
    }
  },

  promptForQuestionRedisSetup: function() {
    var done = this.async();

    var prompt = {
      type: 'confirm',
      name: 'questionRedisSetup',
      message: 'Do you want to setup the Redis connection now?',
      default: true
    };

    this.prompt(prompt, function(props) {
      this.questionRedisSetup = props.questionRedisSetup;
      done();
    }.bind(this));
  },

  promptRedisSetup: function() {
    var done = this.async();

    if (!this.questionRedisSetup) {
      done();
    } else {

      log.magenta('Please make sure you that have the redis server already set-up');

      var prompts = [{
        name: 'redisHost',
        message: 'What is the redis host?',
        default: 'localhost'
      }, {
        name: 'redisPort',
        message: 'What is the redis host?',
        default: 6379
      }, {
        name: 'redisDatabase',
        message: 'What is the redis database?',
        default: 0
      }, {
        type: 'confirm',
        name: 'checkRedisConnection',
        message: 'Would you like to check the redis connection now?',
        default: true
      }];

      this.prompt(prompts, function(props) {
        this.redisHost = props.redisHost;
        this.redisPort = props.redisPort;
        this.redisDatabase = props.redisDatabase;
        this.checkRedisConnection = props.checkRedisConnection;

        done();
      }.bind(this));
    }
  },

  checkRedisConnection: function() {
    var done = this.async();

    if (!this.checkRedisConnection) {
      done();
    } else {
      var client = redis.createClient(this.redisPort, this.redisHost);

      client.on('connect', function() {
        log.green('Redis connection is valid!\n');
        done();
      });

      client.on("error", function(err) {
        log.red("\nUnable to connect to redis on " + err.address + " with port: " + err.port + "\n");
        client.end()
        log.yellow("The generator will continue, please make sure you install/run redis server for the sessions\n");
        done();
      });


    }
  },

  downloadSQLFiles: function() {
    var done = this.async();
    if (this.databaseDialect !== 'postgres') {
      log.yellow('Downloading SQL compatible files...\n');

      var userModelURL = "https://gist.githubusercontent.com/Massad/3986f4b12d871de8d353/raw/user.server.model.js";
      var userModelDest = folderPath + 'modules/users/server/models/user.server.model.js';

      var userAuthenticationlURL = "https://gist.githubusercontent.com/Massad/f6f649d60ad3009f7b99/raw/user.authentication.server.controller.js";
      var userAuthenticationlDest = folderPath + 'modules/users/server/controllers/users/user.authentication.server.controller.js';

      download(userModelURL, userModelDest, function(response) {
        download(userAuthenticationlURL, userAuthenticationlDest, function(response2) {
          done();
        });
      });

    } else {
      done();
    }
  },

  copyTemplates: function() {
    this.fs.copyTpl(
      this.templatePath(version + '/_package.json'),
      this.destinationPath(folderPath + 'package.json'), {
        slugifiedAppName: this.slugifiedAppName,
        appDescription: this.appDescription,
        capitalizedAppAuthor: this.capitalizedAppAuthor
      });
    this.fs.copyTpl(
      this.templatePath(version + '/_bower.json'),
      this.destinationPath(folderPath + 'bower.json'), {
        slugifiedAppName: this.slugifiedAppName,
        appDescription: this.appDescription
      });
    this.fs.copyTpl(
      this.templatePath(version + '/config/env/_default.js'),
      this.destinationPath(folderPath + 'config/env/default.js'), {
        appName: this.appName,
        appDescription: this.appDescription,
        appKeywords: this.appKeywords
      });
    this.fs.copyTpl(
      this.templatePath(version + '/config/env/_development.js'),
      this.destinationPath(folderPath + 'config/env/development.js'), {
        databaseName: this.databaseName || 'seanjs-dev',
        databaseHost: this.databaseHost || 'localhost',
        databasePort: this.databasePort || 5432,
        databaseUsername: this.databaseUsername || 'postgres',
        databasePassword: this.databasePassword || 'postgres',
        databaseDialect: this.databaseDialect || 'postgres',
        redisHost: this.redisHost || 'localhost',
        redisPort: this.redisPort || 6379,
        redisDatabase: this.redisDatabase || 0
      });
  },

  removeChatExample: function() {
    var done = this.async();

    if (!this.addChatExample) {
      exec('rm -rf ' + folderPath + 'modules/chat')
        .then(function() {
          done();
        })
        .catch(function(err) {
          log.red(err);
          return;
        });
    } else {
      done();
    }
  },

  removeArticlesExample: function() {
    var done = this.async();

    if (!this.addArticleExample) {
      exec('rm -rf ' + folderPath + 'modules/articles')
        .then(function() {
          done();
        })
        .catch(function(err) {
          log.red(err);
          return;
        });
    } else {
      done();
    }
  }

});