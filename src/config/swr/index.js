import fetcher from '@/lib/client/fetcher';

const handleOnError = (error) => {
  // 如果 error.response 存在且为 JSON，才抛出；否则只打印错误，避免 HTML 错误页导致崩溃
  if (error && error.response && error.response.headers && error.response.headers.get && error.response.headers.get('content-type') && error.response.headers.get('content-type').includes('application/json')) {
    throw new Error(`Error: ${error}`);
  } else {
    // eslint-disable-next-line no-console
    console.error('SWR fetch error (可能为 HTML 错误页):', error);
  }
};

const swrConfig = () => ({
  fetcher,
  onError: handleOnError,
  refreshInterval: 0, // 禁用全局轮询，避免页面无限刷新
});

export default swrConfig;
