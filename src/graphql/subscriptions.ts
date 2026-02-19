/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateUserState = /* GraphQL */ `subscription OnCreateUserState(
  $filter: ModelSubscriptionUserStateFilterInput
  $owner: String
) {
  onCreateUserState(filter: $filter, owner: $owner) {
    id
    noteText
    flag
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
