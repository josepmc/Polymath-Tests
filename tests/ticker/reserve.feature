@issuer @reserve @sanity
Feature: Reserve a token test
    This is the test related to the reserve a token Feature

    Background: Signed In
        Given The issuer is authenticated

    Scenario: Reserve a Token positive path
        Given The issuer fills in the token information
        And The issuer activates his account
        Then The issuer has the token reserved