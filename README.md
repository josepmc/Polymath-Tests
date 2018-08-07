# Poly Tests

These are the tests for the Poly Dapp Suite.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. Make sure that you have the prequisites already installed

### Prerequisites

1. Install NodeJS (v 8.11.3)

## Installation

We only support yarn installs, npm install will inevitably fail.
```
git clone git@github.com:josepmc/issuer-test.git
$ yarn
$ npm test
```
The following environment variables are required for the tests to work:
- METAMASK_SECRET: Your Metamask secret
- METAMASK_PASSWORD: Your Metamask password 
- METAMASK_ACCOUNT_NUMBER: Optional. Indicates which account number from Metamask to use

The following are required for the email-related tests to work:
- GMAIL_USER: Your gmail user
- GMAIL_PASSWORD=: Your gmail password (you need to activate the set your account to allow weak security applications) or an application password

You can set all these variables in a .env file if you're debugging, and VS Code will load them on runtime

## References

* This repo uses the decorators framework from [josepmc/protractor](https://github.com/josepmc/protractor)
* You may need to use the app locally, but you can pretty much configure everything in config/base.ts
