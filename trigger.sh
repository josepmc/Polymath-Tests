#!/bin/sh

function travis_trigger() {
     local org=$1 && shift
     local repo=$1 && shift
     local branch=${1:-master} && shift

     body="{
             \"request\": {
               \"branch\": \"${branch}\"
              }
           }"

     curl -s -X POST \
          -H "Content-Type: application/json" \
          -H "Accept: application/json" \
          -H "Travis-API-Version: 3" \
          -H "Authorization: token $TRAVIS_TOKEN" \
          -d "$body" \
          "https://api.travis-ci.org/repo/${org}%2F${repo}/requests"
 }

 travis_trigger $TRAVIS_ORG $TRAVIS_REPO $TRAVIS_BRANCH