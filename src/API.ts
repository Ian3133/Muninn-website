/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type UpdateBetaIssueInput = {
  id: string,
  status?: BetaIssueStatus | null,
  category?: BetaIssueCategory | null,
  description?: string | null,
  occurredAt?: string | null,
  pageUrl?: string | null,
  pagePath?: string | null,
  pageTitle?: string | null,
  selectedElement?: string | null,
  appVersion?: string | null,
  release?: string | null,
  viewport?: string | null,
  userAgent?: string | null,
  evidenceKey?: string | null,
  screenshotKey?: string | null,
  diagnosticsSummary?: string | null,
  evidencePreview?: string | null,
};

export enum BetaIssueStatus {
  OPEN = "OPEN",
  REVIEWING = "REVIEWING",
  RESOLVED = "RESOLVED",
}


export enum BetaIssueCategory {
  DISPLAY = "DISPLAY",
  CONTENT = "CONTENT",
  FUNCTION = "FUNCTION",
  OTHER = "OTHER",
}


export type ModelBetaIssueConditionInput = {
  status?: ModelBetaIssueStatusInput | null,
  category?: ModelBetaIssueCategoryInput | null,
  description?: ModelStringInput | null,
  occurredAt?: ModelStringInput | null,
  pageUrl?: ModelStringInput | null,
  pagePath?: ModelStringInput | null,
  pageTitle?: ModelStringInput | null,
  selectedElement?: ModelStringInput | null,
  appVersion?: ModelStringInput | null,
  release?: ModelStringInput | null,
  viewport?: ModelStringInput | null,
  userAgent?: ModelStringInput | null,
  evidenceKey?: ModelStringInput | null,
  screenshotKey?: ModelStringInput | null,
  diagnosticsSummary?: ModelStringInput | null,
  evidencePreview?: ModelStringInput | null,
  and?: Array< ModelBetaIssueConditionInput | null > | null,
  or?: Array< ModelBetaIssueConditionInput | null > | null,
  not?: ModelBetaIssueConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
};

export type ModelBetaIssueStatusInput = {
  eq?: BetaIssueStatus | null,
  ne?: BetaIssueStatus | null,
};

