@investor @full @sanity @positive
Feature: Normal invest for an investor
    This test checks that valid tokens are properly detected and accepted

    Background: An STO is started
        Given The issuer is authenticated
        And A token is reserved
        And A token is created
        And Investors are minted
        And Capped STO launched immediately
        And 3 known addresses are whitelisted

    Scenario: Invest in a token
        Given The investor selects the account number 2
        And The investor navigates to a valid token page
        And The investor waits for the STO to start
        Then The investor invests 1 token