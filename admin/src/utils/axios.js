import { create } from 'axios'
import { fillValues } from '../helpers/index.js'



const instance = create({
  baseURL: import.meta.env.VITE_API_URI || '/',
  headers: {
    'X-WP-Nonce': window.wpApiSettings && window.wpApiSettings.nonce ? window.wpApiSettings.nonce : '123'
  }
})

// Optional Hue SQL connector. Only wired when VITE_HUE_API_BASE_URL is set at
// build time — a hard-coded localhost:8000 fallback made every production
// dataset list fire a cross-origin request at the visitor's own machine.
const hueBaseURL = import.meta.env.VITE_HUE_API_BASE_URL;
const hueApi = hueBaseURL ? create({ baseURL: hueBaseURL }) : null;

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
  listHue: payload => hueApi
    ? hueApi.get(`/sql/datasets`, payload)
    : Promise.resolve({ data: [] }),
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
