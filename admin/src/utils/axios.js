import { create } from 'axios'
import { fillValues } from '../helpers/index.js'

const instance = create({
  baseURL: process.env.VUE_APP_API_URI || '/',
  headers: {
    'X-WP-Nonce': window.wpApiSettings && window.wpApiSettings.nonce ? window.wpApiSettings.nonce : '123'
  }
})

const dataset = {
  get: id => instance.get(`/wp-json/vpress/v1/dataset/get/${id}`),
  data: ({ dataset, page, perPage, queryUrl }) => {
    if (!page) page = 1
    if (!perPage) perPage = 10
    if (!queryUrl) queryUrl = ''
    return instance.get(`/wp-json/vpress/v1/dataset/data/${dataset}/?page=${page}&perPage=${perPage}&queryUrl=${queryUrl}`)
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

const externalAPI = {
  create: payload => instance.post(`/wp-json/vpress/v1/external-api/create`, payload),
  get: id => instance.get(`/wp-json/vpress/v1/external-api/get/${id}`),
  list: (payload) => {
    const defaultPayload = { page: 1, itemsPerPage: 20, q: '' }
    const { page, itemsPerPage, q } = fillValues(payload, defaultPayload)
    return instance.get(`/wp-json/vpress/v1/external-api/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`)
  },
  update: payload => instance.put(`/wp-json/vpress/v1/external-api/update`, payload),
  delete: payload => instance.delete(`/wp-json/vpress/v1/external-api/delete`, payload),
}

export default {
  dataset,
  chart,
  externalAPI
}
