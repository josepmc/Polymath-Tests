@issuer @sign
Feature: Sign test
This is the test related to the sign Feature

    @sanity @full
    Scenario: Sign Positive
        Given The issuer navigates to the issue url
        And The issuer verifies the identity
        And The issuer creates an account
        And The issuer activates his account
        Then The issuer is logged in