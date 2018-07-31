Feature: Compliance test
    This is the test related to the mint a token Feature

    Background: Capped STO launched
        Given Capped STO launched

    Scenario: Modify whitelist positive path
        Given The issuer whitelists a new investor
        And The issuer removes the investor from the whitelist
        Then The whitelist remains unmodified