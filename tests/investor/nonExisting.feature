@investor @full @sanity @negative
Feature: Invalid Token for Investor
    This test checks that invalid tokens are properly detected and rejected

    Scenario: Navigate to an invalid token page
        Given The investor navigates to an invalid token page
        Then The investor is shown an invalid token page