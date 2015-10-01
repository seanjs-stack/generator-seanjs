var path = require('path'),
  helpers = require('yeoman-generator').test,
  assert = require('yeoman-generator').assert,
  temp = require('temp').track();

describe('Main Generator', function () {
  this.timeout(0);
  /**
   * Setup the temp directory
   */
  beforeEach(function (done) {
    helpers.testDirectory(path.join(__dirname, 'temp'), done);
  });

  /**
   * Clean up temp directory
   */
  afterEach(function () {
    temp.cleanup();
  });

  describe('Application generator without sample module', function () {
    beforeEach(function (done) {
      helpers.run(path.join(__dirname, '../app'))
        .withOptions({
          'skip-install': true
        })
        .withArguments([])
        .withPrompts({
          version: '0.0.1',
          folder: 'temp',
          appName: 'SEAN.JS',
          appDescription: 'Full-Stack Javascript with SequelizeJS, ExpressJS, AngularJS, and NodeJS',
          appKeywords: 'SequelizeJS, ExpressJS, AngularJS, NodeJS',
          appAuthor: 'Omar Massad',
          addArticleExample: false,
          addChatExample: false
        })
        .on('ready', function (generator) {
          // this is called right before `generator.run()` is called
        })
        .on('end', done);
    });

    it('should generate a package.json file', function () {
      assert.file('temp/package.json');
    });
  });

});
