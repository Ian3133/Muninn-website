import { AmplifyS3ResourceTemplate } from '@aws-amplify/cli-extensibility-helper';

type Policy = { policyDocument?: { Statement?: Record<string, unknown>[] } } | undefined;

function denyGeneratedObjectPrefix(policy: Policy) {
  const statements = policy?.policyDocument?.Statement;
  if (!statements?.length) return;
  policy!.policyDocument!.Statement = [{
    Effect: 'Deny',
    Action: 's3:*',
    Resource: statements[0].Resource,
  }];
}

export function override(resources: AmplifyS3ResourceTemplate) {
  if (resources.s3Bucket) {
    resources.s3Bucket.lifecycleConfiguration = {
      rules: [{
        id: 'ExpireBetaReportEvidenceAfter90Days',
        status: 'Enabled',
        prefix: 'private/',
        expirationInDays: 90,
      }],
    };
    resources.s3Bucket.bucketEncryption = {
      serverSideEncryptionConfiguration: [{
        serverSideEncryptionByDefault: { sseAlgorithm: 'AES256' },
      }],
    };
    resources.s3Bucket.publicAccessBlockConfiguration = {
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    };
  }

  // Amplify's Gen 1 storage defaults grant writes to public/protected/uploads.
  // This bucket is dedicated to beta reports, so testers may only use their
  // own private/{identityId}/ prefix.
  denyGeneratedObjectPrefix(resources.s3AuthPublicPolicy);
  denyGeneratedObjectPrefix(resources.s3AuthProtectedPolicy);
  denyGeneratedObjectPrefix(resources.s3AuthUploadPolicy);
  denyGeneratedObjectPrefix(resources.s3GuestPublicPolicy);
  denyGeneratedObjectPrefix(resources.s3GuestUploadPolicy);
  denyGeneratedObjectPrefix(resources.s3GuestReadPolicy);

  resources.addCfnResource(
    {
      type: 'AWS::IAM::Policy',
      properties: {
        PolicyName: 'MuninnBetaGuestPrivateEvidence',
        Roles: [{ Ref: 'unauthRoleName' }],
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Action: ['s3:PutObject', 's3:GetObject'],
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  { Ref: 'AWS::Partition' },
                  ':s3:::',
                  { Ref: 'S3Bucket' },
                  '/private/${cognito-identity.amazonaws.com:sub}/*',
                ],
              ],
            },
          }],
        },
      },
    },
    'BetaEvidenceGuestPrivatePolicy',
  );

  // The generated read policy is not exposed consistently by older Gen 1
  // CLIs, so enforce the boundary again at the bucket itself.
  resources.addCfnResource(
    {
      type: 'AWS::S3::BucketPolicy',
      properties: {
        Bucket: { Ref: 'S3Bucket' },
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'KeepAuthenticatedTestersOutOfSharedPrefixes',
              Effect: 'Deny',
              Principal: {
                AWS: [
                  { 'Fn::Sub': 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${authRoleName}' },
                  { 'Fn::Sub': 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${unauthRoleName}' },
                ],
              },
              Action: 's3:*',
              Resource: [
                { 'Fn::Sub': 'arn:${AWS::Partition}:s3:::${S3Bucket}/public/*' },
                { 'Fn::Sub': 'arn:${AWS::Partition}:s3:::${S3Bucket}/protected/*' },
                { 'Fn::Sub': 'arn:${AWS::Partition}:s3:::${S3Bucket}/uploads/*' },
              ],
            },
            {
              Sid: 'PreventAuthenticatedTesterListing',
              Effect: 'Deny',
              Principal: {
                AWS: [
                  { 'Fn::Sub': 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${authRoleName}' },
                  { 'Fn::Sub': 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${unauthRoleName}' },
                ],
              },
              Action: 's3:ListBucket',
              Resource: { 'Fn::Sub': 'arn:${AWS::Partition}:s3:::${S3Bucket}' },
            },
          ],
        },
      },
    },
    'BetaEvidencePrivateOnlyBucketPolicy',
  );
}
