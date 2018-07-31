Feature: Capped STO test
    This is the test related to the start a token STO Feature

    Background: Investors minted
        Given Investors are minted

    Scenario: Create a STO positive path
        Given The issuer selects the a Capped STO
        And The issuer configures and starts the Capped STO
        Then The Capped STO is started