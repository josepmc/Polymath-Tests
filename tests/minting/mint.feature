Feature: Mint test
    This is the test related to the mint a token Feature

    Background: Token Created
        Given A token is created

    Scenario: Mint a Token positive path
        Given The issuer adds minting data
        Then The issuer mints new investors