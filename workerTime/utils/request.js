const request = {
  get(url, data, options) {
    return fetch(`${url}${formatQueryParams(data)}`, {
      method: "get",
      ...options,
    }).then((res) => {
      return res.json();
    });
  },
  post(url, data, options) {
    return fetch(url, { method: "post", body: data, ...options }).then(
      (res) => {
        return res.json();
      }
    );
  },
};

export default request;
