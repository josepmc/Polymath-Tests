@issuer @edge @mint @long
Feature: Mint test
    This is the test related to the mint a token Feature

    Background: Token Created
        Given The issuer is authenticated
        And A token is reserved
        And A token is created

    Scenario: Mint a Token positive path
        Given The issuer adds 2000 investors to mint
        Then The issuer mints new investors