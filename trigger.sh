#!/bin/sh

if [[ -z $TRAVIS_BRANCH || -z $TRAVIS_TOKEN || -z $TRAVIS_ORG || -z $TRAVIS_REPO ]]; then
  echo "Usage: TRAVIS_BRANCH=<branch> TRAVIS_ORG=<org> TRAVIS_REPO=<repo> TRAVIS_TOKEN=<token> ./trigger.sh"
  exit 1
fi


body="{
        \"request\": {
          \"message\": \"Automatic Status Trigger\",
          \"branch\": \"${TRAVIS_BRANCH}\"
        }
      }"

curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Travis-API-Version: 3" \
    -H "Authorization: token $TRAVIS_TOKEN" \
    -d "$body" \
    "https://api.travis-ci.org/repo/${TRAVIS_ORG}%2F${TRAVIS_REPO}/requests" -v
