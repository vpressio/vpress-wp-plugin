import axios from 'axios'

const instance = axios.create(
  { baseURL: process.env.VUE_APP_API_URL_DOMAIN }
)

const dataset = {
  get: params => instance.get('', { params }),
  info: ({ id }) => instance.get(
    `/wp-json/vpress/v1/dataset/info/${id}`
  ),
  data: ({ dataset, page, perPage }) => instance.get(
    `/wp-json/vpress/v1/dataset/data/${dataset}/?page=${page}&perPage=${perPage}`
  ),
  upload: (payload, options) => instance.post(
    `/wp-json/vpress/v1/dataset/upload`,
    payload,
    options
  ),
  create: payload => instance.post(`/wp-json/vpress/v1/dataset/create`, payload),
  update: payload => instance.put(`/wp-json/vpress/v1/dataset/update`, payload),
  delete: payload => instance.delete(`/wp-json/vpress/v1/dataset/delete`, payload),
  list: ({ page, itemsPerPage, q }) => instance.get(
    `/wp-json/vpress/v1/dataset/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`
  ),
  storage: (uri, options) => instance.get(uri, options),
}

const chart = {
  list: ({ page, itemsPerPage, q }) => instance.get(
    `/wp-json/vpress/v1/chart/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`
  ),
  get: chartId => instance.get(`/wp-json/vpress/v1/chart/get/${chartId}`),
  create: payload => instance.post(`/wp-json/vpress/v1/chart/create`, payload),
  update: payload => instance.post(`/wp-json/vpress/v1/chart/update`,  payload ),
  query: query => instance.post(`/wp-json/vpress/v1/chart/query`, query),
  delete: payload => instance.delete(`/wp-json/vpress/v1/chart/delete`, payload),
  image: payload => instance.post(`/wp-json/vpress/v1/chart/image`, payload)
}

export default {
  dataset,
  chart
}