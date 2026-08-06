/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateBetaIssue = /* GraphQL */ `subscription OnCreateBetaIssue(
  $filter: ModelSubscriptionBetaIssueFilterInput
  $owner: String
) {
  onCreateBetaIssue(filter: $filter, owner: $owner) {
    id
    status
    category
    description
    occurredAt
    pageUrl
    pagePath
    pageTitle
    selectedElement
    appVersion
    release
    viewport
    userAgent
    evidenceKey
    screenshotKey
    diagnosticsSummary
    evidencePreview
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateBetaIssueSubscriptionVariables,
  APITypes.OnCreateBetaIssueSubscription
>;
export const onUpdateBetaIssue = /* GraphQL */ `subscription OnUpdateBetaIssue(
  $filter: ModelSubscriptionBetaIssueFilterInput
  $owner: String
) {
  onUpdateBetaIssue(filter: $filter, owner: $owner) {
    id
    status
    category
    description
    occurredAt
    pageUrl
    pagePath
    pageTitle
    selectedElement
    appVersion
    release
    viewport
    userAgent
    evidenceKey
    screenshotKey
    diagnosticsSummary
    evidencePreview
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateBetaIssueSubscriptionVariables,
  APITypes.OnUpdateBetaIssueSubscription
>;
export const onDeleteBetaIssue = /* GraphQL */ `subscription OnDeleteBetaIssue(
  $filter: ModelSubscriptionBetaIssueFilterInput
  $owner: String
) {
  onDeleteBetaIssue(filter: $filter, owner: $owner) {
    id
    status
    category
    description
    occurredAt
    pageUrl
    pagePath
    pageTitle
    selectedElement
    appVersion
    release
    viewport
    userAgent
    evidenceKey
    screenshotKey
    diagnosticsSummary
    evidencePreview
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteBetaIssueSubscriptionVariables,
  APITypes.OnDeleteBetaIssueSubscription
>;
export const onCreateUserState = /* GraphQL */ `subscription OnCreateUserState(
  $filter: ModelSubscriptionUserStateFilterInput
  $owner: String
) {
  onCreateUserState(filter: $filter, owner: $owner) {
    id
    noteText
    flag
    newsletterComment
    checkbox1
    checkbox2
    checkbox3
    selectedState
    updatedAt
    createdAt
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateUserStateSubscriptionVariables,
  APITypes.OnCreateUserStateSubscription
>;
export const onUpdateUserState = /* GraphQL */ `subscription OnUpdateUserState(
  $filter: ModelSubscriptionUserStateFilterInput
  $owner: String
) {
  onUpdateUserState(filter: $filter, owner: $owner) {
    id
    noteText
    flag
    newsletterComment
    checkbox1
    checkbox2
    checkbox3
    selectedState
    updatedAt
    createdAt
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateUserStateSubscriptionVariables,
  APITypes.OnUpdateUserStateSubscription
>;
export const onDeleteUserState = /* GraphQL */ `subscription OnDeleteUserState(
  $filter: ModelSubscriptionUserStateFilterInput
  $owner: String
) {
  onDeleteUserState(filter: $filter, owner: $owner) {
    id
    noteText
    flag
    newsletterComment
    checkbox1
    checkbox2
    checkbox3
    selectedState
    updatedAt
    createdAt
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteUserStateSubscriptionVariables,
  APITypes.OnDeleteUserStateSubscription
>;
