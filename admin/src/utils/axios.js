import { create } from 'axios'
import { fillValues } from '../helpers/index.js'

const instance = create(
  { baseURL: process.env.VUE_APP_API_URI || '/'}
)

const dataset = {
  get: id => instance.get(`/wp-json/vpress/v1/dataset/get/${id}`),
  data: ({ dataset, page, perPage }) => {
    if (!page) page = 1
    if (!perPage) perPage = 10
    return instance.get(
      `/wp-json/vpress/v1/dataset/data/${dataset}/?page=${page}&perPage=${perPage}`,
      {
        headers: {
          'X-WP-Nonce': window.wpApiSettings.nonce
        }
      }
    )
  },
  upload: payload => instance.post(
    `/wp-json/vpress/v1/dataset/upload`,
    payload,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-WP-Nonce': window.wpApiSettings.nonce
      }
    }
  ),
  create: payload => instance.post(`/wp-json/vpress/v1/dataset/create`, payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  update: payload => instance.put(`/wp-json/vpress/v1/dataset/update`, payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  delete: payload => instance.delete(`/wp-json/vpress/v1/dataset/delete`, payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  list: (payload) => {
    const defaultPayload =  { page: 1, itemsPerPage: 2, q: '' }
    const { page, itemsPerPage, q } = fillValues(payload, defaultPayload)
    return instance.get(
      `/wp-json/vpress/v1/dataset/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`,
      {
        headers: {
          'X-WP-Nonce': window.wpApiSettings.nonce
        }
      }
    )
  },
  charts: id => instance.get(`/wp-json/vpress/v1/dataset/charts/${id}`, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  rename_column: payload => instance.post(`/wp-json/vpress/v1/dataset/column/rename`, payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  delete_column: payload => instance.post(`/wp-json/vpress/v1/dataset/column/delete`, payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  change_data_type_column: payload => instance.post(`/wp-json/vpress/v1/dataset/column/change_data_type`, payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
}

const chart = {
  list: (payload) => {
    const defaultPayload =  { page: 1, itemsPerPage: 6, q: '' }
    const { page, itemsPerPage, q } = fillValues(payload, defaultPayload)
    return instance.get(
      `/wp-json/vpress/v1/chart/list/?page=${page}&perPage=${itemsPerPage}&q=${q}`,
      {
        headers: {
          'X-WP-Nonce': window.wpApiSettings.nonce
        }
      }
    )
  },
  get: chartId => instance.get(`/wp-json/vpress/v1/chart/get/${chartId}`),
  create: payload => instance.post(`/wp-json/vpress/v1/chart/create`, payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  update: payload => instance.put(`/wp-json/vpress/v1/chart/update`,  payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  query: query => instance.post(`/wp-json/vpress/v1/chart/query`, query),
  delete: payload => instance.delete(`/wp-json/vpress/v1/chart/delete`, payload, {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  image: payload => instance.post(`/wp-json/vpress/v1/chart/image`, payload,
  {
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
  update_image_url: payload => instance.post(`/wp-json/vpress/v1/chart/update_image_url`, payload,{
    headers: {
      'X-WP-Nonce': window.wpApiSettings.nonce
    }
  }),
}

export default {
  dataset,
  chart
}
