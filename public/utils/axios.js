import axios from 'https://cdn.jsdelivr.net/npm/axios@1.4.0/+esm'
import { fillValues } from '../helpers/index.js'

const instance = axios.create({
  baseURL: '/',
  headers: {
    'X-WP-Nonce': window.wpApiSettings && window.wpApiSettings.nonce ? window.wpApiSettings.nonce : '123'
  }
})

const hueApi = axios.create({
  baseURL: 'http://localhost:8000',
});

// ENV
// const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVjYjY0ZWZhZGJmNmM4MDAxN2QzYzYyNCIsInJvbGUiOiJBRE1JTiIsImdvb2dsZSI6IiIsImV4cCI6MTYyNTE3NDE2NSwiaWF0IjoxNjI1MDg3NzY1fQ.TAGrUgZJJm6WZwrDeCdzRuzo3IgqBhlpULfC8Bk7bLA';
// hueApi.defaults.headers.common.Authorization = `Bearer ${token}`;

const dataset = {
  get: id => instance.get(`/wp-json/vpress/v1/dataset/get/${id}`),
  data: ({ dataset, page, perPage, dataSource }) => {
    if (!page) page = 1
    if (!perPage) perPage = 10
    if (!dataSource) dataSource = 'wordpress'
    return instance.get(`/wp-json/vpress/v1/dataset/data/${dataset}/?page=${page}&perPage=${perPage}&dataSource=${dataSource}`)
  },
  upload: payload => instance.post(`/wp-json/vpress/v1/dataset/upload`, payload),
  create: payload => instance.post(`/wp-json/vpress/v1/dataset/create`, payload),
  update: payload => instance.put(`/wp-json/vpress/v1/dataset/update`, payload),
  delete: payload => instance.delete(`/wp-json/vpress/v1/dataset/delete`, payload),
  list: (payload) => {
    const defaultPayload =  { page: 1, itemsPerPage: 2, q: '' }
    const { page, itemsPerPage, q } = fillValues(payload, defaultPayload)
    return instance.get(`/wp-json/vpress/v1/dataset/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`)
  },
  listHue: payload => hueApi.get(`/sql/datasets`, payload),
  charts: id => instance.get(`/wp-json/vpress/v1/dataset/charts/${id}`),
  rename_column: payload => instance.post(`/wp-json/vpress/v1/dataset/column/rename`, payload),
  delete_column: payload => instance.post(`/wp-json/vpress/v1/dataset/column/delete`, payload),
  change_data_type_column: payload => instance.post(`/wp-json/vpress/v1/dataset/column/change_data_type`, payload),
}

const chart = {
  list: (payload) => {
    const defaultPayload =  { page: 1, itemsPerPage: 6, q: '' }
    const { page, itemsPerPage, q } = fillValues(payload, defaultPayload)
    return instance.get(`/wp-json/vpress/v1/chart/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`)
  },
  get: chartId => instance.get(`/wp-json/vpress/v1/chart/get/${chartId}`),
  create: payload => instance.post(`/wp-json/vpress/v1/chart/create`, payload),
  update: payload => instance.put(`/wp-json/vpress/v1/chart/update`, payload),
  query: query => instance.post(`/wp-json/vpress/v1/chart/query`, query),
  delete: payload => instance.delete(`/wp-json/vpress/v1/chart/delete`, payload),
  image: payload => instance.post(`/wp-json/vpress/v1/chart/image`, payload),
  update_image_url: payload => instance.post(`/wp-json/vpress/v1/chart/update_image_url`, payload),
}

export default {
  dataset,
  chart
}
