import axios from 'axios'

const instance = axios.create(
  { baseURL: process.env.VUE_APP_API_URI || '/'}
)
const dataset = {
  get: id => instance.get(`/wp-json/vpress/v1/dataset/get/${id}`),
  data: ({ dataset, page, perPage }) => {
    if (!page) page = 1
    if (!perPage) perPage = 10
    return instance.get(
      `/wp-json/vpress/v1/dataset/data/${dataset}/?page=${page}&perPage=${perPage}`
    )
  },
  upload: payload => instance.post(
    `/wp-json/vpress/v1/dataset/upload`,
    payload,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  ),
  create: payload => instance.post(`/wp-json/vpress/v1/dataset/create`, payload),
  update: payload => instance.put(`/wp-json/vpress/v1/dataset/update`, payload),
  delete: payload => instance.delete(`/wp-json/vpress/v1/dataset/delete`, payload),
  list: ({ page, itemsPerPage, q }) => {
    if (!page) page = 1
    if (!itemsPerPage) itemsPerPage = 10
    if (!q) q = ''
    return instance.get(
      `/wp-json/vpress/v1/dataset/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`
    )
  }
}

const chart = {
  list: ({ page, itemsPerPage, q }) => {
    if (!page) page = 1
    if (!itemsPerPage) itemsPerPage = 10
    if (!q) q = ''
    return instance.get(
      `/wp-json/vpress/v1/chart/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`
    )
  },
  get: chartId => instance.get(`/wp-json/vpress/v1/chart/get/${chartId}`),
  create: payload => instance.post(`/wp-json/vpress/v1/chart/create`, payload),
  update: payload => instance.put(`/wp-json/vpress/v1/chart/update`,  payload ),
  query: query => instance.post(`/wp-json/vpress/v1/chart/query`, query),
  delete: payload => instance.delete(`/wp-json/vpress/v1/chart/delete`, payload),
  image: payload => instance.post(`/wp-json/vpress/v1/chart/image`, payload)
}

export default {
  dataset,
  chart
}
