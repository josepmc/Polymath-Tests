Feature: Sign test
This is the test related to the sign Feature

    @sign @sanity @full
    Scenario: Sign Positive
        Given The issuer navigates to the issue url
        And The issuer verifies the identity
        And The issuer creates an account
        And The issuer activates his account
        Then The issuer is logged in

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