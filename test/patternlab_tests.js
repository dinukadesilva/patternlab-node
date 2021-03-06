'use strict';

const tap = require('tap');
const rewire = require("rewire");
const _ = require('lodash');
const fs = require('fs-extra');
const defaultConfig = require('../patternlab-config.json');
var config = require('./util/patternlab-config.json');

var plEngineModule = rewire('../core/lib/patternlab');

//set up a global mocks - we don't want to be writing/rendering any files right now
const uiBuilderMock = function(){
  return {
    buildFrontend: function () { }
  };
};

const fsMock = {
  outputFileSync: function (path, content) { /* INTENTIONAL NOOP */},
  readJSONSync: function(path, encoding) {
    return fs.readJSONSync(path, encoding);
  },
  removeSync: function(path) { fs.removeSync(path); },
  emptyDirSync: function(path) { fs.emptyDirSync(path); },
  readFileSync: function(path, encoding) { return fs.readFileSync(path, encoding); },
}

//set our mocks in place of usual require()
plEngineModule.__set__({
  'ui_builder': uiBuilderMock,
  'fs': fsMock
});

tap.test('buildPatternData - should merge all JSON files in the data folder except listitems', function(test){
  var data_dir = './test/files/_data/';

  var dataResult = plEngineModule.build_pattern_data(data_dir, fs);
  test.equals(dataResult.data, "test");
  test.equals(dataResult.foo, "bar");
  test.equals(dataResult.test_list_item, undefined);
  test.end();
});

tap.test('buildPatterns - should replace data link even when pattern parameter present', function(test) {
  //arrange

  var patternExporterMock = {
    /*
     In this test, we actually take advantage of the pattern export functionality post-build to inspect what
     the contents of the patterns look like. This, coupled with a mocking of fs and the ui_builder, allow us to focus
     only on the order of events within build.
     */
    export_patterns: function (patternlab) {
      var pattern = _.find(patternlab.patterns, (p) => {
        return p.patternPartial === 'test-paramParent';
      });
      //assert
      test.equals(pattern.patternPartialCode.indexOf('00-test-00-foo.rendered.html') > -1, true, 'data link should be replaced properly');
    }
  };

  plEngineModule.__set__({
    'pattern_exporter': patternExporterMock
  });

  config.patternExportPatternPartials = ['test-paramParent'];
  var pl = new plEngineModule(config);

  //act
  pl.build(true).then(() => {
    test.end();
  });
});

tap.test('buildPatternData - can load json, yaml, and yml files', function(test) {
  const data_dir = './test/files/_data/';

  let dataResult = plEngineModule.build_pattern_data(data_dir, fs);
  test.equals(dataResult.from_yml, "from_yml");
  test.equals(dataResult.from_yaml, "from_yaml");
  test.equals(dataResult.from_json, "from_json");
  test.end();
});

tap.test('getDefaultConfig - should return the default config object', function(test) {
  const requestedConfig = plEngineModule.getDefaultConfig();
  test.type(requestedConfig, 'object');
  test.equals(requestedConfig, defaultConfig);
  test.end();
});
