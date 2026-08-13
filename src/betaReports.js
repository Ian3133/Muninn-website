import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { downloadData, getUrl, uploadData } from 'aws-amplify/storage';
import { betaIssueAuthMode } from './betaReportAuth';

const LOCAL_REPORT_KEY = 'muninn-beta-reports-v1';

const createBetaIssueMutation = /* GraphQL */ `
  mutation CreateBetaIssue($input: CreateBetaIssueInput!) {
    createBetaIssue(input: $input) {
      id status category description occurredAt pageUrl pagePath pageTitle
      selectedElement appVersion release viewport userAgent evidenceKey screenshotKey
      diagnosticsSummary evidencePreview createdAt updatedAt owner
    }
  }
`;

const listBetaIssuesQuery = /* GraphQL */ `
  query ListBetaIssues($limit: Int, $nextToken: String) {
    listBetaIssues(limit: $limit, nextToken: $nextToken) {
      items {
        id status category description occurredAt pageUrl pagePath pageTitle
        selectedElement appVersion release viewport userAgent evidenceKey screenshotKey
        diagnosticsSummary evidencePreview createdAt updatedAt owner
      }
      nextToken
    }
  }
`;

const updateBetaIssueMutation = /* GraphQL */ `
  mutation UpdateBetaIssue($input: UpdateBetaIssueInput!) {
    updateBetaIssue(input: $input) {
      id status updatedAt
    }
  }
`;

function getClient() {
  return generateClient();
}

async function submissionAuthMode(guestMode) {
  if (!guestMode) return undefined;
  try {
    const session = await fetchAuthSession();
    return betaIssueAuthMode({
      guestMode,
      hasUserPoolTokens: Boolean(session.tokens?.accessToken),
    });
  } catch (_error) {
    return betaIssueAuthMode({ guestMode, hasUserPoolTokens: false });
  }
}

function readLocalReports() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_REPORT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeLocalReport(issue, evidence) {
  const reports = readLocalReports();
  const compactEvidence = {
    ...evidence,
    page: {
      ...evidence.page,
      html: evidence.page?.html?.slice(0, 30000),
      text: evidence.page?.text?.slice(0, 30000),
    },
    contentResponses: evidence.contentResponses?.map((item) => ({
      capturedAt: item.capturedAt,
      url: item.url,
      etag: item.etag,
      lastModified: item.lastModified,
      bytes: item.bytes,
    })),
  };
  reports.unshift({ ...issue, localEvidence: compactEvidence });
  localStorage.setItem(LOCAL_REPORT_KEY, JSON.stringify(reports.slice(0, 20)));
  return issue;
}

function jsonField(value) {
  return JSON.stringify(value ?? null);
}

function issueInput(issueId, report, evidence, uploads, uploadError) {
  const annotation = evidence.annotation || null;
  const preview = {
    origin: report.origin === 'SYNTHETIC' ? 'SYNTHETIC' : 'USER',
    annotation,
    contentUrls: (evidence.contentResponses || []).map((item) => ({
      url: item.url,
      capturedAt: item.capturedAt,
      etag: item.etag,
      lastModified: item.lastModified,
      bytes: item.bytes,
    })),
    diagnostics: report.diagnosticsSummary,
    evidenceUploadError: uploadError || '',
  };
  return {
    id: issueId,
    status: 'OPEN',
    category: report.category,
    description: report.description,
    occurredAt: evidence.capturedAt,
    pageUrl: evidence.page.url,
    pagePath: evidence.page.path,
    pageTitle: evidence.page.title,
    selectedElement: annotation?.label || '',
    appVersion: evidence.application.version,
    release: evidence.application.release,
    viewport: `${evidence.device.viewportWidth}x${evidence.device.viewportHeight} @ ${evidence.device.devicePixelRatio || 1}x`,
    userAgent: evidence.device.userAgent,
    evidenceKey: uploads.evidenceKey || '',
    screenshotKey: uploads.screenshotKey || '',
    diagnosticsSummary: jsonField(report.diagnosticsSummary),
    evidencePreview: jsonField(preview),
  };
}

