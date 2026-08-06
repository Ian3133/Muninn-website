/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getBetaIssue = /* GraphQL */ `query GetBetaIssue($id: ID!) {
  getBetaIssue(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetBetaIssueQueryVariables,
  APITypes.GetBetaIssueQuery
>;
export const listBetaIssues = /* GraphQL */ `query ListBetaIssues(
  $filter: ModelBetaIssueFilterInput
  $limit: Int
  $nextToken: String
) {
  listBetaIssues(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListBetaIssuesQueryVariables,
  APITypes.ListBetaIssuesQuery
>;
export const getUserState = /* GraphQL */ `query GetUserState($id: ID!) {
  getUserState(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetUserStateQueryVariables,
  APITypes.GetUserStateQuery
>;
export const listUserStates = /* GraphQL */ `query ListUserStates(
  $filter: ModelUserStateFilterInput
  $limit: Int
  $nextToken: String
) {
  listUserStates(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserStatesQueryVariables,
  APITypes.ListUserStatesQuery
>;
