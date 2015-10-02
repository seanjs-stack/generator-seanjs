var Promise = require('bluebird'),
        child_process = require('child_process'),
        path = require('path'),
        s = require('underscore.string'),
        generators = require('yeoman-generator'),
        Sequelize = require('sequelize'),
        log = require('./log');

var exec = function (cmd) {
   return new Promise(function (resolve, reject) {
      child_process.exec(cmd, function (err, res) {
         if (err) {
            reject(err);
         } else {
            resolve(res);
         }
      });
   });
};

// Global Variables
var folder, folderPath, version;

var versions = {
   'master': 'master'
};

module.exports = generators.Base.extend({
   init: function () {
      this.pkg = this.fs.readJSON(path.join(__dirname, '../package.json'));

      this.on('end', function () {
         if (!this.options['skip-install']) {
            log.green('Running npm install for you....');
            log.green('This may take a couple minutes.');
            exec('cd ' + folder + ' && npm install').then(function () {
               log.green('Running bower install for you....');
               log.green('This may take a couple minutes.');
               exec('cd ' + folder + ' && bower install --alow-root')
                       .then(function () {
                          log('');
                          log.green('------------------------------------------');
                          log.green('Your SEAN.JS application is ready!');
                          log('');
                          log.green('To Get Started, run the following command:');
                          log('');
                          log.yellow('cd ' + folder + ' && node server.js');
                          log('');
                          log.green('Happy Hacking and keep us updated!');
                          log.green('------------------------------------------');
                       });
            });
         }
      });
   },
   checkForGit: function () {
      var done = this.async();

      exec('git --version')
              .then(function () {
                 done();
              })
              .catch(function (err) {
                 log.red(new Error(err));
                 return;
              });
   },
   welcomeMessage: function () {
      log(this.yeoman);

      log.green('You\'re using the official SEAN.JS Stack generator.');
   },
   promptForVersion: function () {
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

      this.prompt(prompt, function (props) {
         version = props.version;
         done();
      }.bind(this));
   },
   promptForFolder: function () {
      var done = this.async();
      var prompt = {
         name: 'folder',
         message: 'In which folder would you like the project to be generated? This can be changed later.',
         default: 'seanjs'
      };

      this.prompt(prompt, function (props) {
         folder = props.folder;
         folderPath = './' + folder + '/';
         done();
      }.bind(this));
   },
   cloneRepo: function () {
      var done = this.async();

      log.green('Cloning the SEAN.JS Stack repo...');

      exec('git clone --branch ' + versions[version] + ' https://github.com/seanjs-stack/seanjs.git')
              .then(function () {
                 done();
              })
              .catch(function (err) {
                 log.red(err);
                 return;
              });
   },
   removeFiles: function () {
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
      }
      ;

      Promise.all(remove)
              .then(function () {
                 done();
              })
              .catch(function (err) {
                 log.red(err);
                 return;
              });
   },
   getPrompts: function () {
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

      this.prompt(prompts, function (props) {
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
   promptForPGSetup: function () {
      var done = this.async();

      var prompt = {
         type: 'confirm',
         name: 'pgSetup',
         message: 'Do you want to setup the PostgreSQL Database now?',
         default: true
      };

      this.prompt(prompt, function (props) {
         this.pgSetup = props.pgSetup;
         done();
      }.bind(this));
   },
   promptForPostgres: function () {
      var done = this.async();

      if (!this.pgSetup) {
         done();
      } else {

         log.magenta('Please make sure you that have the Postgres database already set-up');

         log.white('For Fedora:\nhttps://fedoraproject.org/wiki/PostgreSQL');
         log.white('For Ubuntu:\nhttps://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-14-04');
         log.white('For MAC:\nhttp://postgresapp.com');
         log.white('For Windows:\nhttp://www.postgresql.org/download/windows');
         log.white('For Others:\n Google.com :)');

         log.white('\n');

         var prompts = [{
               name: 'databaseName',
               message: 'What is the database name?',
               default: 'seanjs-dev'
            }, {
               name: 'databaseHost',
               message: 'What is the database host?',
               default: 'localhost'
            }, {
               name: 'databasePort',
               message: 'What is the database port?',
               default: 5432
            }, {
               name: 'databaseUsername',
               message: 'What is the database username?',
               default: 'postgres'
            }, {
               name: 'databasePassword',
               message: 'What is the database password?',
               default: 'postgres'
            }, {
               type: 'confirm',
               name: 'checkDatabaseConnection',
               message: 'Would you like to check the database connection now?',
               default: true
            }];

         this.prompt(prompts, function (props) {
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
   promptForDatabaseCheck: function () {
      var done = this.async();
      if (this.checkDatabaseConnection) {
         log.green('Checking the database connection...');

         var sequelize = new Sequelize(this.databaseName, this.databaseUsername, this.databasePassword, {
            host: this.databaseHost,
            port: this.databasePort,
            dialect: 'postgres',
            logging: false,
            validateConnection: true
         });

         sequelize.authenticate().then(function (errors) {
            if (!errors) {
               log.yellow('Databse connection is valid!');
               done();
            }
         }).catch(function (error) {
            log.red('Databse connection is not valid!');
            log.red('\n' + error + '\n');
            log.blue('The setup will continue, please check the errors afterwards');
            log.red('\n');
            done();
         });
      } else {
         done();
      }
   },
   copyTemplates: function () {
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
         databasePassword: this.databasePassword || 'postgres'
      });
   },
   removeChatExample: function () {
      var done = this.async();

      if (!this.addChatExample) {
         exec('rm -rf ' + folderPath + 'modules/chat')
                 .then(function () {
                    done();
                 })
                 .catch(function (err) {
                    log.red(err);
                    return;
                 });
      } else {
         done();
      }
   },
   removeArticlesExample: function () {
      var done = this.async();

      if (!this.addArticleExample) {
         exec('rm -rf ' + folderPath + 'modules/articles')
                 .then(function () {
                    done();
                 })
                 .catch(function (err) {
                    log.red(err);
                    return;
                 });
      } else {
         done();
      }
   }
});