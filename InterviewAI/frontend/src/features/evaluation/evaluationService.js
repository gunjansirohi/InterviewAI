import api from '../../services/api';

export async function evaluateInterview(interviewId) {
  const normalizedInterviewId = typeof interviewId === 'string' ? interviewId.trim() : '';
  if (!normalizedInterviewId) {
    throw new Error('A saved interview ID is required to generate feedback.');
  }

  const payload = { interviewId: normalizedInterviewId };
  console.info('[evaluation-submit]', { interviewId: normalizedInterviewId, payloadKeys: Object.keys(payload) });
  try {
    const { data, headers } = await api.post('/evaluation/evaluate', payload);
    console.info('[evaluation-submit-success]', {
      interviewId: normalizedInterviewId,
      reportId: data?.report?._id,
      requestId: headers?.['x-request-id'],
    });
    window.dispatchEvent(new Event('interview-evaluation-complete'));
    return data.report;
  } catch (error) {
    console.error('[evaluation-submit-failed]', {
      interviewId: normalizedInterviewId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      errors: error.response?.data?.errors,
      requestId: error.response?.headers?.['x-request-id'] || error.response?.data?.requestId,
    });
    throw error;
  }
}

export async function getEvaluationReport(id) {
  const { data } = await api.get(`/evaluation/report/${id}`);
  return data.report;
}

export async function downloadEvaluationReport(id) {
  const { data, headers } = await api.get(`/evaluation/${id}/download`, { responseType: 'blob' });
  const filename = parseDownloadFilename(headers['content-disposition']) || 'interview-evaluation-report.pdf';
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseDownloadFilename(value = '') {
  return /filename="?([^";]+)"?/i.exec(value)?.[1];
}

export async function getEvaluationHistory() {
  const { data } = await api.get('/evaluation/history');
  return data.reports;
}