async function uploadEvidence(issueId, evidence, screenshotBlob) {
  let evidenceKey = '';
  let screenshotKey = '';
  const uploadErrors = [];
  if (screenshotBlob) {
    try {
      const screenshotResult = await uploadData({
        path: ({ identityId }) => `private/${identityId}/beta-reports/${issueId}/screenshot.webp`,
        data: screenshotBlob,
        options: {
          contentType: screenshotBlob.type || 'image/webp',
          preventOverwrite: true,
          metadata: { issueId, kind: 'screenshot' },
        },
      }).result;
      screenshotKey = screenshotResult.path;
    } catch (error) {
      uploadErrors.push(`Screenshot: ${String(error?.message || error).slice(0, 350)}`);
    }
  }

  try {
    const evidenceResult = await uploadData({
      path: ({ identityId }) => `private/${identityId}/beta-reports/${issueId}/evidence.json`,
      data: new Blob([JSON.stringify(evidence)], { type: 'application/json' }),
      options: {
        contentType: 'application/json',
        preventOverwrite: true,
        metadata: { issueId, kind: 'evidence', schemaVersion: String(evidence.schemaVersion || 1) },
      },
    }).result;
    evidenceKey = evidenceResult.path;
  } catch (error) {
    uploadErrors.push(`Evidence: ${String(error?.message || error).slice(0, 350)}`);
  }
  return { evidenceKey, screenshotKey, uploadError: uploadErrors.join(' | ').slice(0, 800) };
}

export async function submitBetaIssue({ issueId, report, evidence, screenshotBlob, cloudEnabled, guestMode = false }) {
  if (!cloudEnabled) {
    const localIssue = {
      ...issueInput(issueId, report, evidence, {}, ''),
      createdAt: evidence.capturedAt,
      updatedAt: evidence.capturedAt,
      owner: 'Local preview',
      local: true,
    };
    return writeLocalReport(localIssue, evidence);
  }

  let uploads = {};
  let uploadError = '';
  try {
    uploads = await uploadEvidence(issueId, evidence, screenshotBlob);
    uploadError = uploads.uploadError || '';
  } catch (error) {
    uploadError = String(error?.message || error).slice(0, 800);
  }

  const authMode = await submissionAuthMode(guestMode);
  const response = await getClient().graphql({
    query: createBetaIssueMutation,
    variables: { input: issueInput(issueId, report, evidence, uploads, uploadError) },
    ...(authMode ? { authMode } : {}),
  });
  const issue = response.data?.createBetaIssue;
  if (!issue) throw new Error('The report service did not return a saved issue.');
  return issue;
}

export async function listBetaIssues({ localPreview = false } = {}) {
  if (localPreview) return readLocalReports();
  const items = [];
  let nextToken = null;
  do {
    const response = await getClient().graphql({
      query: listBetaIssuesQuery,
      variables: { limit: 100, nextToken },
    });
    const page = response.data?.listBetaIssues;
    items.push(...(page?.items || []).filter(Boolean));
    nextToken = page?.nextToken || null;
  } while (nextToken && items.length < 500);
  return items.sort((left, right) => String(right.occurredAt).localeCompare(String(left.occurredAt)));
}

export async function updateBetaIssueStatus(id, status, { localPreview = false } = {}) {
  if (localPreview) {
    const reports = readLocalReports().map((item) => (
      item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item
    ));
    localStorage.setItem(LOCAL_REPORT_KEY, JSON.stringify(reports));
    return reports.find((item) => item.id === id);
  }
  const response = await getClient().graphql({
    query: updateBetaIssueMutation,
    variables: { input: { id, status } },
  });
  return response.data?.updateBetaIssue;
}

export async function loadBetaIssueEvidence(issue) {
  if (issue.localEvidence) return issue.localEvidence;
  if (!issue.evidenceKey) return null;
  const result = await downloadData({ path: issue.evidenceKey }).result;
  return JSON.parse(await result.body.text());
}

export async function betaIssueScreenshotUrl(issue) {
  if (!issue.screenshotKey) return '';
  const result = await getUrl({
    path: issue.screenshotKey,
    options: { expiresIn: 900, validateObjectExistence: true },
  });
  return result.url.toString();
}

export function parseJsonField(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}
