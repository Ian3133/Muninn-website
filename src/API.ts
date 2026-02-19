/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateUserStateInput = {
  id?: string | null,
  noteText?: string | null,
  flag?: boolean | null,
  updatedAt?: string | null,
};

export type ModelUserStateConditionInput = {
  noteText?: ModelStringInput | null,
  flag?: ModelBooleanInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelUserStateConditionInput | null > | null,
  or?: Array< ModelUserStateConditionInput | null > | null,
  not?: ModelUserStateConditionInput | null,
  createdAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
};

export type ModelStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
  _null = "_null",
}


export type ModelSizeInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
};

export type ModelBooleanInput = {
  ne?: boolean | null,
  eq?: boolean | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
};

export type UserState = {
  __typename: "UserState",
  id: string,
  noteText?: string | null,
  flag?: boolean | null,
  updatedAt?: string | null,
  createdAt: string,
  owner?: string | null,
};

export type UpdateUserStateInput = {
  id: string,
  noteText?: string | null,
  flag?: boolean | null,
  updatedAt?: string | null,
};

export type DeleteUserStateInput = {
  id: string,
};

export type ModelUserStateFilterInput = {
  id?: ModelIDInput | null,
  noteText?: ModelStringInput | null,
  flag?: ModelBooleanInput | null,
  updatedAt?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  and?: Array< ModelUserStateFilterInput | null > | null,
  or?: Array< ModelUserStateFilterInput | null > | null,
  not?: ModelUserStateFilterInput | null,
  owner?: ModelStringInput | null,
};

export type ModelIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export type ModelUserStateConnection = {
  __typename: "ModelUserStateConnection",
  items:  Array<UserState | null >,
  nextToken?: string | null,
};

export type ModelSubscriptionUserStateFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  noteText?: ModelSubscriptionStringInput | null,
  flag?: ModelSubscriptionBooleanInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionUserStateFilterInput | null > | null,
  or?: Array< ModelSubscriptionUserStateFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionBooleanInput = {
  ne?: boolean | null,
  eq?: boolean | null,
};

export type CreateUserStateMutationVariables = {
  input: CreateUserStateInput,
  condition?: ModelUserStateConditionInput | null,
};

export type CreateUserStateMutation = {
  createUserState?:  {
    __typename: "UserState",
    id: string,
    noteText?: string | null,
    flag?: boolean | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};

export type UpdateUserStateMutationVariables = {
  input: UpdateUserStateInput,
  condition?: ModelUserStateConditionInput | null,
};

export type UpdateUserStateMutation = {
  updateUserState?:  {
    __typename: "UserState",
    id: string,
    noteText?: string | null,
    flag?: boolean | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};

export type DeleteUserStateMutationVariables = {
  input: DeleteUserStateInput,
  condition?: ModelUserStateConditionInput | null,
};

export type DeleteUserStateMutation = {
  deleteUserState?:  {
    __typename: "UserState",
    id: string,
    noteText?: string | null,
    flag?: boolean | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};

export type GetUserStateQueryVariables = {
  id: string,
};

export type GetUserStateQuery = {
  getUserState?:  {
    __typename: "UserState",
    id: string,
    noteText?: string | null,
    flag?: boolean | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};

export type ListUserStatesQueryVariables = {
  filter?: ModelUserStateFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListUserStatesQuery = {
  listUserStates?:  {
    __typename: "ModelUserStateConnection",
    items:  Array< {
      __typename: "UserState",
      id: string,
      noteText?: string | null,
      flag?: boolean | null,
      updatedAt?: string | null,
      createdAt: string,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type OnCreateUserStateSubscriptionVariables = {
  filter?: ModelSubscriptionUserStateFilterInput | null,
  owner?: string | null,
};

export type OnCreateUserStateSubscription = {
  onCreateUserState?:  {
    __typename: "UserState",
    id: string,
    noteText?: string | null,
    flag?: boolean | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};

export type OnUpdateUserStateSubscriptionVariables = {
  filter?: ModelSubscriptionUserStateFilterInput | null,
  owner?: string | null,
};

export type OnUpdateUserStateSubscription = {
  onUpdateUserState?:  {
    __typename: "UserState",
    id: string,
    noteText?: string | null,
    flag?: boolean | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};

export type OnDeleteUserStateSubscriptionVariables = {
  filter?: ModelSubscriptionUserStateFilterInput | null,
  owner?: string | null,
};

export type OnDeleteUserStateSubscription = {
  onDeleteUserState?:  {
    __typename: "UserState",
    id: string,
    noteText?: string | null,
    flag?: boolean | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};
