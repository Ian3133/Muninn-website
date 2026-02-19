/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createUserState = /* GraphQL */ `mutation CreateUserState(
  $input: CreateUserStateInput!
  $condition: ModelUserStateConditionInput
) {
  createUserState(input: $input, condition: $condition) {
    id
    noteText
    flag
    newsletterComment
    checkbox1
    checkbox2
    checkbox3
    updatedAt
    createdAt
    owner
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateUserStateMutationVariables,
  APITypes.CreateUserStateMutation
>;
export const updateUserState = /* GraphQL */ `mutation UpdateUserState(
  $input: UpdateUserStateInput!
  $condition: ModelUserStateConditionInput
) {
  updateUserState(input: $input, condition: $condition) {
    id
    noteText
    flag
    newsletterComment
    checkbox1
    checkbox2
    checkbox3
    updatedAt
    createdAt
    owner
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateUserStateMutationVariables,
  APITypes.UpdateUserStateMutation
>;
export const deleteUserState = /* GraphQL */ `mutation DeleteUserState(
  $input: DeleteUserStateInput!
  $condition: ModelUserStateConditionInput
) {
  deleteUserState(input: $input, condition: $condition) {
    id
    noteText
    flag
    newsletterComment
    checkbox1
    checkbox2
    checkbox3
    updatedAt
    createdAt
    owner
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteUserStateMutationVariables,
  APITypes.DeleteUserStateMutation
>;
