@issuer
Feature: Notice test
This is the test related to the notice Feature

    @notice @sign
    Scenario: Sign Positive with a notice
        Given A notice is added
        And The issuer navigates to the issue url
        And A previously added notice is present
        And The issuer verifies the identity
        And A previously added notice is present
        And The issuer creates an account
        And The issuer activates his account
        Then The issuer is logged in
        And A previously added notice is present
        And The notices added are cleaned up