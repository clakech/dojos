'use strict';

var rp = require('request-promise');
var S = require('string');

var config = require('./config.js');

class GithubApiConfigRequete {
  constructor(uri) {
    this.uri = uri;
    this.json = true;
    this.qs = { access_token: process.env.GH_TOKEN },
    this.headers = { 'User-Agent': 'Travis build' }
  }
}
rp(new GithubApiConfigRequete('https://api.github.com/users/' + config.nomOrganisationGithub + '/repos')).then((repos) => {
  let reposPromises = repos.map((repo) => {
    // Repos Exclus
    if(config.reposExclus.indexOf(repo.name) >= 0 || repo.description === '') {
      return new Promise((resolve) => { resolve(); });
    }
    
    // Repos sans meta.json
    let metaSuccessCallback = (meta) => {
      let nomPropre = S(repo.name.replace('dojo-', '')).humanize().s;
      let repoUtilise = {
        nom: repo.name,
        nomPropre: nomPropre,
        description: repo.description,
        url: repo.html_url,
        meta: meta
      };
      return new Promise((resolve) => { resolve(repoUtilise); });
    };
    let metaRejectCallback = () => {
      return new Promise((resolve) => { resolve(); });
    };
    return rp(new GithubApiConfigRequete('https://github.com/' + config.nomOrganisationGithub + '/'+repo.name+'/raw/master/meta.json')).then(metaSuccessCallback, metaRejectCallback);
  });
  
  
  Promise.all(reposPromises).then((reposUtilises) => {
    let repos = reposUtilises.filter((repo) => {
      return !!repo;
    });
    var rimraf = require('rimraf');
    var fs = require('fs');
    var jade = require('jade');

    var buildDir = "build/";

    rimraf(buildDir, () => {
      fs.mkdirSync(buildDir);
      var index = jade.compileFile('src/index.jade')({repos: repos});
      fs.writeFileSync(buildDir + 'index.html', index, 'utf8');
    });
  });
});