import { formatQueryParams } from "./tools";

function parseJsonResponse(response) {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

const request = {
  get(url, data, options) {
    return fetch(`${url}${formatQueryParams(data)}`, {
      method: "get",
      ...options,
    }).then(parseJsonResponse);
  },
  post(url, data, options) {
    return fetch(url, { method: "post", body: data, ...options }).then(
      parseJsonResponse,
    );
  },
};

export default request;
