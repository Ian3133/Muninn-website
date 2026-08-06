import { AmplifyUserPoolGroupStackTemplate } from '@aws-amplify/cli-extensibility-helper';

export function override(resources: AmplifyUserPoolGroupStackTemplate) {
  const adminRole = resources.userPoolGroupRole?.Admins;
  if (!adminRole) return;

  adminRole.policies = [{
    policyName: 'MuninnBetaEvidenceRead',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:GetObject'],
          Resource: ['arn:aws:s3:::muninn-beta-evidence-423575705842-dev*/private/*'],
        },
        {
          Effect: 'Allow',
          Action: ['s3:PutObject'],
          Resource: [
            'arn:aws:s3:::muninn-beta-evidence-423575705842-dev*/private/${cognito-identity.amazonaws.com:sub}/*',
          ],
        },
        {
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: ['arn:aws:s3:::muninn-beta-evidence-423575705842-dev*'],
          Condition: { StringLike: { 's3:prefix': ['private/*'] } },
        },
      ],
    },
  }];
}