export type ModelBetaIssueCategoryInput = {
  eq?: BetaIssueCategory | null,
  ne?: BetaIssueCategory | null,
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

export type BetaIssue = {
  __typename: "BetaIssue",
  id: string,
  status: BetaIssueStatus,
  category: BetaIssueCategory,
  description: string,
  occurredAt: string,
  pageUrl?: string | null,
  pagePath?: string | null,
  pageTitle?: string | null,
  selectedElement?: string | null,
  appVersion?: string | null,
  release?: string | null,
  viewport?: string | null,
  userAgent?: string | null,
  evidenceKey?: string | null,
  screenshotKey?: string | null,
  diagnosticsSummary?: string | null,
  evidencePreview?: string | null,
  createdAt: string,
  updatedAt: string,
  owner?: string | null,
};

export type DeleteBetaIssueInput = {
  id: string,
};

export type CreateUserStateInput = {
  id?: string | null,
  noteText?: string | null,
  flag?: boolean | null,
  newsletterComment?: string | null,
  checkbox1?: boolean | null,
  checkbox2?: boolean | null,
  checkbox3?: boolean | null,
  selectedState?: string | null,
  updatedAt?: string | null,
};

export type ModelUserStateConditionInput = {
  noteText?: ModelStringInput | null,
  flag?: ModelBooleanInput | null,
  newsletterComment?: ModelStringInput | null,
  checkbox1?: ModelBooleanInput | null,
  checkbox2?: ModelBooleanInput | null,
  checkbox3?: ModelBooleanInput | null,
  selectedState?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelUserStateConditionInput | null > | null,
  or?: Array< ModelUserStateConditionInput | null > | null,
  not?: ModelUserStateConditionInput | null,
  createdAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
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
  newsletterComment?: string | null,
  checkbox1?: boolean | null,
  checkbox2?: boolean | null,
  checkbox3?: boolean | null,
  selectedState?: string | null,
  updatedAt?: string | null,
  createdAt: string,
  owner?: string | null,
};

export type UpdateUserStateInput = {
  id: string,
  noteText?: string | null,
  flag?: boolean | null,
  newsletterComment?: string | null,
  checkbox1?: boolean | null,
  checkbox2?: boolean | null,
  checkbox3?: boolean | null,
  selectedState?: string | null,
  updatedAt?: string | null,
};

export type DeleteUserStateInput = {
  id: string,
};

export type CreateBetaIssueInput = {
  id?: string | null,
  status: BetaIssueStatus,
  category: BetaIssueCategory,
  description: string,
  occurredAt: string,
  pageUrl?: string | null,
  pagePath?: string | null,
  pageTitle?: string | null,
  selectedElement?: string | null,
  appVersion?: string | null,
  release?: string | null,
  viewport?: string | null,
  userAgent?: string | null,
  evidenceKey?: string | null,
  screenshotKey?: string | null,
  diagnosticsSummary?: string | null,
  evidencePreview?: string | null,
};

export type ModelBetaIssueFilterInput = {
  id?: ModelIDInput | null,
  status?: ModelBetaIssueStatusInput | null,
  category?: ModelBetaIssueCategoryInput | null,
  description?: ModelStringInput | null,
  occurredAt?: ModelStringInput | null,
  pageUrl?: ModelStringInput | null,
  pagePath?: ModelStringInput | null,
  pageTitle?: ModelStringInput | null,
  selectedElement?: ModelStringInput | null,
  appVersion?: ModelStringInput | null,
  release?: ModelStringInput | null,
  viewport?: ModelStringInput | null,
  userAgent?: ModelStringInput | null,
  evidenceKey?: ModelStringInput | null,
  screenshotKey?: ModelStringInput | null,
  diagnosticsSummary?: ModelStringInput | null,
  evidencePreview?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelBetaIssueFilterInput | null > | null,
  or?: Array< ModelBetaIssueFilterInput | null > | null,
  not?: ModelBetaIssueFilterInput | null,
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

export type ModelBetaIssueConnection = {
  __typename: "ModelBetaIssueConnection",
  items:  Array<BetaIssue | null >,
  nextToken?: string | null,
};

export type ModelUserStateFilterInput = {
  id?: ModelIDInput | null,
  noteText?: ModelStringInput | null,
  flag?: ModelBooleanInput | null,
  newsletterComment?: ModelStringInput | null,
  checkbox1?: ModelBooleanInput | null,
  checkbox2?: ModelBooleanInput | null,
  checkbox3?: ModelBooleanInput | null,
  selectedState?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  and?: Array< ModelUserStateFilterInput | null > | null,
  or?: Array< ModelUserStateFilterInput | null > | null,
  not?: ModelUserStateFilterInput | null,
  owner?: ModelStringInput | null,
};

export type ModelUserStateConnection = {
  __typename: "ModelUserStateConnection",
  items:  Array<UserState | null >,
  nextToken?: string | null,
};

export type ModelSubscriptionBetaIssueFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  status?: ModelSubscriptionStringInput | null,
  category?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  occurredAt?: ModelSubscriptionStringInput | null,
  pageUrl?: ModelSubscriptionStringInput | null,
  pagePath?: ModelSubscriptionStringInput | null,
  pageTitle?: ModelSubscriptionStringInput | null,
  selectedElement?: ModelSubscriptionStringInput | null,
  appVersion?: ModelSubscriptionStringInput | null,
  release?: ModelSubscriptionStringInput | null,
  viewport?: ModelSubscriptionStringInput | null,
  userAgent?: ModelSubscriptionStringInput | null,
  evidenceKey?: ModelSubscriptionStringInput | null,
  screenshotKey?: ModelSubscriptionStringInput | null,
  diagnosticsSummary?: ModelSubscriptionStringInput | null,
  evidencePreview?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionBetaIssueFilterInput | null > | null,
  or?: Array< ModelSubscriptionBetaIssueFilterInput | null > | null,
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

export type ModelSubscriptionUserStateFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  noteText?: ModelSubscriptionStringInput | null,
  flag?: ModelSubscriptionBooleanInput | null,
  newsletterComment?: ModelSubscriptionStringInput | null,
  checkbox1?: ModelSubscriptionBooleanInput | null,
  checkbox2?: ModelSubscriptionBooleanInput | null,
  checkbox3?: ModelSubscriptionBooleanInput | null,
  selectedState?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionUserStateFilterInput | null > | null,
  or?: Array< ModelSubscriptionUserStateFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionBooleanInput = {
  ne?: boolean | null,
  eq?: boolean | null,
};

export type UpdateBetaIssueMutationVariables = {
  input: UpdateBetaIssueInput,
  condition?: ModelBetaIssueConditionInput | null,
};

export type UpdateBetaIssueMutation = {
  updateBetaIssue?:  {
    __typename: "BetaIssue",
    id: string,
    status: BetaIssueStatus,
    category: BetaIssueCategory,
    description: string,
    occurredAt: string,
    pageUrl?: string | null,
    pagePath?: string | null,
    pageTitle?: string | null,
    selectedElement?: string | null,
    appVersion?: string | null,
    release?: string | null,
    viewport?: string | null,
    userAgent?: string | null,
    evidenceKey?: string | null,
    screenshotKey?: string | null,
    diagnosticsSummary?: string | null,
    evidencePreview?: string | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type DeleteBetaIssueMutationVariables = {
  input: DeleteBetaIssueInput,
  condition?: ModelBetaIssueConditionInput | null,
};

export type DeleteBetaIssueMutation = {
  deleteBetaIssue?:  {
    __typename: "BetaIssue",
    id: string,
    status: BetaIssueStatus,
    category: BetaIssueCategory,
    description: string,
    occurredAt: string,
    pageUrl?: string | null,
    pagePath?: string | null,
    pageTitle?: string | null,
    selectedElement?: string | null,
    appVersion?: string | null,
    release?: string | null,
    viewport?: string | null,
    userAgent?: string | null,
    evidenceKey?: string | null,
    screenshotKey?: string | null,
    diagnosticsSummary?: string | null,
    evidencePreview?: string | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
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
    newsletterComment?: string | null,
    checkbox1?: boolean | null,
    checkbox2?: boolean | null,
    checkbox3?: boolean | null,
    selectedState?: string | null,
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
    newsletterComment?: string | null,
    checkbox1?: boolean | null,
    checkbox2?: boolean | null,
    checkbox3?: boolean | null,
    selectedState?: string | null,
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
    newsletterComment?: string | null,
    checkbox1?: boolean | null,
    checkbox2?: boolean | null,
    checkbox3?: boolean | null,
    selectedState?: string | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};

export type CreateBetaIssueMutationVariables = {
  input: CreateBetaIssueInput,
  condition?: ModelBetaIssueConditionInput | null,
};

export type CreateBetaIssueMutation = {
  createBetaIssue?:  {
    __typename: "BetaIssue",
    id: string,
    status: BetaIssueStatus,
    category: BetaIssueCategory,
    description: string,
    occurredAt: string,
    pageUrl?: string | null,
    pagePath?: string | null,
    pageTitle?: string | null,
    selectedElement?: string | null,
    appVersion?: string | null,
    release?: string | null,
    viewport?: string | null,
    userAgent?: string | null,
    evidenceKey?: string | null,
    screenshotKey?: string | null,
    diagnosticsSummary?: string | null,
    evidencePreview?: string | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type GetBetaIssueQueryVariables = {
  id: string,
};

export type GetBetaIssueQuery = {
  getBetaIssue?:  {
    __typename: "BetaIssue",
    id: string,
    status: BetaIssueStatus,
    category: BetaIssueCategory,
    description: string,
    occurredAt: string,
    pageUrl?: string | null,
    pagePath?: string | null,
    pageTitle?: string | null,
    selectedElement?: string | null,
    appVersion?: string | null,
    release?: string | null,
    viewport?: string | null,
    userAgent?: string | null,
    evidenceKey?: string | null,
    screenshotKey?: string | null,
    diagnosticsSummary?: string | null,
    evidencePreview?: string | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type ListBetaIssuesQueryVariables = {
  filter?: ModelBetaIssueFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListBetaIssuesQuery = {
  listBetaIssues?:  {
    __typename: "ModelBetaIssueConnection",
    items:  Array< {
      __typename: "BetaIssue",
      id: string,
      status: BetaIssueStatus,
      category: BetaIssueCategory,
      description: string,
      occurredAt: string,
      pageUrl?: string | null,
      pagePath?: string | null,
      pageTitle?: string | null,
      selectedElement?: string | null,
      appVersion?: string | null,
      release?: string | null,
      viewport?: string | null,
      userAgent?: string | null,
      evidenceKey?: string | null,
      screenshotKey?: string | null,
      diagnosticsSummary?: string | null,
      evidencePreview?: string | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
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
    newsletterComment?: string | null,
    checkbox1?: boolean | null,
    checkbox2?: boolean | null,
    checkbox3?: boolean | null,
    selectedState?: string | null,
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
      newsletterComment?: string | null,
      checkbox1?: boolean | null,
      checkbox2?: boolean | null,
      checkbox3?: boolean | null,
      selectedState?: string | null,
      updatedAt?: string | null,
      createdAt: string,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type OnCreateBetaIssueSubscriptionVariables = {
  filter?: ModelSubscriptionBetaIssueFilterInput | null,
  owner?: string | null,
};

export type OnCreateBetaIssueSubscription = {
  onCreateBetaIssue?:  {
    __typename: "BetaIssue",
    id: string,
    status: BetaIssueStatus,
    category: BetaIssueCategory,
    description: string,
    occurredAt: string,
    pageUrl?: string | null,
    pagePath?: string | null,
    pageTitle?: string | null,
    selectedElement?: string | null,
    appVersion?: string | null,
    release?: string | null,
    viewport?: string | null,
    userAgent?: string | null,
    evidenceKey?: string | null,
    screenshotKey?: string | null,
    diagnosticsSummary?: string | null,
    evidencePreview?: string | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnUpdateBetaIssueSubscriptionVariables = {
  filter?: ModelSubscriptionBetaIssueFilterInput | null,
  owner?: string | null,
};

export type OnUpdateBetaIssueSubscription = {
  onUpdateBetaIssue?:  {
    __typename: "BetaIssue",
    id: string,
    status: BetaIssueStatus,
    category: BetaIssueCategory,
    description: string,
    occurredAt: string,
    pageUrl?: string | null,
    pagePath?: string | null,
    pageTitle?: string | null,
    selectedElement?: string | null,
    appVersion?: string | null,
    release?: string | null,
    viewport?: string | null,
    userAgent?: string | null,
    evidenceKey?: string | null,
    screenshotKey?: string | null,
    diagnosticsSummary?: string | null,
    evidencePreview?: string | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnDeleteBetaIssueSubscriptionVariables = {
  filter?: ModelSubscriptionBetaIssueFilterInput | null,
  owner?: string | null,
};

export type OnDeleteBetaIssueSubscription = {
  onDeleteBetaIssue?:  {
    __typename: "BetaIssue",
    id: string,
    status: BetaIssueStatus,
    category: BetaIssueCategory,
    description: string,
    occurredAt: string,
    pageUrl?: string | null,
    pagePath?: string | null,
    pageTitle?: string | null,
    selectedElement?: string | null,
    appVersion?: string | null,
    release?: string | null,
    viewport?: string | null,
    userAgent?: string | null,
    evidenceKey?: string | null,
    screenshotKey?: string | null,
    diagnosticsSummary?: string | null,
    evidencePreview?: string | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
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
    newsletterComment?: string | null,
    checkbox1?: boolean | null,
    checkbox2?: boolean | null,
    checkbox3?: boolean | null,
    selectedState?: string | null,
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
    newsletterComment?: string | null,
    checkbox1?: boolean | null,
    checkbox2?: boolean | null,
    checkbox3?: boolean | null,
    selectedState?: string | null,
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
    newsletterComment?: string | null,
    checkbox1?: boolean | null,
    checkbox2?: boolean | null,
    checkbox3?: boolean | null,
    selectedState?: string | null,
    updatedAt?: string | null,
    createdAt: string,
    owner?: string | null,
  } | null,
};
