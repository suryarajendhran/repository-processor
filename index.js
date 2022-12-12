const express = require('express');
const app = express();
const https = require('https');
const { Octokit } = require('octokit');
const { map, groupBy, prop, length } = require('ramda');

const octokit = new Octokit({
  auth: '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',
})

app.get('/commits', async (req, res) => {
  const repo = req.query.repo;
  const owner = req.query.owner;

  const commits = await getCommits(owner, repo);

  console.log(commits.length);

  const fixedCommits = commits.filter(filterCommitsWithAFix);

  const files = fixedCommits.map(commit => {
    return {
      message: commit.commit.message,
      fileNames: commit.files.map(file => file.filename)
    }
  });

  console.log(files);

  const fileNamesMap = files.flatMap(item => item.fileNames.map(fileName => ({
    message: item.message,
    fileName: fileName
  })));

  const fixedFrequencyMap = map(length, groupBy(prop('fileName'), fileNamesMap));

  res.send(fixedFrequencyMap);
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

async function getCommits(owner, repo) {
  const _commits = await octokit.paginate(octokit.rest.repos.listCommits, {
    owner,
    repo,
  });

  return await Promise.all(_commits.map((commit) => octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: commit.sha
  })).map((promise) => promise.then((response) => response.data)));
}

function filterCommitsWithAFix(commit) {
  return commit.commit.message.toLowerCase().includes('fix')
    && !commit.commit.message.toLowerCase().includes('dependabot');
}