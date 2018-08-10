@whitelist @sanity
Feature: Compliance test
    This is the test related to the mint a token Feature

    Background: Capped STO launched
        Given The issuer is authenticated
        And A token is reserved
        And A token is created
        And The issuer skips minting
        And Capped STO launched

    Scenario: Modify whitelist positive path
        Given The issuer changes ownership settings