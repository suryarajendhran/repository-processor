const express = require('express');
const app = express();
const https = require('https');
const { Octokit } = require('octokit');

const octokit = new Octokit({
  auth: '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',
})

app.get('/commits', async (req, res) => {
  const repo = req.query.repo;
  const owner = req.query.owner;

  const _commits = await octokit.paginate(octokit.rest.repos.listCommits, {
    owner,
    repo,
  });

  console.log(_commits.length);

  // const { data: _commits } = await octokit.rest.repos.listCommits({
  //   owner,
  //   repo,
  //   per_page: 500,
  // })

  const commits = await Promise.all(_commits.map((commit) => octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: commit.sha
  })).map((promise) => promise.then((response) => response.data)));

  console.log(commits.length);

  const fixedCommits = commits.filter(commit => commit.commit.message.toLowerCase().includes('fix') && !commit.commit.message.toLowerCase().includes('dependabot'));

  const files = fixedCommits.map(commit => {
    return {
      message: commit.commit.message,
      fileNames: commit.files.map(file => file.filename)
    }
  });

  console.log(files.flatMap(item => item.fileNames.map(fileName => ({
    message: item.message,
    fileName: fileName
  }))));

  res.send(files);
});

function getFilesForCommit(repo, commit) {
  return new Promise((resolve, reject) => {
    const options = {
      host: `api.github.com`,
      path: `/repos/${repo}/commits/${commit.sha}`,
      headers: { 'User-Agent': 'My-App-Name' }
    };

    https.get(options, response => {
      let body = '';
      response.on('data', data => {
        body += data;
      });

      response.on('end', () => {
        console.log('body: ', body);
        const commit = JSON.parse(body);
        resolve(commit.files);
      });
    });
  });
}

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
